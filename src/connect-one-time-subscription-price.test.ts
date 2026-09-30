import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  buildConnectedProductPriceData,
  buildSubscriptionLineItem,
  productCreatedUiShowsPriceId,
  productPriceDataIsRecurring,
} from './connect-one-time-subscription-price.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect product prices cannot back subscriptions', () => {
  it('creates one-time default_price_data with no recurring interval', () => {
    const priceData = buildConnectedProductPriceData(1999, 'usd');
    assert.deepEqual(priceData, { unit_amount: 1999, currency: 'usd' });
    assert.equal('recurring' in priceData, false);
    assert.equal(productPriceDataIsRecurring(priceData), false);
  });

  it('still puts that price id on a mode: subscription Checkout Session', () => {
    const session = buildSubscriptionLineItem('price_from_product_create');
    assert.equal(session.mode, 'subscription');
    assert.deepEqual(session.line_items, [
      { price: 'price_from_product_create', quantity: 1 },
    ]);
  });

  it('does not surface a price id in the product-created dashboard copy', () => {
    assert.equal(productCreatedUiShowsPriceId(), false);
  });
});

describe('Connect one-time subscription source stays aligned', () => {
  it('product create has no recurring while subscriptions use mode subscription', () => {
    const server = readRepo('stripe-connect-sample/server.ts');
    const dashboard = readRepo('stripe-connect-sample/public/index.html');

    const priceDataStart = server.indexOf('default_price_data:');
    const priceDataEnd = server.indexOf('},', priceDataStart);
    const priceData = server.slice(priceDataStart, priceDataEnd);
    assert.ok(priceDataStart >= 0);
    assert.match(priceData, /unit_amount: parseInt\(priceInCents\)/);
    assert.match(priceData, /currency: currency \|\| 'usd'/);
    assert.equal(priceData.includes('recurring'), false);

    const subscriptionsAt = server.indexOf("app.post('/api/subscriptions'");
    const subscriptions = server.slice(subscriptionsAt, subscriptionsAt + 1800);
    assert.match(subscriptions, /mode: 'subscription'/);
    assert.match(subscriptions, /price: priceId/);
    assert.equal(subscriptions.includes('price_data:'), false);
    assert.equal(subscriptions.includes('recurring:'), false);

    assert.match(dashboard, /Price ID \(from product creation\)/);
    assert.match(dashboard, /priceInCents: Math\.round\(parseFloat\(price\) \* 100\)/);
    assert.match(dashboard, /<strong>Product ID:<\/strong>/);
    assert.equal(dashboard.includes('<strong>Price ID:</strong>'), false);
    assert.equal(dashboard.includes('result.product.default_price'), false);
  });
});
