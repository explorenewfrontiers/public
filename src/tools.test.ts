import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type Stripe from 'stripe';
import { handleToolCall } from './tools.js';

interface MockCalls {
  customerList: Record<string, unknown>[];
  customerRetrieve: string[];
  customerCreate: Record<string, unknown>[];
  chargeList: Record<string, unknown>[];
  chargeRetrieve: string[];
  paymentIntentCreate: Record<string, unknown>[];
  paymentIntentRetrieve: string[];
  invoiceList: Record<string, unknown>[];
  invoiceRetrieve: string[];
  productList: Record<string, unknown>[];
  productRetrieve: string[];
  priceList: Record<string, unknown>[];
}

function createMockStripe(options: {
  products?: Array<{
    id: string;
    name: string;
    description?: string | null;
    images?: string[];
    metadata?: Record<string, string>;
  }>;
  prices?: Array<{
    id: string;
    product: string;
    unit_amount: number | null;
    currency: string;
    recurring: { interval: string } | null;
  }>;
  retrieveError?: Error;
} = {}): { stripe: Stripe; calls: MockCalls } {
  const calls: MockCalls = {
    customerList: [],
    customerRetrieve: [],
    customerCreate: [],
    chargeList: [],
    chargeRetrieve: [],
    paymentIntentCreate: [],
    paymentIntentRetrieve: [],
    invoiceList: [],
    invoiceRetrieve: [],
    productList: [],
    productRetrieve: [],
    priceList: [],
  };

  const stripe = {
    customers: {
      list: async (params: Record<string, unknown>) => {
        calls.customerList.push(params);
        return { data: [{ id: 'cus_1' }], has_more: false };
      },
      retrieve: async (id: string) => {
        calls.customerRetrieve.push(id);
        return { id, email: 'buyer@example.com' };
      },
      create: async (params: Record<string, unknown>) => {
        calls.customerCreate.push(params);
        return { id: 'cus_new', ...params };
      },
    },
    charges: {
      list: async (params: Record<string, unknown>) => {
        calls.chargeList.push(params);
        return { data: [{ id: 'ch_1' }] };
      },
      retrieve: async (id: string) => {
        calls.chargeRetrieve.push(id);
        return { id, amount: 500 };
      },
    },
    paymentIntents: {
      create: async (params: Record<string, unknown>) => {
        calls.paymentIntentCreate.push(params);
        return { id: 'pi_1', ...params };
      },
      retrieve: async (id: string) => {
        calls.paymentIntentRetrieve.push(id);
        return { id, status: 'succeeded' };
      },
    },
    invoices: {
      list: async (params: Record<string, unknown>) => {
        calls.invoiceList.push(params);
        return { data: [{ id: 'in_1' }] };
      },
      retrieve: async (id: string) => {
        calls.invoiceRetrieve.push(id);
        return { id, paid: true };
      },
    },
    products: {
      list: async (params: Record<string, unknown>) => {
        calls.productList.push(params);
        return { data: options.products ?? [] };
      },
      retrieve: async (id: string) => {
        calls.productRetrieve.push(id);
        if (options.retrieveError) {
          throw options.retrieveError;
        }
        const found = (options.products ?? []).find((p) => p.id === id);
        if (!found) {
          throw new Error(`No such product: ${id}`);
        }
        return found;
      },
    },
    prices: {
      list: async (params: Record<string, unknown>) => {
        calls.priceList.push(params);
        return { data: options.prices ?? [] };
      },
    },
  };

  return { stripe: stripe as unknown as Stripe, calls };
}

describe('handleToolCall customers', () => {
  it('lists customers with default limit 10 when limit is omitted or 0', async () => {
    const { stripe, calls } = createMockStripe();

    await handleToolCall('list_customers', {}, stripe);
    await handleToolCall('list_customers', { limit: 0 }, stripe);
    await handleToolCall('list_customers', { limit: 3, starting_after: 'cus_prev' }, stripe);

    assert.deepEqual(calls.customerList[0], { limit: 10, starting_after: undefined });
    assert.deepEqual(calls.customerList[1], { limit: 10, starting_after: undefined });
    assert.deepEqual(calls.customerList[2], { limit: 3, starting_after: 'cus_prev' });
  });

  it('retrieves a customer by id', async () => {
    const { stripe, calls } = createMockStripe();
    const result = (await handleToolCall(
      'get_customer',
      { customer_id: 'cus_abc' },
      stripe
    )) as { id: string };

    assert.equal(result.id, 'cus_abc');
    assert.deepEqual(calls.customerRetrieve, ['cus_abc']);
  });

  it('creates a customer with email, name, and description', async () => {
    const { stripe, calls } = createMockStripe();
    await handleToolCall(
      'create_customer',
      { email: 'a@b.com', name: 'Ada', description: 'VIP' },
      stripe
    );

    assert.deepEqual(calls.customerCreate[0], {
      email: 'a@b.com',
      name: 'Ada',
      description: 'VIP',
    });
  });
});

