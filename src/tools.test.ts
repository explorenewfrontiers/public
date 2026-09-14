import assert from 'node:assert/strict';
import { after, afterEach, before, describe, it } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import XLSX from 'xlsx';
import type Stripe from 'stripe';
import { buildStripeClientOptions, handleToolCall, tools } from './tools.js';

const tempDirs: string[] = [];
const originalLog = console.log;
const originalError = console.error;

before(() => {
  console.log = () => undefined;
  console.error = () => undefined;
});

after(() => {
  console.log = originalLog;
  console.error = originalError;
});

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function writeCatalog(rows: Record<string, unknown>[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tools-catalog-'));
  tempDirs.push(dir);
  const file = path.join(dir, 'catalog.xlsx');
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Products');
  XLSX.writeFile(workbook, file);
  return file;
}

function mockStripe(overrides: {
  createPaymentIntent?: (data: Record<string, unknown>) => Promise<unknown>;
  createCustomer?: (data: Record<string, unknown>) => Promise<unknown>;
  listCharges?: (data: Record<string, unknown>) => Promise<unknown>;
  retrieveCharge?: (id: string) => Promise<unknown>;
  listProducts?: (data: Record<string, unknown>) => Promise<{ data: unknown[] }>;
  retrieveProduct?: (id: string) => Promise<unknown>;
  listPrices?: (data: Record<string, unknown>) => Promise<{ data: unknown[] }>;
  createProduct?: (data: Record<string, unknown>) => Promise<unknown>;
  createPrice?: (data: Record<string, unknown>) => Promise<unknown>;
} = {}) {
  return {
    customers: {
      create: overrides.createCustomer ?? (async (data: Record<string, unknown>) => ({ id: 'cus_1', ...data })),
      list: async () => ({ data: [] }),
      retrieve: async (id: string) => ({ id }),
    },
    charges: {
      list: overrides.listCharges ?? (async () => ({ data: [] })),
      retrieve: overrides.retrieveCharge ?? (async (id: string) => ({ id, object: 'charge' })),
    },
    paymentIntents: {
      create: overrides.createPaymentIntent ?? (async (data: Record<string, unknown>) => ({ id: 'pi_1', ...data })),
      retrieve: async (id: string) => ({ id }),
    },
    invoices: {
      list: async () => ({ data: [] }),
      retrieve: async (id: string) => ({ id }),
    },
    products: {
      list: overrides.listProducts ?? (async () => ({ data: [] })),
      retrieve: overrides.retrieveProduct ?? (async (id: string) => ({
        id,
        name: 'Kit',
        description: 'Field kit',
        images: [],
        metadata: { sku: 'KIT-1' },
      })),
      create: overrides.createProduct ?? (async (data: Record<string, unknown>) => ({ id: 'prod_1', ...data })),
      update: async (id: string, data: Record<string, unknown>) => ({ id, ...data }),
    },
    prices: {
      list: overrides.listPrices ?? (async (data: Record<string, unknown>) => ({
        data: [
          {
            id: 'price_1',
            product: data.product,
            unit_amount: 2500,
            currency: 'usd',
            recurring: null,
          },
        ],
      })),
      create: overrides.createPrice ?? (async (data: Record<string, unknown>) => ({ id: 'price_1', ...data })),
    },
  } as unknown as Stripe;
}

describe('buildStripeClientOptions', () => {
  it('sets stripeAccount only when the header value is present', () => {
    assert.deepEqual(buildStripeClientOptions(), { apiVersion: '2024-11-20' });
    assert.deepEqual(buildStripeClientOptions(''), { apiVersion: '2024-11-20' });
    assert.deepEqual(buildStripeClientOptions('acct_123'), {
      apiVersion: '2024-11-20',
      stripeAccount: 'acct_123',
    });
  });
});

describe('tools catalog', () => {
  it('registers the money and catalog tools', () => {
    assert.ok(tools.create_payment_intent);
    assert.ok(tools.create_customer);
    assert.ok(tools.sync_catalog);
    assert.deepEqual(tools.create_payment_intent.inputSchema.required, ['amount', 'currency']);
    assert.deepEqual(tools.create_customer.inputSchema.required, ['email']);
  });
});

describe('handleToolCall money paths', () => {
  it('forwards create_payment_intent amount, currency, and optional fields', async () => {
    const calls: Record<string, unknown>[] = [];
    const stripe = mockStripe({
      createPaymentIntent: async (data) => {
        calls.push(data);
        return { id: 'pi_created', ...data };
      },
    });

    const result = await handleToolCall(
      'create_payment_intent',
      { amount: 1999, currency: 'usd', customer: 'cus_1', description: 'Kit' },
      undefined,
      stripe
    );

    assert.deepEqual(calls[0], {
      amount: 1999,
      currency: 'usd',
      customer: 'cus_1',
      description: 'Kit',
    });
    assert.equal((result as { id: string }).id, 'pi_created');
  });

  it('still calls Stripe when required payment fields are missing', async () => {
    const calls: Record<string, unknown>[] = [];
    const stripe = mockStripe({
      createPaymentIntent: async (data) => {
        calls.push(data);
        return data;
      },
    });

    await handleToolCall('create_payment_intent', {}, undefined, stripe);

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.amount, undefined);
    assert.equal(calls[0]?.currency, undefined);
  });

  it('forwards create_customer fields including undefined optionals', async () => {
    const calls: Record<string, unknown>[] = [];
    const stripe = mockStripe({
      createCustomer: async (data) => {
        calls.push(data);
        return { id: 'cus_new', ...data };
      },
    });

    await handleToolCall('create_customer', { email: 'buyer@example.com' }, undefined, stripe);

    assert.deepEqual(calls[0], {
      email: 'buyer@example.com',
      name: undefined,
      description: undefined,
    });
  });

  it('defaults list_charges limit to 10 and forwards a customer filter', async () => {
    const calls: Record<string, unknown>[] = [];
    const stripe = mockStripe({
      listCharges: async (data) => {
        calls.push(data);
        return { data: [] };
      },
    });

    await handleToolCall('list_charges', { customer: 'cus_9' }, undefined, stripe);
    assert.deepEqual(calls[0], { limit: 10, customer: 'cus_9' });
  });

  it('retrieves a charge by id', async () => {
    const stripe = mockStripe({
      retrieveCharge: async (id) => ({ id, paid: true }),
    });

    const result = await handleToolCall('get_charge', { charge_id: 'ch_1' }, undefined, stripe);
    assert.deepEqual(result, { id: 'ch_1', paid: true });
  });
});

