import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type Stripe from 'stripe';
import {
  handleBillingToolCall,
  isBillingTool,
  listCustomersParams,
  listInvoicesParams,
} from './billing-tools.js';

function mockStripe(overrides: {
  listCustomers?: (params: Record<string, unknown>) => Promise<unknown>;
  retrieveCustomer?: (id: string) => Promise<unknown>;
  listInvoices?: (params: Record<string, unknown>) => Promise<unknown>;
  retrieveInvoice?: (id: string) => Promise<unknown>;
  retrievePaymentIntent?: (id: string) => Promise<unknown>;
} = {}): Stripe {
  return {
    customers: {
      list: overrides.listCustomers ?? (async () => ({ data: [] })),
      retrieve: overrides.retrieveCustomer ?? (async (id: string) => ({ id })),
    },
    invoices: {
      list: overrides.listInvoices ?? (async () => ({ data: [] })),
      retrieve: overrides.retrieveInvoice ?? (async (id: string) => ({ id })),
    },
    paymentIntents: {
      retrieve: overrides.retrievePaymentIntent ?? (async (id: string) => ({ id })),
    },
  } as unknown as Stripe;
}

describe('billing tool params', () => {
  it('defaults list_customers limit to 10 and forwards starting_after', () => {
    assert.deepEqual(listCustomersParams({}), {
      limit: 10,
      starting_after: undefined,
    });
    assert.deepEqual(listCustomersParams({ limit: 0, starting_after: 'cus_last' }), {
      limit: 10,
      starting_after: 'cus_last',
    });
    assert.deepEqual(listCustomersParams({ limit: 25, starting_after: 'cus_25' }), {
      limit: 25,
      starting_after: 'cus_25',
    });
  });

  it('defaults list_invoices limit to 10 and forwards a customer filter', () => {
    assert.deepEqual(listInvoicesParams({}), {
      limit: 10,
      customer: undefined,
    });
    assert.deepEqual(listInvoicesParams({ customer: 'cus_1' }), {
      limit: 10,
      customer: 'cus_1',
    });
    assert.deepEqual(listInvoicesParams({ limit: 3, customer: 'cus_2' }), {
      limit: 3,
      customer: 'cus_2',
    });
  });
});

describe('handleBillingToolCall', () => {
  it('lists customers with pagination params', async () => {
    const seen: Record<string, unknown>[] = [];
    const stripe = mockStripe({
      listCustomers: async (params) => {
        seen.push(params);
        return { data: [{ id: 'cus_1' }] };
      },
    });

    const result = await handleBillingToolCall(stripe, 'list_customers', {
      limit: 5,
      starting_after: 'cus_0',
    });

    assert.deepEqual(seen, [{ limit: 5, starting_after: 'cus_0' }]);
    assert.deepEqual(result, { data: [{ id: 'cus_1' }] });
  });

  it('retrieves a customer by id', async () => {
    const seen: string[] = [];
    const stripe = mockStripe({
      retrieveCustomer: async (id) => {
        seen.push(id);
        return { id, email: 'buyer@example.com' };
      },
    });

    const result = await handleBillingToolCall(stripe, 'get_customer', {
      customer_id: 'cus_abc',
    });

    assert.deepEqual(seen, ['cus_abc']);
    assert.deepEqual(result, { id: 'cus_abc', email: 'buyer@example.com' });
  });

  it('lists invoices filtered by customer', async () => {
    const seen: Record<string, unknown>[] = [];
    const stripe = mockStripe({
      listInvoices: async (params) => {
        seen.push(params);
        return { data: [{ id: 'in_1' }] };
      },
    });

    const result = await handleBillingToolCall(stripe, 'list_invoices', {
      customer: 'cus_pay',
    });

    assert.deepEqual(seen, [{ limit: 10, customer: 'cus_pay' }]);
    assert.deepEqual(result, { data: [{ id: 'in_1' }] });
  });

  it('retrieves an invoice by id', async () => {
    const seen: string[] = [];
    const stripe = mockStripe({
      retrieveInvoice: async (id) => {
        seen.push(id);
        return { id, paid: true };
      },
    });

    const result = await handleBillingToolCall(stripe, 'get_invoice', {
      invoice_id: 'in_99',
    });

    assert.deepEqual(seen, ['in_99']);
    assert.deepEqual(result, { id: 'in_99', paid: true });
  });

  it('retrieves a payment intent by id', async () => {
    const seen: string[] = [];
    const stripe = mockStripe({
      retrievePaymentIntent: async (id) => {
        seen.push(id);
        return { id, amount: 2500 };
      },
    });

    const result = await handleBillingToolCall(stripe, 'get_payment_intent', {
      payment_intent_id: 'pi_99',
    });

    assert.deepEqual(seen, ['pi_99']);
    assert.deepEqual(result, { id: 'pi_99', amount: 2500 });
  });

  it('still calls Stripe when required retrieve ids are missing', async () => {
    const seen: Array<string | undefined> = [];
    const stripe = mockStripe({
      retrieveCustomer: async (id) => {
        seen.push(id);
        return { id };
      },
    });

    await handleBillingToolCall(stripe, 'get_customer', {});
    assert.deepEqual(seen, [undefined]);
  });

  it('only treats billing tools as billing tools', () => {
    assert.equal(isBillingTool('list_customers'), true);
    assert.equal(isBillingTool('get_payment_intent'), true);
    assert.equal(isBillingTool('create_payment_intent'), false);
    assert.equal(isBillingTool('unknown'), false);
  });
});

describe('MCP server source stays aligned', () => {
  it('delegates customer, invoice, and payment-intent retrieve tools', () => {
    const sourcePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/index.ts');
    const source = fs.readFileSync(sourcePath, 'utf8');
    assert.match(source, /handleBillingToolCall/);
    assert.match(source, /isBillingTool/);
    assert.match(source, /starting_after/);
  });
});
