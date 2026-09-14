import assert from 'node:assert/strict';
import http from 'node:http';
import { after, afterEach, before, describe, it } from 'node:test';
import { createConnectApp, type ConnectStripeClient } from './connect-app.js';

const servers: http.Server[] = [];
const originalError = console.error;
const originalLog = console.log;

before(() => {
  console.error = () => undefined;
  console.log = () => undefined;
});

after(() => {
  console.error = originalError;
  console.log = originalLog;
});

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        })
    )
  );
});

async function listen(app: ReturnType<typeof createConnectApp>): Promise<number> {
  const server = http.createServer(app);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to bind test server');
  }
  return address.port;
}

function request(
  port: number,
  options: { method?: string; path: string; headers?: http.OutgoingHttpHeaders; body?: string }
): Promise<{ status: number; raw: string; body: unknown }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        method: options.method ?? 'GET',
        path: options.path,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk.toString();
        });
        res.on('end', () => {
          let parsed: unknown = data;
          try {
            parsed = data ? JSON.parse(data) : null;
          } catch {
            parsed = data;
          }
          resolve({
            status: res.statusCode ?? 0,
            raw: data,
            body: parsed,
          });
        });
      }
    );
    req.on('error', reject);
    if (options.body !== undefined) {
      req.write(options.body);
    }
    req.end();
  });
}

interface MockConnectStripe {
  accountCreates?: Record<string, unknown>[];
  accountLinkCreates?: Record<string, unknown>[];
  accountRetrieves?: string[];
  productCreates?: Array<{ data: Record<string, unknown>; options: Record<string, unknown> }>;
  productLists?: Array<{ data: Record<string, unknown>; options: Record<string, unknown> }>;
  checkoutCreates?: Array<{ data: Record<string, unknown>; options: Record<string, unknown> }>;
  portalCreates?: Array<{ data: Record<string, unknown>; options: Record<string, unknown> }>;
  constructEventBodies?: unknown[];
  parseThinBodies?: unknown[];
  thinEventRetrieves?: string[];
}

function mockConnectStripe(options: {
  account?: Record<string, unknown>;
  products?: Array<Record<string, unknown>>;
  constructEvent?: (body: unknown, sig: string, secret: string) => unknown;
  parseThinEvent?: (body: unknown, sig: string, secret: string) => unknown;
  retrieveThinEvent?: (id: string) => Promise<unknown>;
  failCheckout?: Error;
} = {}): { stripe: ConnectStripeClient; calls: MockConnectStripe } {
  const calls: MockConnectStripe = {
    accountCreates: [],
    accountLinkCreates: [],
    accountRetrieves: [],
    productCreates: [],
    productLists: [],
    checkoutCreates: [],
    portalCreates: [],
    constructEventBodies: [],
    parseThinBodies: [],
    thinEventRetrieves: [],
  };

  const stripe = {
    v2: {
      core: {
        accounts: {
          create: async (data: Record<string, unknown>) => {
            calls.accountCreates?.push(data);
            return { id: 'acct_123', display_name: data.display_name };
          },
          retrieve: async (id: string) => {
            calls.accountRetrieves?.push(id);
            return (
              options.account ?? {
                id,
                configuration: { merchant: { capabilities: { card_payments: { status: 'inactive' } } } },
                requirements: { summary: { minimum_deadline: { status: 'currently_due' }, currently_due: ['id_number'] } },
              }
            );
          },
        },
        accountLinks: {
          create: async (data: Record<string, unknown>) => {
            calls.accountLinkCreates?.push(data);
            return { url: 'https://connect.stripe.com/setup/s/test' };
          },
        },
        events: {
          retrieve: async (id: string) => {
            calls.thinEventRetrieves?.push(id);
            if (options.retrieveThinEvent) {
              return options.retrieveThinEvent(id);
            }
            return { type: 'unknown.event', data: { object: { id: 'obj_1' } } };
          },
        },
      },
    },
    products: {
      create: async (data: Record<string, unknown>, requestOptions: Record<string, unknown>) => {
        calls.productCreates?.push({ data, options: requestOptions });
        return { id: 'prod_1', name: data.name, description: data.description, default_price: 'price_1' };
      },
      list: async (data: Record<string, unknown>, requestOptions: Record<string, unknown>) => {
        calls.productLists?.push({ data, options: requestOptions });
        return { data: options.products ?? [] };
      },
    },
    checkout: {
      sessions: {
        create: async (data: Record<string, unknown>, requestOptions: Record<string, unknown>) => {
          calls.checkoutCreates?.push({ data, options: requestOptions });
          if (options.failCheckout) {
            throw options.failCheckout;
          }
          return { id: 'cs_test_123' };
        },
      },
    },
    billingPortal: {
      sessions: {
        create: async (data: Record<string, unknown>, requestOptions: Record<string, unknown>) => {
          calls.portalCreates?.push({ data, options: requestOptions });
          return { url: 'https://billing.stripe.com/session/test' };
        },
      },
    },
    webhooks: {
      constructEvent: (body: unknown, sig: string, secret: string) => {
        calls.constructEventBodies?.push(body);
        if (options.constructEvent) {
          return options.constructEvent(body, sig, secret);
        }
        throw new Error('No signatures found matching the expected signature for payload');
      },
    },
    parseThinEvent: (body: unknown, sig: string, secret: string) => {
      calls.parseThinBodies?.push(body);
      if (options.parseThinEvent) {
        return options.parseThinEvent(body, sig, secret);
      }
      throw new Error('Invalid thin event signature');
    },
  };

  return { stripe: stripe as unknown as ConnectStripeClient, calls };
}

