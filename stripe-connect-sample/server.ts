import express from 'express';
import Stripe from 'stripe';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import {
  computeApplicationFeeCents,
  isWebhookPath,
  mapConnectedProduct,
} from './connect-helpers.js';

// Load environment variables from .env file
dotenv.config();

const app = express();

// ============================================================================
// STRIPE CLIENT INITIALIZATION
// ============================================================================
// Initialize the Stripe client with the secret API key.
// The secret key is used for server-side operations and should never be
// exposed to the client. Store this in your environment variables.
// TODO: Add your Stripe secret API key to the .env file
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  throw new Error(
    'STRIPE_SECRET_KEY is not set. Please add it to your .env file. ' +
    'Get your key from https://dashboard.stripe.com/apikeys'
  );
}

// Create the Stripe client - this is used for all Stripe API requests
const stripeClient = new Stripe(STRIPE_SECRET_KEY);

// ============================================================================
// WEBHOOK SECRET
// ============================================================================
// The webhook secret is used to verify that webhooks are coming from Stripe.
// You can find this in the Stripe Dashboard under Developers > Webhooks
// TODO: Add your webhook signing secret to the .env file
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================
// Parse incoming JSON requests, except webhook routes. Stripe signature
// verification requires the raw request body; a global JSON parser would
// consume it first and make constructEvent / parseThinEvent fail.
app.use((req, res, next) => {
  if (isWebhookPath(req.originalUrl)) {
    next();
    return;
  }
  bodyParser.json()(req, res, next);
});

// Parse incoming form data
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static('public'));

// ============================================================================
// ROUTES
// ============================================================================

