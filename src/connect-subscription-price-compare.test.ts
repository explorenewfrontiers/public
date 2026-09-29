import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  readCurrentItemPriceId,
  readPreviousItemPrice,
  subscriptionPriceChanged,
} from './connect-subscription-price-compare.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect subscription price-change comparison', () => {
  it('treats an expanded previous Price object as a change even when the id is unchanged', () => {
    const previous = { id: 'price_same', unit_amount: 1000 };
    assert.equal(subscriptionPriceChanged(previous, 'price_same'), true);
    assert.equal(subscriptionPriceChanged('price_same', 'price_same'), false);
    assert.equal(subscriptionPriceChanged('price_old', 'price_new'), true);
  });

  it('reads previous price as the raw field and current price as .id', () => {
    assert.deepEqual(
      readPreviousItemPrice({
        items: { data: [{ price: { id: 'price_1' } }] },
      }),
      { id: 'price_1' }
    );
    assert.equal(
      readPreviousItemPrice({
        items: { data: [{ price: 'price_1' }] },
      }),
      'price_1'
    );
    assert.equal(
      readCurrentItemPriceId({
        items: { data: [{ price: { id: 'price_1' } }] },
      }),
      'price_1'
    );
    assert.equal(
      readCurrentItemPriceId({
        items: { data: [{ price: 'price_1' }] },
      }),
      undefined
    );
  });
});

describe('Connect subscription price-compare source stays aligned', () => {
  it('compares previous price (no .id) to current price.id', () => {
    const server = readRepo('stripe-connect-sample/server.ts');
    const handlerStart = server.indexOf("case 'customer.subscription.updated'");
    const handlerEnd = server.indexOf("case 'customer.subscription.deleted'");
    const handler = server.slice(handlerStart, handlerEnd);

    assert.ok(handlerStart >= 0);
    assert.match(
      handler,
      /const oldPrice = event\.data\.previous_attributes\.items\.data\[0\]\?\.price;/
    );
    assert.match(
      handler,
      /const newPrice = subscription\.items\.data\[0\]\?\.price\.id;/
    );
    assert.match(handler, /if \(oldPrice !== newPrice\)/);
    assert.equal(handler.includes('oldPrice.id'), false);
    assert.equal(handler.includes('oldPrice?.id'), false);
  });
});
