import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import Stripe from 'stripe';
import {
  validateAuth,
  handleRequest,
  getStripeClient,
  createMcpServer,
  JSONRPCRequest,
} from './mcp.js';

function withEnv(name: string, value: string | undefined, fn: () => void | Promise<void>): Promise<void> | void {
  const previous = process.env[name];
  const restore = () => {
    if (previous === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = previous;
    }
  };

  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }

  try {
    const result = fn();
    if (result && typeof (result as Promise<void>).then === 'function') {
      return (result as Promise<void>).finally(restore);
    }
  } catch (error) {
    restore();
    throw error;
  }

  restore();
}

async function listen(server: http.Server): Promise<string> {
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

async function closeServer(server: http.Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

describe('validateAuth', { concurrency: false }, () => {
  it('allows every request when MCP_API_KEY is unset', () => {
    return withEnv('MCP_API_KEY', undefined, () => {
      assert.equal(validateAuth(undefined), true);
      assert.equal(validateAuth('Bearer anything'), true);
    });
  });

  it('rejects missing or non-Bearer headers when a key is set', () => {
    return withEnv('MCP_API_KEY', 'secret-token', () => {
      assert.equal(validateAuth(undefined), false);
      assert.equal(validateAuth(''), false);
      assert.equal(validateAuth('Basic secret-token'), false);
      assert.equal(validateAuth('Bearer'), false);
      assert.equal(validateAuth('Bearer wrong'), false);
    });
  });

  it('accepts an exact Bearer token match', () => {
    return withEnv('MCP_API_KEY', 'secret-token', () => {
      assert.equal(validateAuth('Bearer secret-token'), true);
    });
  });
});

describe('getStripeClient', () => {
  it('sets Stripe-Account on the client when a connected account is provided', () => {
    type StripeWithApiField = Stripe & { getApiField: (key: string) => unknown };
    const connected = getStripeClient('acct_connected') as StripeWithApiField;
    const platform = getStripeClient() as StripeWithApiField;

    assert.equal(connected.getApiField('stripeAccount'), 'acct_connected');
    assert.equal(platform.getApiField('stripeAccount'), null);
  });
});

describe('handleRequest JSON-RPC', () => {
  it('returns protocol metadata for initialize', async () => {
    const response = await handleRequest({ jsonrpc: '2.0', method: 'initialize', id: 'init-1' });
    assert.equal(response.id, 'init-1');
    assert.equal(response.error, undefined);
    const result = response.result as {
      protocolVersion: string;
      serverInfo: { name: string; version: string };
    };
    assert.equal(result.protocolVersion, '2024-11-05');
    assert.equal(result.serverInfo.name, 'stripe-mcp');
    assert.equal(result.serverInfo.version, '1.0.0');
  });

  it('lists the catalog, customer, and payment tools', async () => {
    const response = await handleRequest({ jsonrpc: '2.0', method: 'list_tools', id: 2 });
    const result = response.result as { tools: Array<{ name: string }> };
    const names = result.tools.map((tool) => tool.name).sort();
    assert.deepEqual(names, [
      'create_customer',
      'create_payment_intent',
      'get_charge',
      'get_customer',
      'get_invoice',
      'get_payment_intent',
      'get_product',
      'list_charges',
      'list_customers',
      'list_invoices',
      'list_products',
      'sync_catalog',
    ]);
  });

  it('returns Method not found for unknown RPC methods', async () => {
    const response = await handleRequest({ jsonrpc: '2.0', method: 'not_a_method', id: 3 });
    assert.equal(response.error?.code, -32601);
    assert.equal(response.error?.message, 'Method not found');
    assert.equal(response.id, 3);
  });

  it('returns Tool not found for unknown or missing tool names', async () => {
    const unknown = await handleRequest({
      jsonrpc: '2.0',
      method: 'call_tool',
      params: { name: 'delete_everything', arguments: {} },
      id: 4,
    });
    assert.equal(unknown.error?.code, -32601);
    assert.equal(unknown.error?.message, 'Tool not found');

    const missing = await handleRequest({
      jsonrpc: '2.0',
      method: 'call_tool',
      params: { arguments: {} },
      id: 5,
    } as JSONRPCRequest);
    assert.equal(missing.error?.code, -32601);
    assert.equal(missing.error?.message, 'Tool not found');
  });

  it('surfaces tool failures as JSON-RPC internal errors', async () => {
    const response = await handleRequest({
      jsonrpc: '2.0',
      method: 'call_tool',
      params: {
        name: 'sync_catalog',
        arguments: { file_path: '/tmp/stripe-mcp-missing-catalog.xlsx' },
      },
      id: 6,
    });
    assert.equal(response.id, 6);
    assert.equal(response.error?.code, -32603);
    assert.equal(typeof response.error?.message, 'string');
    assert.notEqual(response.error?.message, '');
  });
});

describe('MCP HTTP transport', { concurrency: false }, () => {
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    server = createMcpServer();
    baseUrl = await listen(server);
  });

  after(async () => {
    await closeServer(server);
  });

  beforeEach(() => {
    delete process.env.MCP_API_KEY;
  });

  afterEach(() => {
    delete process.env.MCP_API_KEY;
  });

  it('rejects non-POST methods', async () => {
    const response = await fetch(baseUrl, { method: 'GET' });
    assert.equal(response.status, 405);
    const body = await response.json();
    assert.deepEqual(body, { error: 'Method not allowed' });
  });

  it('returns a JSON-RPC parse error for invalid JSON', async () => {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not-json',
    });
    assert.equal(response.status, 400);
    const body = (await response.json()) as { error: { code: number; message: string } };
    assert.equal(body.error.code, -32700);
    assert.equal(body.error.message, 'Parse error');
  });

  it('returns 401 when a Bearer token is required and missing or wrong', async () => {
    process.env.MCP_API_KEY = 'server-secret';

    const missing = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'initialize', id: 1 }),
    });
    assert.equal(missing.status, 401);
    const missingBody = (await missing.json()) as { error: { code: number } };
    assert.equal(missingBody.error.code, -32600);

    const wrong = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer other-secret',
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'initialize', id: 1 }),
    });
    assert.equal(wrong.status, 401);
  });

  it('accepts a valid Bearer token when Stripe-Account is also present', async () => {
    process.env.MCP_API_KEY = 'server-secret';

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer server-secret',
        'stripe-account': 'acct_header',
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'initialize', id: 'ok' }),
    });

    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      id: string;
      result: { serverInfo: { name: string } };
    };
    assert.equal(body.id, 'ok');
    assert.equal(body.result.serverInfo.name, 'stripe-mcp');
  });
});