// ============================================================================
// 1. ACCOUNT CREATION - Create a new Stripe Connect account
// ============================================================================
// Endpoint: POST /api/accounts
// This endpoint creates a new Stripe Connect account for a user.
// It uses the V2 API which is the latest Stripe Connect API.
app.post('/api/accounts', async (req, res) => {
  try {
    const { displayName, contactEmail } = req.body;

    // Validate input
    if (!displayName || !contactEmail) {
      return res.status(400).json({
        error: 'displayName and contactEmail are required',
      });
    }

    // Create a new Stripe Connect account using the V2 API
    // Important: We do NOT pass 'type' at the top level - the V2 API
    // determines account type based on configuration
    const account = await stripeClient.v2.core.accounts.create({
      // The name displayed in the Stripe Dashboard
      display_name: displayName,
      // Contact email for the account
      contact_email: contactEmail,
      // Identity information
      identity: {
        country: 'us',
      },
      // Allow full access to the dashboard
      dashboard: 'full',
      // Set default fee collection responsibility
      defaults: {
        responsibilities: {
          // Stripe collects fees from the platform
          fees_collector: 'stripe',
          // Stripe handles payment losses
          losses_collector: 'stripe',
        },
      },
      // Configure the account capabilities
      configuration: {
        // Customer configuration (for subscription payments)
        customer: {},
        // Merchant configuration (for payment processing)
        merchant: {
          capabilities: {
            // Enable card payments
            card_payments: {
              requested: true,
            },
          },
        },
      },
    });

    // TODO: In a production application, store the mapping between your user
    // and the Stripe account ID in your database:
    // await db.saveUserStripeAccount(userId, account.id);

    // Return the created account
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

// ============================================================================
// 2. ACCOUNT ONBOARDING - Generate onboarding link and check status
// ============================================================================
// Endpoint: POST /api/onboarding/link
// This endpoint creates an onboarding link that redirects the user to
// Stripe's onboarding flow where they complete KYC and other requirements
app.post('/api/onboarding/link', async (req, res) => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' });
    }

    // Create an account link for onboarding using the V2 API
    // This link will redirect the user to Stripe's onboarding UI
    const accountLink = await stripeClient.v2.core.accountLinks.create({
      // The account to onboard
      account: accountId,
      // Configure the onboarding flow
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          // Request both merchant and customer configurations
          // Merchant: payment processing
          // Customer: subscription/recurring billing
          configurations: ['merchant', 'customer'],
          // Where to redirect if the user refreshes during onboarding
          refresh_url: `${process.env.DOMAIN || 'http://localhost:3000'}/onboarding?accountId=${accountId}`,
          // Where to redirect after successful onboarding
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

// ============================================================================
// Endpoint: GET /api/accounts/:accountId/status
// This endpoint checks the onboarding status of a connected account.
// It retrieves account information including requirements and capabilities.
app.get('/api/accounts/:accountId/status', async (req, res) => {
  try {
    const { accountId } = req.params;

    // Retrieve the account with merchant and customer configuration details
    // 'include' parameter gets additional details about configuration
    const account = await stripeClient.v2.core.accounts.retrieve(accountId, {
      include: [
        'configuration.merchant',
        'configuration.customer',
        'requirements',
      ],
    });

    // Check if the account is ready to process card payments
    // Card payments are "active" when the merchant has completed onboarding
    // and meets all requirements
    const readyToProcessPayments =
      account.configuration?.merchant?.capabilities?.card_payments?.status ===
      'active';

    // Check the requirements status
    // This tells us if the user needs to provide more information
    const requirementsStatus =
      account.requirements?.summary?.minimum_deadline?.status;

    // Determine if onboarding is complete
    // Onboarding is complete when there are no "currently_due" or "past_due" requirements
    const onboardingComplete =
      requirementsStatus !== 'currently_due' &&
      requirementsStatus !== 'past_due';

    res.json({
      success: true,
      accountId: account.id,
      onboardingComplete,
      readyToProcessPayments,
      requirementsStatus,
      // Return any currently due requirements (e.g., verification documents)
      currentlyDueRequirements:
        account.requirements?.summary?.currently_due || [],
      // Return any past due requirements that are overdue
      pastDueRequirements: account.requirements?.summary?.past_due || [],
    });
  } catch (error) {
    console.error('Error fetching account status:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch account status',
    });
  }
});

// ============================================================================
// 3. PRODUCT MANAGEMENT - Create and retrieve products
// ============================================================================
// Endpoint: POST /api/products
// This endpoint creates a new product on a connected account.
// Products are the items that will be sold through the platform.
app.post('/api/products', async (req, res) => {
  try {
    const { accountId, name, description, priceInCents, currency } = req.body;

    // Validate required fields
    if (!accountId || !name || !priceInCents) {
      return res.status(400).json({
        error: 'accountId, name, and priceInCents are required',
      });
    }

    // Create a product on the connected account
    // The stripeAccount option tells Stripe to create the product
    // on the connected account (using the Stripe-Account header)
    const product = await stripeClient.products.create(
      {
        // Product name displayed to customers
        name: name,
        // Product description
        description: description || '',
        // Default pricing for the product
        default_price_data: {
          // Price in cents (e.g., 1000 = $10.00)
          unit_amount: parseInt(priceInCents),
          // Currency code (e.g., 'usd', 'eur')
          currency: currency || 'usd',
        },
      },
      {
        // Use stripeAccount to operate on the connected account
        // This is equivalent to passing the Stripe-Account header
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

// ============================================================================
// Endpoint: GET /api/products/:accountId
// This endpoint retrieves all active products for a connected account.
// These products will be displayed in the storefront.
app.get('/api/products/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;

    // List all active products on the connected account
    // We expand the default_price to get pricing information
    const products = await stripeClient.products.list(
      {
        limit: 20,
        // Only retrieve active products
        active: true,
        // Expand the default_price to include pricing details
        expand: ['data.default_price'],
      },
      {
        // Operate on the connected account
        stripeAccount: accountId,
      }
    );

    res.json({
      success: true,
      products: products.data.map((product) =>
        mapConnectedProduct({
          id: product.id,
          name: product.name,
          description: product.description,
          default_price: product.default_price,
        })
      ),
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch products',
    });
  }
});

// ============================================================================
// 4. CHECKOUT - Process charges to connected accounts
// ============================================================================
// Endpoint: POST /api/checkout
// This endpoint creates a checkout session for a customer to purchase
// a product from a connected account.
app.post('/api/checkout', async (req, res) => {
  try {
    const { accountId, priceId, quantity } = req.body;

    if (!accountId || !priceId) {
      return res.status(400).json({
        error: 'accountId and priceId are required',
      });
    }

    const qty = quantity || 1;

    // Look up the connected-account price so the platform fee is 10% of the
    // actual charge. Using quantity alone (e.g. 1 * 0.1) rounds to 0 cents.
    const price = await stripeClient.prices.retrieve(priceId, {
      stripeAccount: accountId,
    });
    if (price.unit_amount == null) {
      return res.status(400).json({
        error: 'Price does not have a fixed unit amount',
      });
    }

    // Get the base URL for redirect URLs
    const baseUrl = process.env.DOMAIN || 'http://localhost:3000';

    // Create a checkout session on the connected account
    // This will handle the payment processing and charge the customer
    const session = await stripeClient.checkout.sessions.create(
      {
        // Define the line items (products to purchase)
        line_items: [
          {
            // The price to charge the customer
            price: priceId,
            // Quantity of the product
            quantity: qty,
          },
        ],
        // Set the payment mode (one-time payment)
        mode: 'payment',
        // Configure application fees (platform takes a cut)
        payment_intent_data: {
          // Application fee amount in cents (10% of unit_amount × quantity)
          application_fee_amount: computeApplicationFeeCents(
            price.unit_amount,
            qty
          ),
        },
        // Redirect to success page after payment
        success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&accountId=${accountId}`,
        // Redirect to cancel page if payment is canceled
        cancel_url: `${baseUrl}/storefront?accountId=${accountId}`,
      },
      {
        // Create the checkout session on the connected account
        stripeAccount: accountId,
      }
    );

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
    });
  }
});

// ============================================================================
// 5. SUBSCRIPTIONS - Recurring billing
// ============================================================================
// Endpoint: POST /api/subscriptions
// This endpoint creates a subscription for a customer.
// Subscriptions allow for recurring charges.
app.post('/api/subscriptions', async (req, res) => {
  try {
    const { accountId, priceId } = req.body;

    if (!accountId || !priceId) {
      return res.status(400).json({
        error: 'accountId and priceId are required',
      });
    }

    const baseUrl = process.env.DOMAIN || 'http://localhost:3000';

    // Create a checkout session for subscription
    // customer_account allows the subscription to be managed by the connected account
    const session = await stripeClient.checkout.sessions.create(
      {
        // In V2 API, use customer_account instead of customer
        // This represents the account being charged (the connected account customer)
        customer_account: accountId,
        // Set mode to 'subscription' for recurring payments
        mode: 'subscription',
        // Define the subscription items
        line_items: [
          {
            // The price with billing cycle (monthly, yearly, etc.)
            price: priceId,
            quantity: 1,
          },
        ],
        // Success redirect after subscription is created
        success_url: `${baseUrl}/subscription-success?session_id={CHECKOUT_SESSION_ID}&accountId=${accountId}`,
        // Cancel redirect
        cancel_url: `${baseUrl}/dashboard?accountId=${accountId}`,
      },
      {
        // Create on the connected account
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

// ============================================================================
// 6. BILLING PORTAL - Let customers manage subscriptions
// ============================================================================
// Endpoint: POST /api/billing-portal
// This endpoint creates a session that redirects users to the Stripe
// Billing Portal where they can manage subscriptions, update payment methods, etc.
app.post('/api/billing-portal', async (req, res) => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' });
    }

    // Create a billing portal session
    // The customer_account is the connected account (the seller)
    const session = await stripeClient.billingPortal.sessions.create(
      {
        // The account to manage subscriptions for
        customer_account: accountId,
        // Where to redirect after the customer exits the portal
        return_url: `${process.env.DOMAIN || 'http://localhost:3000'}/dashboard?accountId=${accountId}`,
      },
      {
        // Create on the connected account
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

// ============================================================================
// 7. WEBHOOKS - Listen for Stripe events
// ============================================================================
// Endpoint: POST /webhook
// This endpoint receives webhook events from Stripe.
// Webhooks are sent when events happen in Stripe (e.g., payments, subscription changes).
//
// Important: Webhook endpoints should NOT use the standard bodyParser.json()
// middleware because we need the raw request body to verify the signature.
// The signature verification requires the raw request body, not the parsed JSON.
app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    // Get the webhook signature from the request headers
    const sig = req.headers['stripe-signature'] as string;

    // Verify the webhook signature to ensure the event is from Stripe
    // This prevents unauthorized webhook calls
    let event;
    try {
      event = stripeClient.webhooks.constructEvent(
        req.body,
        sig,
        WEBHOOK_SECRET || ''
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    }

    // Handle different event types
    // Subscribe to these events in the Stripe Dashboard:
    // - customer.subscription.updated
    // - customer.subscription.deleted
    // - invoice.payment_succeeded
    switch (event.type) {
      // Subscription was updated (upgraded, downgraded, renewed, etc.)
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        console.log('Subscription updated:', subscription.id);

        // TODO: Update your database with the new subscription status
        // const customerId = subscription.customer_account;
        // await db.updateSubscription(customerId, subscription);

        // Check if this is an upgrade or downgrade
        if (event.data.previous_attributes?.items?.data) {
          const oldPrice = event.data.previous_attributes.items.data[0]?.price;
          const newPrice = subscription.items.data[0]?.price.id;

          if (oldPrice !== newPrice) {
            console.log(
              `Subscription modified from price ${oldPrice} to ${newPrice}`
            );
            // TODO: Handle upgrade/downgrade logic (grant/revoke access)
          }
        }

        // Check if subscription is being canceled
        if (event.data.previous_attributes?.cancel_at_period_end === false &&
            subscription.cancel_at_period_end === true) {
          console.log('Subscription scheduled for cancellation');
          // TODO: Notify the customer about their pending cancellation
        }

        break;
      }

      // Subscription was canceled
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        console.log('Subscription deleted:', subscription.id);

        // TODO: Update your database and revoke access to the product
        // const customerId = subscription.customer_account;
        // await db.deleteSubscription(customerId);
        // await revokeAccess(customerId);

        break;
      }

      // Invoice payment succeeded
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        console.log('Invoice paid:', invoice.id);

        // TODO: Mark the invoice as paid in your database
        // if (invoice.subscription) {
        //   await db.markInvoicePaid(invoice.subscription, invoice.id);
        // }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the webhook
    res.json({ received: true });
  }
);

// ============================================================================
// V2 WEBHOOK HANDLING - For account requirements changes
// ============================================================================
// Endpoint: POST /webhook/thin
// This endpoint handles V2 API thin events for account requirements changes.
// Thin events are smaller and more efficient than regular events.
//
// Set up these events in the Stripe Dashboard > Developers > Webhooks:
// - v2.account[requirements].updated
// - v2.account[configuration.merchant].capability_status_updated
// - v2.account[configuration.customer].capability_status_updated
app.post(
  '/webhook/thin',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;

    // Parse the thin event using Stripe client
    let thinEvent;
    try {
      thinEvent = stripeClient.parseThinEvent(
        req.body,
        sig,
        WEBHOOK_SECRET || ''
      );
    } catch (err) {
      console.error('Thin event verification failed:', err);
      return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    }

    // Fetch the full event to understand what changed
    const event = await stripeClient.v2.core.events.retrieve(thinEvent.id);

    // Handle V2 account events
    switch (event.type) {
      // Account requirements changed
      case 'v2.core.account[requirements].updated': {
        const account = event.data.object as any;
        console.log('Account requirements updated:', account.id);

        // TODO: Check what requirements are now due and notify the user
        // const currentlyDue = account.requirements?.summary?.currently_due;
        // if (currentlyDue && currentlyDue.length > 0) {
        //   await notifyUser(account.id, 'New requirements needed', currentlyDue);
        // }

        break;
      }

      // Merchant capability status changed
      case 'v2.core.account[configuration.merchant].capability_status_updated': {
        const account = event.data.object as any;
        const cardPaymentsStatus =
          account.configuration?.merchant?.capabilities?.card_payments?.status;

        console.log('Card payments status:', cardPaymentsStatus);

        // TODO: If status is 'active', notify the user they can now accept payments
        // if (cardPaymentsStatus === 'active') {
        //   await notifyUser(account.id, 'Account ready for payments');
        // }

        break;
      }

      default:
        console.log(`Unhandled V2 event type: ${event.type}`);
    }

    res.json({ received: true });
  }
);

// ============================================================================
// SERVE HTML
// ============================================================================
// Serve the main application page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// ============================================================================
// START SERVER
// ============================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Webhook ready at /webhook and /webhook/thin');
});
