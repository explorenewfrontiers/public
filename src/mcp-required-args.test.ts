import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  mcpEnforcesRequiredFieldsAtRuntime,
  MCP_CREATE_PAYMENT_INTENT_REQUIRED,
  MCP_RETRIEVE_ID_FIELDS,
  MCP_SYNC_CATALOG_REQUIRED,
  paymentIntentCreateParams,
  retrieveIdFromToolInput,
  syncCatalogFilePath,
} from './mcp-required-args.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('MCP required argument contracts', () => {
  it('forwards undefined retrieve IDs and money fields when required args are omitted', () => {
    const empty = {};
    assert.equal(retrieveIdFromToolInput('get_customer', empty), undefined);
    assert.equal(retrieveIdFromToolInput('get_charge', empty), undefined);
    assert.equal(retrieveIdFromToolInput('get_invoice', empty), undefined);
    assert.equal(retrieveIdFromToolInput('get_payment_intent', empty), undefined);
    assert.equal(retrieveIdFromToolInput('get_product', empty), undefined);

    const intent = paymentIntentCreateParams({});
    assert.equal(intent.amount, undefined);
    assert.equal(intent.currency, undefined);
    assert.deepEqual([...MCP_CREATE_PAYMENT_INTENT_REQUIRED], ['amount', 'currency']);

    assert.equal(syncCatalogFilePath({}), undefined);
    assert.deepEqual([...MCP_SYNC_CATALOG_REQUIRED], ['file_path']);
    assert.equal(mcpEnforcesRequiredFieldsAtRuntime(), false);
    assert.deepEqual(Object.values(MCP_RETRIEVE_ID_FIELDS), [
      'customer_id',
      'charge_id',
      'invoice_id',
      'payment_intent_id',
      'product_id',
    ]);
  });
});

describe('MCP required argument source stays aligned', () => {
  it('schemas list required fields but handlers retrieve/create without checking them', () => {
    const index = readRepo('src/index.ts');

    assert.match(index, /required: \['customer_id'\]/);
    assert.match(index, /required: \['charge_id'\]/);
    assert.match(index, /required: \['invoice_id'\]/);
    assert.match(index, /required: \['payment_intent_id'\]/);
    assert.match(index, /required: \['product_id'\]/);
    assert.match(index, /required: \['amount', 'currency'\]/);
    assert.match(index, /required: \['file_path'\]/);

    assert.match(index, /client\.customers\.retrieve\(input\.customer_id as string\)/);
    assert.match(index, /client\.charges\.retrieve\(input\.charge_id as string\)/);
    assert.match(index, /client\.invoices\.retrieve\(input\.invoice_id as string\)/);
    assert.match(
      index,
      /client\.paymentIntents\.retrieve\(input\.payment_intent_id as string\)/
    );
    assert.match(index, /getProductWithPrices\(client, input\.product_id as string\)/);
    assert.match(index, /amount: input\.amount as number/);
    assert.match(index, /currency: input\.currency as string/);
    assert.match(index, /const filePath = input\.file_path as string/);

    const handleStart = index.indexOf('async function handleToolCall(');
    const handleEnd = index.indexOf('function validateAuth(', handleStart);
    const handler = index.slice(handleStart, handleEnd);
    assert.equal(handler.includes('Invalid params'), false);
    assert.equal(handler.includes('-32602'), false);
    assert.equal(handler.includes('inputSchema.required'), false);
  });
});
