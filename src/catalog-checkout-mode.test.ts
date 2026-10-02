import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  catalogCheckoutSessionParams,
  defaultPriceIdOf,
  selectWebsitePrice,
  stripeAllowsPriceInCheckoutMode,
  type CatalogPrice,
} from './catalog-checkout-mode.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

const oneTime: CatalogPrice = {
  id: 'price_once',
  unit_amount: 1999,
  recurring: null,
};

const monthly: CatalogPrice = {
  id: 'price_month',
  unit_amount: 999,
  recurring: { interval: 'month' },
};

describe('catalog website price pick vs Checkout mode', () => {
  it('uses prices[0] even when default_price is a later one-time price', () => {
    const prices = [monthly, oneTime];
    const picked = selectWebsitePrice(prices);
    const defaultId = defaultPriceIdOf({
      id: 'prod_1',
      default_price: 'price_once',
    });

    assert.equal(picked?.id, 'price_month');
    assert.equal(defaultId, 'price_once');
    assert.notEqual(picked?.id, defaultId);
  });

  it('always builds payment-mode Checkout, which Stripe rejects for recurring prices', () => {
    const session = catalogCheckoutSessionParams([
      { priceId: monthly.id, quantity: 1 },
    ]);

    assert.equal(session.mode, 'payment');
    assert.deepEqual(session.payment_method_types, ['card']);
    assert.equal(session.line_items[0]?.price, 'price_month');
    assert.equal(
      stripeAllowsPriceInCheckoutMode(session.mode, monthly),
      false
    );
    assert.equal(
      stripeAllowsPriceInCheckoutMode(session.mode, oneTime),
      true
    );
  });
});

describe('catalog checkout mode source stays aligned', () => {
  it('website takes prices[0] and web-server Checkout is mode payment', () => {
    const appJs = readRepo('public/app.js');
    const webServer = readRepo('src/web-server.ts');
    const catalog = readRepo('src/catalog.ts');

    assert.equal(appJs.includes('data.prices[0]'), true);
    assert.equal(appJs.includes('default_price'), false);
    assert.equal(appJs.includes('recurring'), false);

    assert.match(
      webServer,
      /mode:\s*'payment'/
    );
    assert.equal(webServer.includes("mode: 'subscription'"), false);
    assert.equal(webServer.includes('recurring'), true);

    assert.match(
      catalog,
      /prices:\s*prices\.data/
    );
    assert.equal(catalog.includes('default_price'), false);
  });
});
