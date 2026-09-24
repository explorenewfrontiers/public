import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  readUpdatedSubscriptionNewPriceId,
  subscriptionUpdatedHandlerThrows,
  webhookAcknowledgesAfterHandlerThrow,
} from './connect-webhook-crash.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect subscription.updated sparse payload crash', () => {
  it('throws when items, data, or price is missing after the previous_attributes gate', () => {
    assert.throws(() => readUpdatedSubscriptionNewPriceId({}), TypeError);
    assert.throws(() => readUpdatedSubscriptionNewPriceId({ items: {} }), TypeError);
    // data[0]?.price.id short-circuits the rest of the chain when [0] is missing
    assert.equal(readUpdatedSubscriptionNewPriceId({ items: { data: [] } }), undefined);
    assert.throws(
      () => readUpdatedSubscriptionNewPriceId({ items: { data: [{}] } }),
      TypeError
    );

    assert.equal(
      readUpdatedSubscriptionNewPriceId({
        items: { data: [{ price: { id: 'price_new' } }] },
      }),
      'price_new'
    );
  });

  it('only enters the price-id read when previous item data is present', () => {
    assert.equal(subscriptionUpdatedHandlerThrows({}, undefined), false);
    assert.equal(
      subscriptionUpdatedHandlerThrows({}, { items: { data: [{ price: 'price_old' }] } }),
      true
    );
    assert.equal(
      subscriptionUpdatedHandlerThrows(
        { items: { data: [{ price: { id: 'price_new' } }] } },
        { items: { data: [{ price: 'price_old' }] } }
      ),
      false
    );
    assert.equal(webhookAcknowledgesAfterHandlerThrow(), false);
  });
});

describe('Connect subscription.updated source stays aligned', () => {
  it('reads price.id without guarding items/data/price and acks only after the switch', () => {
    const server = readRepo('stripe-connect-sample/server.ts');

    assert.match(server, /const newPrice = subscription\.items\.data\[0\]\?\.price\.id;/);
    assert.equal(server.includes('subscription.items?.data'), false);
    assert.equal(server.includes('getSubscriptionNewPriceId'), false);
    assert.match(server, /if \(event\.data\.previous_attributes\?\.items\?\.data\)/);
    assert.match(server, /res\.json\(\{ received: true \}\)/);
  });
});
