import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildStorefrontCheckoutBody,
  buildSubscriptionSessionLookup,
  dollarsToPriceInCents,
  mapConnectedAccountProduct,
} from './storefront-checkout.js';

describe('connected account product mapping', () => {
  it('exposes unit_amount as price and omits priceId / default_price', () => {
    const mapped = mapConnectedAccountProduct({
      id: 'prod_1',
      name: 'Kit',
      description: 'Field kit',
      default_price: { id: 'price_1', unit_amount: 1999, currency: 'usd' },
    });

    assert.deepEqual(mapped, {
      id: 'prod_1',
      name: 'Kit',
      description: 'Field kit',
      price: 1999,
      currency: 'usd',
    });
    assert.equal('priceId' in mapped, false);
    assert.equal('default_price' in mapped, false);
  });

  it('defaults missing expanded prices to 0 usd', () => {
    assert.deepEqual(
      mapConnectedAccountProduct({
        id: 'prod_2',
        name: 'Pass',
        description: null,
      }),
      {
        id: 'prod_2',
        name: 'Pass',
        description: null,
        price: 0,
        currency: 'usd',
      }
    );
  });
});

describe('storefront checkout contract', () => {
  it('sends product.default_price as priceId, which mapped products do not have', () => {
    const mapped = mapConnectedAccountProduct({
      id: 'prod_1',
      name: 'Kit',
      default_price: { id: 'price_1', unit_amount: 500, currency: 'usd' },
    });
    const body = buildStorefrontCheckoutBody('acct_1', mapped as unknown as Record<string, unknown>);

    assert.deepEqual(body, {
      accountId: 'acct_1',
      priceId: undefined,
      quantity: 1,
    });
  });

  it('would succeed only if the storefront still had default_price on the product', () => {
    assert.deepEqual(
      buildStorefrontCheckoutBody('acct_1', { default_price: 'price_1' }),
      { accountId: 'acct_1', priceId: 'price_1', quantity: 1 }
    );
  });
});

describe('dashboard money and subscription redirect', () => {
  it('converts dollar form input to Stripe cents', () => {
    assert.equal(dollarsToPriceInCents('10'), 1000);
    assert.equal(dollarsToPriceInCents('10.99'), 1099);
    assert.equal(dollarsToPriceInCents('0.1'), 10);
    assert.equal(Number.isNaN(dollarsToPriceInCents('')), true);
  });

  it('looks up Checkout session.url via /get-session, which the server does not expose', () => {
    assert.deepEqual(buildSubscriptionSessionLookup('cs_test_1'), {
      endpoint: '/get-session',
      body: { sessionId: 'cs_test_1' },
    });
  });
});

describe('Connect storefront source stays aligned', () => {
  it('still maps products without priceId and checks out with default_price', () => {
    const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
    const server = fs.readFileSync(path.join(dir, 'server.ts'), 'utf8');
    const storefront = fs.readFileSync(path.join(dir, 'public/storefront.html'), 'utf8');
    const dashboard = fs.readFileSync(path.join(dir, 'public/index.html'), 'utf8');

    assert.match(server, /mapConnectedAccountProduct/);
    assert.match(storefront, /priceId: product\.default_price/);
    assert.match(dashboard, /priceInCents: Math\.round\(parseFloat\(price\) \* 100\)/);
    assert.match(dashboard, /fetch\('\/get-session'/);
  });
});
