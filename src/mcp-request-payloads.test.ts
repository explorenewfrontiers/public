import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  jsonRpcMethodOfBody,
  listCustomersStripeParams,
  mcpHttpCapsRequestBody,
  parseErrorRpcBody,
  paymentIntentStripeParams,
  resolveToolArguments,
  stripeAccountFromHeader,
  unauthorizedRpcBody,
} from './mcp-request-payloads.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('MCP request payload contracts', () => {
  it('forwards non-object call_tool arguments instead of defaulting to {}', () => {
    assert.deepEqual(resolveToolArguments(undefined), {});
    assert.deepEqual(resolveToolArguments(null), {});
    assert.deepEqual(resolveToolArguments(0), {});
    assert.equal(resolveToolArguments('not-an-object'), 'not-an-object');
    assert.deepEqual(resolveToolArguments(['limit', 5]), ['limit', 5]);
    assert.deepEqual(resolveToolArguments({ limit: 3 }), { limit: 3 });
  });

  it('includes undefined optional Stripe filters and raw currency', () => {
    const listed = listCustomersStripeParams({});
    assert.equal(listed.limit, 10);
    assert.equal(listed.starting_after, undefined);
    assert.equal('starting_after' in listed, true);

    const intent = paymentIntentStripeParams({
      amount: 500,
      currency: 'USD',
    });
    assert.equal(intent.amount, 500);
    assert.equal(intent.currency, 'USD');
    assert.equal(intent.customer, undefined);
    assert.equal(intent.currency, intent.currency.toUpperCase());
  });

  it('passes a duplicate Stripe-Account header array through unchanged', () => {
    assert.equal(stripeAccountFromHeader('acct_1'), 'acct_1');
    assert.deepEqual(stripeAccountFromHeader(['acct_1', 'acct_2']), [
      'acct_1',
      'acct_2',
    ]);
    assert.equal(stripeAccountFromHeader(undefined), undefined);
  });

  it('omits JSON-RPC id on 401 and parse errors and does not cap the body', () => {
    const unauthorized = unauthorizedRpcBody();
    const parseError = parseErrorRpcBody();
    assert.equal('id' in unauthorized, false);
    assert.equal('id' in parseError, false);
    assert.equal(unauthorized.error.code, -32600);
    assert.equal(parseError.error.code, -32700);
    assert.equal(mcpHttpCapsRequestBody(), false);
  });

  it('treats a JSON-RPC batch array as a single request with no method', () => {
    const batch = [
      { jsonrpc: '2.0', method: 'initialize', id: 1 },
      { jsonrpc: '2.0', method: 'list_tools', id: 2 },
    ];
    assert.equal(jsonRpcMethodOfBody(batch), undefined);
    assert.equal(jsonRpcMethodOfBody({ method: 'initialize' }), 'initialize');
  });
});

describe('MCP request payload source stays aligned', () => {
  it('uses arguments || {}, casts optional Stripe fields, and concatenates the body', () => {
    const index = readRepo('src/index.ts');

    assert.match(index, /params\.arguments \|\| \{\}/);
    assert.match(
      index,
      /starting_after: input\.starting_after as string/
    );
    assert.match(index, /currency: input\.currency as string/);
    assert.match(
      index,
      /const stripeAccount = req\.headers\['stripe-account'\] as string \| undefined/
    );
    assert.match(index, /body \+= chunk\.toString\(\)/);
    assert.equal(index.includes('toLowerCase()'), false);
    assert.equal(/content-length/i.test(index), false);
    assert.equal(index.includes('MAX_BODY'), false);

    const unauthAt = index.indexOf('Unauthorized: Missing or invalid Bearer token');
    const unauthWindow = index.slice(unauthAt - 180, unauthAt + 40);
    assert.equal(unauthWindow.includes('id:'), false);
    const parseAt = index.indexOf("message: 'Parse error'");
    const parseWindow = index.slice(parseAt - 140, parseAt + 40);
    assert.equal(parseWindow.includes('id:'), false);
  });
});
