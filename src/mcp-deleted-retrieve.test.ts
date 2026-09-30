import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  MCP_RETRIEVE_TOOLS,
  mapDeletedProductForTool,
  mcpRetrieveChecksDeletedFlag,
  mcpRetrieveTreatsAsLive,
} from './mcp-deleted-retrieve.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('MCP retrieve tools accept deleted Stripe objects', () => {
  it('treats a deleted customer as live when deleted is not checked', () => {
    const live = { id: 'cus_live', object: 'customer' };
    const deleted = { id: 'cus_dead', object: 'customer', deleted: true as const };

    assert.equal(mcpRetrieveTreatsAsLive(live), true);
    assert.equal(mcpRetrieveTreatsAsLive(deleted), false);
    assert.equal(mcpRetrieveChecksDeletedFlag(), false);
    assert.deepEqual(MCP_RETRIEVE_TOOLS, [
      'get_customer',
      'get_charge',
      'get_payment_intent',
      'get_invoice',
      'get_product',
    ]);
  });

  it('maps a deleted product stub without rejecting it', () => {
    const mapped = mapDeletedProductForTool({
      id: 'prod_dead',
      object: 'product',
      deleted: true,
    });
    assert.equal(mapped.id, 'prod_dead');
    assert.equal(mapped.name, undefined);
    assert.equal(mapped.deleted, true);
  });
});

describe('MCP retrieve source stays aligned', () => {
  it('returns retrieve results without testing the deleted flag', () => {
    const index = readRepo('src/index.ts');
    const catalog = readRepo('src/catalog.ts');

    for (const tool of MCP_RETRIEVE_TOOLS) {
      assert.match(index, new RegExp(`case '${tool}':`));
    }

    assert.match(index, /const customer = await client\.customers\.retrieve/);
    assert.match(index, /return customer;/);
    assert.match(index, /const charge = await client\.charges\.retrieve/);
    assert.match(index, /return charge;/);
    assert.match(index, /const intent = await client\.paymentIntents\.retrieve/);
    assert.match(index, /const invoice = await client\.invoices\.retrieve/);
    assert.match(catalog, /const product = await stripe\.products\.retrieve\(productId\)/);
    assert.match(catalog, /prices: prices\.data/);

    assert.equal(index.includes('.deleted'), false);
    assert.equal(index.includes("deleted: true"), false);
    assert.equal(catalog.includes('.deleted'), false);
    assert.equal(catalog.includes('if (product.deleted)'), false);
  });
});
