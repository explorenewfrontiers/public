import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  attackerCanSubstituteListedPrice,
  catalogCheckoutLineItems,
  checkoutHandlerLooksUpPrice,
  connectCheckoutLineItem,
  connectSubscriptionLineItem,
  extractRouteHandler,
} from './checkout-untrusted-price-id.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Checkout forwards client price IDs without a server-side lookup', () => {
  it('catalog checkout maps the request priceId onto Stripe line_items.price', () => {
    const listed = 'price_listed_5000';
    const cheaper = 'price_attacker_50';
    const lines = catalogCheckoutLineItems([
      { priceId: cheaper, quantity: 2 },
    ]);

    assert.deepEqual(lines, [{ price: cheaper, quantity: 2 }]);
    assert.equal(
      attackerCanSubstituteListedPrice({
        listedPriceId: listed,
        requestedPriceId: cheaper,
      }),
      true
    );
  });

  it('catalog POST /api/checkout never retrieves the Price before sessions.create', () => {
    const source = readRepo('src/web-server.ts');
    const handler = extractRouteHandler(source, "app.post('/api/checkout'");

    assert.match(handler, /items\.map/);
    assert.match(handler, /price:\s*item\.priceId/);
    assert.match(handler, /checkout\.sessions\.create/);
    assert.equal(checkoutHandlerLooksUpPrice(handler), false);
  });

  it('Connect checkout and subscriptions forward body.priceId with no retrieve', () => {
    const attackerPrice = 'price_from_another_product';
    assert.deepEqual(connectCheckoutLineItem({ priceId: attackerPrice, quantity: 1 }), {
      price: attackerPrice,
      quantity: 1,
    });
    assert.deepEqual(connectSubscriptionLineItem(attackerPrice), {
      price: attackerPrice,
      quantity: 1,
    });

    const source = readRepo('stripe-connect-sample/server.ts');
    const checkout = extractRouteHandler(source, "app.post('/api/checkout'");
    const subscriptions = extractRouteHandler(source, "app.post('/api/subscriptions'");

    assert.match(checkout, /price:\s*priceId/);
    assert.match(subscriptions, /price:\s*priceId/);
    assert.equal(checkoutHandlerLooksUpPrice(checkout), false);
    assert.equal(checkoutHandlerLooksUpPrice(subscriptions), false);
  });
});
