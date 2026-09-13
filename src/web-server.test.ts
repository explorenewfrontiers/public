import assert from 'node:assert/strict';
import http from 'node:http';
import { afterEach, describe, it } from 'node:test';
import type Stripe from 'stripe';
import { createCatalogApp } from './web-server.js';

const servers: http.Server[] = [];

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

async function listen(app: ReturnType<typeof createCatalogApp>): Promise<number> {
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
): Promise<{ status: number; body: unknown }> {
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
          resolve({
            status: res.statusCode ?? 0,
            body: data ? JSON.parse(data) : null,
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

interface MockCatalogStripeOptions {
  products?: Array<{
    id: string;
    name: string;
    description?: string | null;
    images?: string[];
    metadata?: Record<string, string>;
  }>;
  productById?: Record<
    string,
    {
      product: {
        id: string;
        name: string;
        description?: string | null;
        images?: string[];
        metadata?: Record<string, string>;
      };
      prices: Array<{
        id: string;
        unit_amount: number | null;
        currency: string;
        recurring: { interval: string } | null;
      }>;
    }
  >;
  listError?: Error;
  retrieveError?: Error;
  checkoutError?: Error;
}

function mockCatalogStripe(options: MockCatalogStripeOptions = {}) {
  const listCalls: Record<string, unknown>[] = [];
  const retrieveCalls: string[] = [];
  const checkoutCalls: Record<string, unknown>[] = [];

  const stripe = {
    products: {
      list: async (params: Record<string, unknown>) => {
        listCalls.push(params);
        if (options.listError) {
          throw options.listError;
        }
        return { data: options.products ?? [] };
      },
      retrieve: async (id: string) => {
        retrieveCalls.push(id);
        if (options.retrieveError) {
          throw options.retrieveError;
        }
        const found = options.productById?.[id];
        if (!found) {
          throw new Error(`No such product: ${id}`);
        }
        return found.product;
      },
    },
    prices: {
      list: async (params: { product: string }) => {
        const found = options.productById?.[params.product];
        return { data: found?.prices ?? [] };
      },
    },
    checkout: {
      sessions: {
        create: async (params: Record<string, unknown>) => {
          checkoutCalls.push(params);
          if (options.checkoutError) {
            throw options.checkoutError;
          }
          return { id: 'cs_test_123' };
        },
      },
    },
  };

  return {
    stripe: stripe as unknown as Stripe,
    listCalls,
    retrieveCalls,
    checkoutCalls,
  };
}

describe('GET /api/products', () => {
  it('lists products and defaults the Stripe limit to 20', async () => {
    const { stripe, listCalls } = mockCatalogStripe({
      products: [
        {
          id: 'prod_1',
          name: 'Trail Tent',
          description: 'Two-person tent',
          images: ['https://example.com/tent.png'],
          metadata: { sku: 'TENT-1' },
        },
      ],
    });

    const port = await listen(createCatalogApp(stripe));
    const response = await request(port, { path: '/api/products' });

    assert.equal(response.status, 200);
    assert.deepEqual(listCalls[0], { limit: 20, active: true });
    assert.deepEqual(response.body, {
      products: [
        {
          id: 'prod_1',
          name: 'Trail Tent',
          description: 'Two-person tent',
          images: ['https://example.com/tent.png'],
          metadata: { sku: 'TENT-1' },
        },
      ],
    });
  });

  it('forwards a numeric limit query to Stripe', async () => {
    const { stripe, listCalls } = mockCatalogStripe();
    const port = await listen(createCatalogApp(stripe));
    const response = await request(port, { path: '/api/products?limit=5' });

    assert.equal(response.status, 200);
    assert.deepEqual(listCalls[0], { limit: 5, active: true });
  });

  it('falls back to 20 when the limit query is missing or not a number', async () => {
    const { stripe, listCalls } = mockCatalogStripe();
    const port = await listen(createCatalogApp(stripe));

    await request(port, { path: '/api/products?limit=abc' });
    await request(port, { path: '/api/products?limit=0' });

    assert.deepEqual(listCalls[0], { limit: 20, active: true });
    assert.deepEqual(listCalls[1], { limit: 20, active: true });
  });

  it('returns 500 when Stripe listing fails', async () => {
    const { stripe } = mockCatalogStripe({ listError: new Error('Stripe unavailable') });
    const port = await listen(createCatalogApp(stripe));
    const response = await request(port, { path: '/api/products' });

    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { error: 'Stripe unavailable' });
  });
});

describe('GET /api/products/:productId', () => {
  it('returns the product and its active prices', async () => {
    const { stripe, retrieveCalls } = mockCatalogStripe({
      productById: {
        prod_9: {
          product: {
            id: 'prod_9',
            name: 'Kit',
            description: 'Field kit',
            images: [],
            metadata: {},
          },
          prices: [
            {
              id: 'price_1',
              unit_amount: 2500,
              currency: 'usd',
              recurring: null,
            },
          ],
        },
      },
    });

    const port = await listen(createCatalogApp(stripe));
    const response = await request(port, { path: '/api/products/prod_9' });

    assert.equal(response.status, 200);
    assert.deepEqual(retrieveCalls, ['prod_9']);
    assert.deepEqual(response.body, {
      product: {
        id: 'prod_9',
        name: 'Kit',
        description: 'Field kit',
        images: [],
        metadata: {},
      },
      prices: [
        {
          id: 'price_1',
          unit_amount: 2500,
          currency: 'usd',
          recurring: null,
        },
      ],
    });
  });

  it('returns 500 when the product cannot be retrieved', async () => {
    const { stripe } = mockCatalogStripe({
      retrieveError: new Error('No such product: prod_missing'),
    });
    const port = await listen(createCatalogApp(stripe));
    const response = await request(port, { path: '/api/products/prod_missing' });

    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { error: 'No such product: prod_missing' });
  });
});

describe('POST /api/checkout', () => {
  it('creates a payment session from cart line items', async () => {
    const { stripe, checkoutCalls } = mockCatalogStripe();
    const port = await listen(createCatalogApp(stripe));
    const response = await request(port, {
      method: 'POST',
      path: '/api/checkout',
      body: JSON.stringify({
        items: [
          { priceId: 'price_a', quantity: 2 },
          { priceId: 'price_b', quantity: 1 },
        ],
      }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { sessionId: 'cs_test_123' });
    assert.deepEqual(checkoutCalls[0], {
      payment_method_types: ['card'],
      line_items: [
        { price: 'price_a', quantity: 2 },
        { price: 'price_b', quantity: 1 },
      ],
      mode: 'payment',
      success_url: 'http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:3000/cancel',
    });
  });

  it('uses DOMAIN for success and cancel URLs when set', async () => {
    const previous = process.env.DOMAIN;
    process.env.DOMAIN = 'https://shop.example';
    try {
      const { stripe, checkoutCalls } = mockCatalogStripe();
      const port = await listen(createCatalogApp(stripe));
      const response = await request(port, {
        method: 'POST',
        path: '/api/checkout',
        body: JSON.stringify({ items: [{ priceId: 'price_a', quantity: 1 }] }),
      });

      assert.equal(response.status, 200);
      assert.equal(
        checkoutCalls[0]?.success_url,
        'https://shop.example/success?session_id={CHECKOUT_SESSION_ID}'
      );
      assert.equal(checkoutCalls[0]?.cancel_url, 'https://shop.example/cancel');
    } finally {
      if (previous === undefined) {
        delete process.env.DOMAIN;
      } else {
        process.env.DOMAIN = previous;
      }
    }
  });

  it('returns 500 when items is missing (current storefront contract)', async () => {
    const { stripe, checkoutCalls } = mockCatalogStripe();
    const port = await listen(createCatalogApp(stripe));
    const response = await request(port, {
      method: 'POST',
      path: '/api/checkout',
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 500);
    assert.equal(checkoutCalls.length, 0);
    const body = response.body as { error: string };
    assert.equal(typeof body.error, 'string');
    assert.match(body.error, /map/i);
  });

  it('returns 500 when Stripe checkout creation fails', async () => {
    const { stripe } = mockCatalogStripe({
      checkoutError: new Error('No such price: price_bad'),
    });
    const port = await listen(createCatalogApp(stripe));
    const response = await request(port, {
      method: 'POST',
      path: '/api/checkout',
      body: JSON.stringify({ items: [{ priceId: 'price_bad', quantity: 1 }] }),
    });

    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { error: 'No such price: price_bad' });
  });
});
