import express, { type Express } from 'express';
import bodyParser from 'body-parser';

/**
 * Stripe Node types for this package version omit V2 Connect and thin events.
 * The runtime client still exposes those methods; tests inject a matching mock.
 */
export interface ConnectStripeClient {
  v2: {
    core: {
      accounts: {
        create: (params: Record<string, unknown>) => Promise<{ id: string; display_name?: string | null }>;
        retrieve: (
          id: string,
          params?: Record<string, unknown>
        ) => Promise<{
          id: string;
          configuration?: {
            merchant?: { capabilities?: { card_payments?: { status?: string } } };
          };
          requirements?: {
            summary?: {
              minimum_deadline?: { status?: string };
              currently_due?: string[];
              past_due?: string[];
            };
          };
        }>;
      };
      accountLinks: {
        create: (params: Record<string, unknown>) => Promise<{ url?: string }>;
      };
      events: {
        retrieve: (id: string) => Promise<{ type: string; data: { object: unknown } }>;
      };
    };
  };
  products: {
    create: (
      params: Record<string, unknown>,
      options?: Record<string, unknown>
    ) => Promise<{
      id: string;
      name: string;
      description?: string | null;
      default_price?: unknown;
    }>;
    list: (
      params: Record<string, unknown>,
      options?: Record<string, unknown>
    ) => Promise<{
      data: Array<{
        id: string;
        name: string;
        description?: string | null;
        default_price?: unknown;
      }>;
    }>;
  };
  checkout: {
    sessions: {
      create: (
        params: Record<string, unknown>,
        options?: Record<string, unknown>
      ) => Promise<{ id: string }>;
    };
  };
  billingPortal: {
    sessions: {
      create: (
        params: Record<string, unknown>,
        options?: Record<string, unknown>
      ) => Promise<{ url?: string }>;
    };
  };
  webhooks: {
    constructEvent: (
      body: unknown,
      sig: string,
      secret: string
    ) => { type: string; data: { object: unknown; previous_attributes?: unknown } };
  };
  parseThinEvent: (body: unknown, sig: string, secret: string) => { id: string };
}

export interface ConnectAppOptions {
  stripeClient: ConnectStripeClient;
  webhookSecret?: string;
}

/**
 * Build the Connect sample Express app with an injected Stripe client
 * so routes can be tested without a live secret key or process listener.
 */
