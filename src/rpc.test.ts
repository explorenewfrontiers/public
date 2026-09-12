import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type Stripe from 'stripe';
import { handleRequest, handleToolCall, tools } from './index.js';

function mockStripe(overrides: {
  retrieveCustomer?: (id: string) => Promise<unknown>;
} = {}) {
  return {
    customers: {
      retrieve: overrides.retrieveCustomer ?? (async (id: string) => ({ id, object: 'customer' })),
      list: async () => ({ data: [] }),
      create: async (data: Record<string, unknown>) => ({ id: 'cus_1', ...data }),
    },
    charges: { list: async () => ({ data: [] }), retrieve: async (id: string) => ({ id }) },
    paymentIntents: { create: async (data: Record<string, unknown>) => data, retrieve: async (id: string) => ({ id }) },
    invoices: { list: async () => ({ data: [] }), retrieve: async (id: string) => ({ id }) },
    products: { list: async () => ({ data: [] }), retrieve: async (id: string) => ({ id, name: 'P' }) },
    prices: { list: async () => ({ data: [] }), create: async () => ({ id: 'price_1' }) },
  } as unknown as Stripe;
}

describe('handleRequest protocol', () => {
  it('returns server info for initialize', async () => {
    const response = await handleRequest({ jsonrpc: '2.0', method: 'initialize', id: 1 });
    assert.equal(response.id, 1);
    assert.deepEqual(response.result, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'stripe-mcp', version: '1.0.0' },
    });
  });

  it('lists registered tools including catalog and customer tools', async () => {
    const response = await handleRequest({ jsonrpc: '2.0', method: 'list_tools', id: 'tools' });
    const listed = response.result as { tools: Array<{ name: string }> };
    const names = listed.tools.map((tool) => tool.name).sort();
    assert.deepEqual(names, Object.keys(tools).sort());
    assert.ok(names.includes('sync_catalog'));
    assert.ok(names.includes('list_customers'));
    assert.ok(names.includes('create_payment_intent'));
  });

  it('returns Method not found for unknown RPC methods', async () => {
    const response = await handleRequest({ jsonrpc: '2.0', method: 'not_a_method', id: 7 });
    assert.deepEqual(response.error, { code: -32601, message: 'Method not found' });
    assert.equal(response.id, 7);
  });

  it('returns Tool not found for an unknown tool name', async () => {
    const response = await handleRequest({
      jsonrpc: '2.0',
      method: 'call_tool',
      id: 8,
      params: { name: 'delete_everything', arguments: {} },
    });
    assert.deepEqual(response.error, { code: -32601, message: 'Tool not found' });
  });

  it('returns Tool not found when the tool name is missing', async () => {
    const response = await handleRequest({
      jsonrpc: '2.0',
      method: 'call_tool',
      id: 9,
      params: { arguments: {} },
    });
    assert.deepEqual(response.error, { code: -32601, message: 'Tool not found' });
  });

  it('wraps a successful tool call as a JSON text result', async () => {
    const response = await handleRequest(
      {
        jsonrpc: '2.0',
        method: 'call_tool',
        id: 2,
        params: { name: 'get_customer', arguments: { customer_id: 'cus_123' } },
      },
      undefined,
      mockStripe()
    );

    assert.equal(response.id, 2);
    const result = response.result as { type: string; text: string };
    assert.equal(result.type, 'text');
    assert.deepEqual(JSON.parse(result.text), { id: 'cus_123', object: 'customer' });
  });

  it('maps tool failures to JSON-RPC internal errors', async () => {
    const response = await handleRequest(
      {
        jsonrpc: '2.0',
        method: 'call_tool',
        id: 3,
        params: { name: 'get_customer', arguments: { customer_id: 'cus_missing' } },
      },
      undefined,
      mockStripe({
        retrieveCustomer: async () => {
          throw new Error('No such customer');
        },
      })
    );

    assert.deepEqual(response.error, { code: -32603, message: 'No such customer' });
    assert.equal(response.id, 3);
  });
});

describe('handleToolCall', () => {
  it('rejects unknown tools', async () => {
    await assert.rejects(
      () => handleToolCall('not_real', {}, undefined, mockStripe()),
      /Unknown tool: not_real/
    );
  });

  it('defaults list limits to 10', async () => {
    const listArgs: Record<string, unknown>[] = [];
    const stripe = {
      ...mockStripe(),
      customers: {
        list: async (args: Record<string, unknown>) => {
          listArgs.push(args);
          return { data: [] };
        },
      },
    } as unknown as Stripe;

    await handleToolCall('list_customers', {}, undefined, stripe);
    assert.equal(listArgs[0]?.limit, 10);
  });
});
