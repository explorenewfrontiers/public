import assert from 'node:assert/strict';
import http from 'node:http';
import { afterEach, describe, it } from 'node:test';
import type Stripe from 'stripe';
import { createMcpServer } from './index.js';

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

async function listen(server: http.Server): Promise<number> {
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
  options: { method?: string; headers?: http.OutgoingHttpHeaders; body?: string }
): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        method: options.method ?? 'POST',
        path: '/',
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

const initializeBody = JSON.stringify({ jsonrpc: '2.0', method: 'initialize', id: 1 });

describe('MCP HTTP server', () => {
  it('rejects non-POST methods', async () => {
    const port = await listen(createMcpServer({ apiKey: undefined }));
    const response = await request(port, { method: 'GET' });
    assert.equal(response.status, 405);
    assert.deepEqual(response.body, { error: 'Method not allowed' });
  });

  it('returns 401 when a Bearer token is required and missing', async () => {
    const port = await listen(createMcpServer({ apiKey: 'test-key' }));
    const response = await request(port, { body: initializeBody });
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, {
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Unauthorized: Missing or invalid Bearer token' },
    });
  });

  it('returns 401 for an invalid Bearer token', async () => {
    const port = await listen(createMcpServer({ apiKey: 'test-key' }));
    const response = await request(port, {
      headers: { Authorization: 'Bearer wrong' },
      body: initializeBody,
    });
    assert.equal(response.status, 401);
  });

  it('accepts a valid Bearer token', async () => {
    const port = await listen(createMcpServer({ apiKey: 'test-key' }));
    const response = await request(port, {
      headers: { Authorization: 'Bearer test-key' },
      body: initializeBody,
    });
    assert.equal(response.status, 200);
    assert.equal((response.body as { result: { serverInfo: { name: string } } }).result.serverInfo.name, 'stripe-mcp');
  });

  it('allows unauthenticated requests when auth is disabled', async () => {
    const port = await listen(createMcpServer({ apiKey: undefined }));
    const response = await request(port, { body: initializeBody });
    assert.equal(response.status, 200);
  });

  it('returns a JSON-RPC parse error for invalid JSON', async () => {
    const port = await listen(createMcpServer({ apiKey: undefined }));
    const response = await request(port, { body: '{not-json' });
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      jsonrpc: '2.0',
      error: { code: -32700, message: 'Parse error' },
    });
  });

  it('accepts a Stripe-Account header and executes the requested tool', async () => {
    const retrieveIds: string[] = [];
    const stripe = {
      customers: {
        retrieve: async (id: string) => {
          retrieveIds.push(id);
          return { id, object: 'customer' };
        },
      },
    } as unknown as Stripe;

    const port = await listen(createMcpServer({ apiKey: undefined, stripeClient: stripe }));
    const response = await request(port, {
      headers: { 'Stripe-Account': 'acct_123' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call_tool',
        id: 4,
        params: { name: 'get_customer', arguments: { customer_id: 'cus_from_account' } },
      }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(retrieveIds, ['cus_from_account']);
    const parsed = response.body as { result: { text: string } };
    assert.equal(JSON.parse(parsed.result.text).id, 'cus_from_account');
  });
});