describe('handleToolCall catalog paths', () => {
  it('maps list_products to a public catalog payload and defaults limit to 10', async () => {
    const listCalls: Record<string, unknown>[] = [];
    const stripe = mockStripe({
      listProducts: async (data) => {
        listCalls.push(data);
        return {
          data: [
            {
              id: 'prod_1',
              name: 'Tent',
              description: 'Two-person',
              images: ['https://example.com/tent.png'],
              metadata: { sku: 'TENT-1' },
              active: true,
            },
          ],
        };
      },
    });

    const result = await handleToolCall('list_products', {}, undefined, stripe);

    assert.deepEqual(listCalls[0], { limit: 10, active: true });
    assert.deepEqual(result, {
      products: [
        {
          id: 'prod_1',
          name: 'Tent',
          description: 'Two-person',
          images: ['https://example.com/tent.png'],
          metadata: { sku: 'TENT-1' },
        },
      ],
    });
  });

  it('maps get_product prices including unit_amount', async () => {
    const stripe = mockStripe();
    const result = await handleToolCall(
      'get_product',
      { product_id: 'prod_9' },
      undefined,
      stripe
    );

    assert.deepEqual(result, {
      product: {
        id: 'prod_9',
        name: 'Kit',
        description: 'Field kit',
        images: [],
        metadata: { sku: 'KIT-1' },
      },
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
  });

  it('returns created and updated counts from sync_catalog', async () => {
    const file = writeCatalog([{ Name: 'Mug', Price: 12 }]);
    const stripe = mockStripe();

    const result = (await handleToolCall(
      'sync_catalog',
      { file_path: file },
      undefined,
      stripe
    )) as {
      created_count: number;
      updated_count: number;
      created: Array<{ id: string; name: string }>;
    };

    assert.equal(result.created_count, 1);
    assert.equal(result.updated_count, 0);
    assert.equal(result.created[0]?.name, 'Mug');
    assert.equal(result.created[0]?.id, 'prod_1');
  });

  it('rejects unknown tools', async () => {
    await assert.rejects(
      () => handleToolCall('refund_everything', {}, undefined, mockStripe()),
      /Unknown tool: refund_everything/
    );
  });
});