export function createConnectApp(options: ConnectAppOptions): Express {
  const stripeClient = options.stripeClient;
  const webhookSecret = options.webhookSecret ?? process.env.WEBHOOK_SECRET;
  const app = express();

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(express.static('public'));

  app.post('/api/accounts', async (req, res) => {
    try {
      const { displayName, contactEmail } = req.body;

      if (!displayName || !contactEmail) {
        return res.status(400).json({
          error: 'displayName and contactEmail are required',
        });
      }

      const account = await stripeClient.v2.core.accounts.create({
        display_name: displayName,
        contact_email: contactEmail,
        identity: {
          country: 'us',
        },
        dashboard: 'full',
        defaults: {
          responsibilities: {
            fees_collector: 'stripe',
            losses_collector: 'stripe',
          },
        },
        configuration: {
          customer: {},
          merchant: {
            capabilities: {
              card_payments: {
                requested: true,
              },
            },
          },
        },
      });

      res.json({
        success: true,
        accountId: account.id,
        displayName: account.display_name,
      });
    } catch (error) {
      console.error('Error creating account:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to create account',
      });
    }
  });

  app.post('/api/onboarding/link', async (req, res) => {
    try {
      const { accountId } = req.body;

      if (!accountId) {
        return res.status(400).json({ error: 'accountId is required' });
      }

      const accountLink = await stripeClient.v2.core.accountLinks.create({
        account: accountId,
        use_case: {
          type: 'account_onboarding',
          account_onboarding: {
            configurations: ['merchant', 'customer'],
            refresh_url: `${process.env.DOMAIN || 'http://localhost:3000'}/onboarding?accountId=${accountId}`,
            return_url: `${process.env.DOMAIN || 'http://localhost:3000'}/dashboard?accountId=${accountId}`,
          },
        },
      });

      res.json({
        success: true,
        url: accountLink.url,
      });
    } catch (error) {
      console.error('Error creating account link:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to create account link',
      });
    }
  });

  app.get('/api/accounts/:accountId/status', async (req, res) => {
    try {
      const { accountId } = req.params;

      const account = await stripeClient.v2.core.accounts.retrieve(accountId, {
        include: [
          'configuration.merchant',
          'configuration.customer',
          'requirements',
        ],
      });

      const readyToProcessPayments =
        account.configuration?.merchant?.capabilities?.card_payments?.status ===
        'active';

      const requirementsStatus =
        account.requirements?.summary?.minimum_deadline?.status;

      const onboardingComplete =
        requirementsStatus !== 'currently_due' &&
        requirementsStatus !== 'past_due';

      res.json({
        success: true,
        accountId: account.id,
        onboardingComplete,
        readyToProcessPayments,
        requirementsStatus,
        currentlyDueRequirements:
          account.requirements?.summary?.currently_due || [],
        pastDueRequirements: account.requirements?.summary?.past_due || [],
      });
    } catch (error) {
      console.error('Error fetching account status:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch account status',
      });
    }
  });

  app.post('/api/products', async (req, res) => {
    try {
      const { accountId, name, description, priceInCents, currency } = req.body;

      if (!accountId || !name || !priceInCents) {
        return res.status(400).json({
          error: 'accountId, name, and priceInCents are required',
        });
      }

      const product = await stripeClient.products.create(
        {
          name: name,
          description: description || '',
          default_price_data: {
            unit_amount: parseInt(priceInCents),
            currency: currency || 'usd',
          },
        },
        {
          stripeAccount: accountId,
        }
      );

      res.json({
        success: true,
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          default_price: product.default_price,
        },
      });
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to create product',
      });
    }
  });

  app.get('/api/products/:accountId', async (req, res) => {
    try {
      const { accountId } = req.params;

      const products = await stripeClient.products.list(
        {
          limit: 20,
          active: true,
          expand: ['data.default_price'],
        },
        {
          stripeAccount: accountId,
        }
      );

      res.json({
        success: true,
        products: products.data.map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          // Storefront checkout sends product.default_price, but this payload
          // only exposes unit_amount as `price` — no priceId/default_price.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          price: (product.default_price as any)?.unit_amount || 0,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          currency: (product.default_price as any)?.currency || 'usd',
        })),
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch products',
      });
    }
  });

  app.post('/api/checkout', async (req, res) => {
    try {
      const { accountId, priceId, quantity } = req.body;

      if (!accountId || !priceId) {
        return res.status(400).json({
          error: 'accountId and priceId are required',
        });
      }

      const baseUrl = process.env.DOMAIN || 'http://localhost:3000';

      const session = await stripeClient.checkout.sessions.create(
        {
          line_items: [
            {
              price: priceId,
              quantity: quantity || 1,
            },
          ],
          mode: 'payment',
          payment_intent_data: {
            application_fee_amount: Math.round(
              (quantity || 1) *
                0.1
            ),
          },
          success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&accountId=${accountId}`,
          cancel_url: `${baseUrl}/storefront?accountId=${accountId}`,
        },
        {
          stripeAccount: accountId,
        }
      );

      res.json({
        success: true,
        sessionId: session.id,
      });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
      });
    }
  });

  app.post('/api/subscriptions', async (req, res) => {
    try {
      const { accountId, priceId } = req.body;

      if (!accountId || !priceId) {
        return res.status(400).json({
          error: 'accountId and priceId are required',
        });
      }

      const baseUrl = process.env.DOMAIN || 'http://localhost:3000';

      const session = await stripeClient.checkout.sessions.create(
        {
          customer_account: accountId,
          mode: 'subscription',
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          success_url: `${baseUrl}/subscription-success?session_id={CHECKOUT_SESSION_ID}&accountId=${accountId}`,
          cancel_url: `${baseUrl}/dashboard?accountId=${accountId}`,
        },
        {
          stripeAccount: accountId,
        }
      );

      res.json({
        success: true,
        sessionId: session.id,
      });
    } catch (error) {
      console.error('Error creating subscription:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to create subscription',
      });
    }
  });

  app.post('/api/billing-portal', async (req, res) => {
    try {
      const { accountId } = req.body;

      if (!accountId) {
        return res.status(400).json({ error: 'accountId is required' });
      }

      const session = await stripeClient.billingPortal.sessions.create(
        {
          customer_account: accountId,
          return_url: `${process.env.DOMAIN || 'http://localhost:3000'}/dashboard?accountId=${accountId}`,
        },
        {
          stripeAccount: accountId,
        }
      );

      res.json({
        success: true,
        url: session.url,
      });
    } catch (error) {
      console.error('Error creating billing portal session:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to create billing portal session',
      });
    }
  });

  app.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const sig = req.headers['stripe-signature'] as string;

      let event;
      try {
        event = stripeClient.webhooks.constructEvent(
          req.body,
          sig,
          webhookSecret || ''
        );
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
      }

      switch (event.type) {
        case 'customer.subscription.updated': {
          const subscription = event.data.object as {
            id: string;
            items: { data: Array<{ price: { id: string } }> };
            cancel_at_period_end: boolean;
          };
          console.log('Subscription updated:', subscription.id);

          const previous = event.data.previous_attributes as {
            items?: { data: Array<{ price?: string }> };
            cancel_at_period_end?: boolean;
          } | undefined;

          if (previous?.items?.data) {
            const oldPrice = previous.items.data[0]?.price;
            const newPrice = subscription.items.data[0]?.price.id;

            if (oldPrice !== newPrice) {
              console.log(
                `Subscription modified from price ${oldPrice} to ${newPrice}`
              );
            }
          }

          if (previous?.cancel_at_period_end === false &&
              subscription.cancel_at_period_end === true) {
            console.log('Subscription scheduled for cancellation');
          }

          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as { id: string };
          console.log('Subscription deleted:', subscription.id);
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as { id: string };
          console.log('Invoice paid:', invoice.id);
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    }
  );

  app.post(
    '/webhook/thin',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const sig = req.headers['stripe-signature'] as string;

      let thinEvent;
      try {
        thinEvent = stripeClient.parseThinEvent(
          req.body,
          sig,
          webhookSecret || ''
        );
      } catch (err) {
        console.error('Thin event verification failed:', err);
        return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
      }

      const event = await stripeClient.v2.core.events.retrieve(thinEvent.id);

      switch (event.type) {
        case 'v2.core.account[requirements].updated': {
          const account = event.data.object as { id: string };
          console.log('Account requirements updated:', account.id);
          break;
        }

        case 'v2.core.account[configuration.merchant].capability_status_updated': {
          const account = event.data.object as {
            configuration?: { merchant?: { capabilities?: { card_payments?: { status?: string } } } };
          };
          const cardPaymentsStatus =
            account.configuration?.merchant?.capabilities?.card_payments?.status;

          console.log('Card payments status:', cardPaymentsStatus);
          break;
        }

        default:
          console.log(`Unhandled V2 event type: ${event.type}`);
      }

      res.json({ received: true });
    }
  );

  app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
  });

  return app;
}