describe('POST /api/accounts', () => {
  it('rejects missing displayName or contactEmail', async () => {
    const { stripe } = mockConnectStripe();
    const port = await listen(createConnectApp({ stripeClient: stripe }));

    const missingBoth = await request(port, { method: 'POST', path: '/api/accounts', body: '{}' });
    const missingEmail = await request(port, {
      method: 'POST',
      path: '/api/accounts',
      body: JSON.stringify({ displayName: 'Trail Shop' }),
    });

    assert.equal(missingBoth.status, 400);
    assert.equal(missingEmail.status, 400);
    assert.deepEqual(missingBoth.body, { error: 'displayName and contactEmail are required' });
  });

  it('creates a US Connect account with merchant card payments requested', async () => {
    const { stripe, calls } = mockConnectStripe();
    const port = await listen(createConnectApp({ stripeClient: stripe }));
    const response = await request(port, {
      method: 'POST',
      path: '/api/accounts',
      body: JSON.stringify({ displayName: 'Trail Shop', contactEmail: 'owner@example.com' }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      success: true,
      accountId: 'acct_123',
      displayName: 'Trail Shop',
    });
    assert.equal(calls.accountCreates?.[0]?.display_name, 'Trail Shop');
    assert.equal(calls.accountCreates?.[0]?.contact_email, 'owner@example.com');
    assert.deepEqual(calls.accountCreates?.[0]?.identity, { country: 'us' });
    assert.equal(
      (calls.accountCreates?.[0]?.configuration as { merchant: { capabilities: { card_payments: { requested: boolean } } } })
        .merchant.capabilities.card_payments.requested,
      true
    );
  });
});

describe('account onboarding', () => {
  it('requires accountId for an onboarding link', async () => {
    const { stripe } = mockConnectStripe();
    const port = await listen(createConnectApp({ stripeClient: stripe }));
    const response = await request(port, { method: 'POST', path: '/api/onboarding/link', body: '{}' });
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { error: 'accountId is required' });
  });

  it('builds refresh and return URLs from DOMAIN', async () => {
    const previous = process.env.DOMAIN;
    process.env.DOMAIN = 'https://platform.example';
    try {
      const { stripe, calls } = mockConnectStripe();
      const port = await listen(createConnectApp({ stripeClient: stripe }));
      const response = await request(port, {
        method: 'POST',
        path: '/api/onboarding/link',
        body: JSON.stringify({ accountId: 'acct_9' }),
      });

      assert.equal(response.status, 200);
      assert.equal((response.body as { url: string }).url, 'https://connect.stripe.com/setup/s/test');
      const useCase = calls.accountLinkCreates?.[0]?.use_case as {
        account_onboarding: { refresh_url: string; return_url: string };
      };
      assert.equal(useCase.account_onboarding.refresh_url, 'https://platform.example/onboarding?accountId=acct_9');
      assert.equal(useCase.account_onboarding.return_url, 'https://platform.example/dashboard?accountId=acct_9');
    } finally {
      if (previous === undefined) {
        delete process.env.DOMAIN;
      } else {
        process.env.DOMAIN = previous;
      }
    }
  });

  it('marks onboarding incomplete and payments not ready when requirements are currently due', async () => {
    const { stripe } = mockConnectStripe();
    const port = await listen(createConnectApp({ stripeClient: stripe }));
    const response = await request(port, { path: '/api/accounts/acct_9/status' });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      success: true,
      accountId: 'acct_9',
      onboardingComplete: false,
      readyToProcessPayments: false,
      requirementsStatus: 'currently_due',
      currentlyDueRequirements: ['id_number'],
      pastDueRequirements: [],
    });
  });

  it('is ready to process payments only when card_payments is active', async () => {
    const { stripe } = mockConnectStripe({
      account: {
        id: 'acct_ready',
        configuration: { merchant: { capabilities: { card_payments: { status: 'active' } } } },
        requirements: { summary: { minimum_deadline: { status: 'eventually_due' } } },
      },
    });
    const port = await listen(createConnectApp({ stripeClient: stripe }));
    const response = await request(port, { path: '/api/accounts/acct_ready/status' });
    const body = response.body as { readyToProcessPayments: boolean; onboardingComplete: boolean };

    assert.equal(body.readyToProcessPayments, true);
    assert.equal(body.onboardingComplete, true);
  });
});