describe('handleToolCall charges and invoices', () => {
  it('lists charges filtered by customer with default limit 10', async () => {
    const { stripe, calls } = createMockStripe();
    await handleToolCall('list_charges', { customer: 'cus_1' }, stripe);

    assert.deepEqual(calls.chargeList[0], { limit: 10, customer: 'cus_1' });
  });

  it('retrieves a charge by id', async () => {
    const { stripe, calls } = createMockStripe();
    const result = (await handleToolCall('get_charge', { charge_id: 'ch_9' }, stripe)) as {
      amount: number;
    };

    assert.equal(result.amount, 500);
    assert.deepEqual(calls.chargeRetrieve, ['ch_9']);
  });

  it('lists invoices filtered by customer', async () => {
    const { stripe, calls } = createMockStripe();
    await handleToolCall('list_invoices', { customer: 'cus_1', limit: 5 }, stripe);

    assert.deepEqual(calls.invoiceList[0], { limit: 5, customer: 'cus_1' });
  });

  it('retrieves an invoice by id', async () => {
    const { stripe, calls } = createMockStripe();
    await handleToolCall('get_invoice', { invoice_id: 'in_9' }, stripe);
    assert.deepEqual(calls.invoiceRetrieve, ['in_9']);
  });
});

describe('handleToolCall payment intents', () => {
  it('creates a payment intent with amount in cents and currency', async () => {
    const { stripe, calls } = createMockStripe();
    const result = (await handleToolCall(
      'create_payment_intent',
      { amount: 1999, currency: 'usd', customer: 'cus_1', description: 'Order 12' },
      stripe
    )) as { id: string };

    assert.equal(result.id, 'pi_1');
    assert.deepEqual(calls.paymentIntentCreate[0], {
      amount: 1999,
      currency: 'usd',
      customer: 'cus_1',
      description: 'Order 12',
    });
  });

  it('passes through a missing amount instead of substituting a default', async () => {
    const { stripe, calls } = createMockStripe();
    await handleToolCall('create_payment_intent', { currency: 'usd' }, stripe);

    assert.equal(calls.paymentIntentCreate[0]?.amount, undefined);
    assert.equal(calls.paymentIntentCreate[0]?.currency, 'usd');
  });

  it('retrieves a payment intent by id', async () => {
    const { stripe, calls } = createMockStripe();
    await handleToolCall('get_payment_intent', { payment_intent_id: 'pi_9' }, stripe);
    assert.deepEqual(calls.paymentIntentRetrieve, ['pi_9']);
  });
});

describe('handleToolCall catalog reads', () => {
  it('lists active products with default limit 10 and a mapped payload', async () => {
    const { stripe, calls } = createMockStripe({
      products: [
        {
          id: 'prod_1',
          name: 'Trail Tent',
          description: 'Two-person',
          images: ['https://example.com/tent.png'],
          metadata: { sku: 'TENT-1' },
        },
      ],
    });

    const result = (await handleToolCall('list_products', {}, stripe)) as {
      products: Array<Record<string, unknown>>;
    };

    assert.deepEqual(calls.productList[0], { limit: 10, active: true });
    assert.deepEqual(result.products, [
      {
        id: 'prod_1',
        name: 'Trail Tent',
        description: 'Two-person',
        images: ['https://example.com/tent.png'],
        metadata: { sku: 'TENT-1' },
      },
    ]);
  });

  it('returns product details with active prices', async () => {
    const { stripe, calls } = createMockStripe({
      products: [
        {
          id: 'prod_9',
          name: 'Kit',
          description: 'Field kit',
          images: [],
          metadata: {},
        },
      ],
      prices: [
        {
          id: 'price_1',
          product: 'prod_9',
          unit_amount: 2500,
          currency: 'usd',
          recurring: null,
        },
      ],
    });

    const result = (await handleToolCall(
      'get_product',
      { product_id: 'prod_9' },
      stripe
    )) as { product: { id: string }; prices: Array<{ unit_amount: number | null }> };

    assert.equal(result.product.id, 'prod_9');
    assert.equal(result.prices[0]?.unit_amount, 2500);
    assert.deepEqual(calls.productRetrieve, ['prod_9']);
    assert.deepEqual(calls.priceList[0], { product: 'prod_9', active: true });
  });
});

describe('handleToolCall errors', () => {
  it('throws for an unknown tool name', async () => {
    const { stripe } = createMockStripe();
    await assert.rejects(
      () => handleToolCall('delete_everything', {}, stripe),
      /Unknown tool: delete_everything/
    );
  });

  it('propagates Stripe retrieve failures', async () => {
    const { stripe } = createMockStripe({
      retrieveError: new Error('No such product: prod_missing'),
    });

    await assert.rejects(
      () => handleToolCall('get_product', { product_id: 'prod_missing' }, stripe),
      /No such product: prod_missing/
    );
  });
});