describe('connected account products', () => {
  it('rejects a product without priceInCents, including 0', async () => {
    const { stripe, calls } = mockConnectStripe();
    const port = await listen(createConnectApp({ stripeClient: stripe }));
    const response = await request(port, {
      method: 'POST',
      path: '/api/products',
      body: JSON.stringify({ accountId: 'acct_1', name: 'Free sample', priceInCents: 0 }),
    });

    assert.equal(response.status, 400);
    assert.equal(calls.productCreates?.length, 0);
  });

  it('creates a product on the connected account and parseInts the price', async () => {
    const { stripe, calls } = mockConnectStripe();
    const port = await listen(createConnectApp({ stripeClient: stripe }));
    const response = await request(port, {
      method: 'POST',
      path: '/api/products',
      body: JSON.stringify({
        accountId: 'acct_1',
        name: 'Trail Tent',
        priceInCents: '1999',
        currency: 'eur',
      }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(calls.productCreates?.[0]?.options, { stripeAccount: 'acct_1' });
    assert.deepEqual(calls.productCreates?.[0]?.data.default_price_data, {
      unit_amount: 1999,
      currency: 'eur',
    });
  });

  it('lists products with expanded default_price but omits priceId from the response', async () => {
    const { stripe, calls } = mockConnectStripe({
      products: [
        {
          id: 'prod_1',
          name: 'Mug',
          description: 'Enamel',
          default_price: { id: 'price_abc', unit_amount: 1299, currency: 'usd' },
        },
        {
          id: 'prod_2',
          name: 'Draft',
          description: null,
          default_price: 'price_unexpanded',
        },
      ],
    });
    const port = await listen(createConnectApp({ stripeClient: stripe }));
    const response = await request(port, { path: '/api/products/acct_1' });

    assert.equal(response.status, 200);
    assert.deepEqual(calls.productLists?.[0]?.data, {
      limit: 20,
      active: true,
      expand: ['data.default_price'],
    });
    assert.deepEqual(calls.productLists?.[0]?.options, { stripeAccount: 'acct_1' });
    assert.deepEqual(response.body, {
      success: true,
      products: [
        { id: 'prod_1', name: 'Mug', description: 'Enamel', price: 1299, currency: 'usd' },
        { id: 'prod_2', name: 'Draft', description: null, price: 0, currency: 'usd' },
      ],
    });
    const listed = (response.body as { products: Array<Record<string, unknown>> }).products;
    assert.equal('priceId' in listed[0]!, false);
    assert.equal('default_price' in listed[0]!, false);
  });
});

describe('POST /api/checkout', () => {
  it('requires accountId and priceId', async () => {
    const { stripe, calls } = mockConnectStripe();
    const port = await listen(createConnectApp({ stripeClient: stripe }));
    const response = await request(port, {
      method: 'POST',
      path: '/api/checkout',
      body: JSON.stringify({ accountId: 'acct_1' }),
    });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { error: 'accountId and priceId are required' });
    assert.equal(calls.checkoutCreates?.length, 0);
  });

  it('charges a 10% application fee of quantity, not of the price (qty=1 is 0 cents)', async () => {
    const { stripe, calls } = mockConnectStripe();
    const port = await listen(createConnectApp({ stripeClient: stripe }));
    const response = await request(port, {
      method: 'POST',
      path: '/api/checkout',
      body: JSON.stringify({ accountId: 'acct_1', priceId: 'price_abc', quantity: 1 }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { success: true, sessionId: 'cs_test_123' });
    assert.deepEqual(calls.checkoutCreates?.[0]?.options, { stripeAccount: 'acct_1' });
    const session = calls.checkoutCreates?.[0]?.data as {
      mode: string;
      line_items: Array<{ price: string; quantity: number }>;
      payment_intent_data: { application_fee_amount: number };
    };
    assert.equal(session.mode, 'payment');
    assert.deepEqual(session.line_items, [{ price: 'price_abc', quantity: 1 }]);
    assert.equal(session.payment_intent_data.application_fee_amount, 0);
  });

  it('defaults omitted quantity to 1 and still computes fee as round(qty * 0.1)', async () => {
    const { stripe, calls } = mockConnectStripe();
    const port = await listen(createConnectApp({ stripeClient: stripe }));

    await request(port, {
      method: 'POST',
      path: '/api/checkout',
      body: JSON.stringify({ accountId: 'acct_1', priceId: 'price_abc' }),
    });
    await request(port, {
      method: 'POST',
      path: '/api/checkout',
      body: JSON.stringify({ accountId: 'acct_1', priceId: 'price_abc', quantity: 10 }),
    });

    const first = calls.checkoutCreates?.[0]?.data as {
      line_items: Array<{ quantity: number }>;
      payment_intent_data: { application_fee_amount: number };
    };
    const second = calls.checkoutCreates?.[1]?.data as {
      payment_intent_data: { application_fee_amount: number };
    };

    assert.equal(first.line_items[0]?.quantity, 1);
    assert.equal(first.payment_intent_data.application_fee_amount, 0);
    assert.equal(second.payment_intent_data.application_fee_amount, 1);
  });
});

describe('subscriptions and billing portal', () => {
  it('creates a subscription checkout on the connected account', async () => {
    const { stripe, calls } = mockConnectStripe();
    const port = await listen(createConnectApp({ stripeClient: stripe }));
    const response = await request(port, {
      method: 'POST',
      path: '/api/subscriptions',
      body: JSON.stringify({ accountId: 'acct_1', priceId: 'price_sub' }),
    });

    assert.equal(response.status, 200);
    const session = calls.checkoutCreates?.[0]?.data as {
      mode: string;
      customer_account: string;
      line_items: Array<{ price: string; quantity: number }>;
    };
    assert.equal(session.mode, 'subscription');
    assert.equal(session.customer_account, 'acct_1');
    assert.deepEqual(session.line_items, [{ price: 'price_sub', quantity: 1 }]);
    assert.deepEqual(calls.checkoutCreates?.[0]?.options, { stripeAccount: 'acct_1' });
  });

  it('creates a billing portal session for the connected account', async () => {
    const { stripe, calls } = mockConnectStripe();
    const port = await listen(createConnectApp({ stripeClient: stripe }));
    const response = await request(port, {
      method: 'POST',
      path: '/api/billing-portal',
      body: JSON.stringify({ accountId: 'acct_1' }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { success: true, url: 'https://billing.stripe.com/session/test' });
    assert.equal(
      (calls.portalCreates?.[0]?.data as { customer_account: string }).customer_account,
      'acct_1'
    );
    assert.deepEqual(calls.portalCreates?.[0]?.options, { stripeAccount: 'acct_1' });
  });
});

describe('webhooks', () => {
  it('returns 400 when signature verification fails', async () => {
    const { stripe } = mockConnectStripe();
    const port = await listen(createConnectApp({ stripeClient: stripe, webhookSecret: 'whsec_test' }));
    const response = await request(port, {
      method: 'POST',
      path: '/webhook',
      headers: { 'stripe-signature': 't=1,v1=bad' },
      body: JSON.stringify({ type: 'invoice.payment_succeeded' }),
    });

    assert.equal(response.status, 400);
    assert.match(response.raw, /Webhook Error:/);
  });

  it('acknowledges a verified invoice.payment_succeeded event', async () => {
    const { stripe } = mockConnectStripe({
      constructEvent: () => ({
        type: 'invoice.payment_succeeded',
        data: { object: { id: 'in_1' } },
      }),
    });
    const port = await listen(createConnectApp({ stripeClient: stripe, webhookSecret: 'whsec_test' }));
    const response = await request(port, {
      method: 'POST',
      path: '/webhook',
      headers: { 'stripe-signature': 't=1,v1=good' },
      body: JSON.stringify({ type: 'invoice.payment_succeeded' }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { received: true });
  });

  it('returns 400 when a thin event signature is invalid', async () => {
    const { stripe } = mockConnectStripe();
    const port = await listen(createConnectApp({ stripeClient: stripe, webhookSecret: 'whsec_test' }));
    const response = await request(port, {
      method: 'POST',
      path: '/webhook/thin',
      headers: { 'stripe-signature': 't=1,v1=bad' },
      body: JSON.stringify({ id: 'evt_1' }),
    });

    assert.equal(response.status, 400);
    assert.match(response.raw, /Webhook Error:/);
  });

  it('retrieves the full V2 event after a verified thin event', async () => {
    const { stripe, calls } = mockConnectStripe({
      parseThinEvent: () => ({ id: 'evt_thin_1' }),
      retrieveThinEvent: async () => ({
        type: 'v2.core.account[requirements].updated',
        data: { object: { id: 'acct_1' } },
      }),
    });
    const port = await listen(createConnectApp({ stripeClient: stripe, webhookSecret: 'whsec_test' }));
    const response = await request(port, {
      method: 'POST',
      path: '/webhook/thin',
      headers: { 'stripe-signature': 't=1,v1=good' },
      body: JSON.stringify({ id: 'evt_thin_1' }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(calls.thinEventRetrieves, ['evt_thin_1']);
    assert.deepEqual(response.body, { received: true });
  });
});
