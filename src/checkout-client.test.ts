import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  CONNECT_HARDCODED_PUBLISHABLE_KEY,
  initConnectStorefrontStripe,
  resolveCatalogStripeKey,
} from './checkout-client.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('catalog Stripe.js publishable key', () => {
  it('initializes Stripe with an empty string when window.STRIPE_KEY is missing', () => {
    assert.equal(resolveCatalogStripeKey(undefined), '');
    assert.equal(resolveCatalogStripeKey(''), '');
    assert.equal(resolveCatalogStripeKey(null), '');
  });

  it('uses a provided window.STRIPE_KEY when the server actually injects one', () => {
    assert.equal(resolveCatalogStripeKey('pk_test_live_value'), 'pk_test_live_value');
  });
});

describe('Connect storefront Stripe.js init', () => {
  it('uses the hardcoded placeholder key and omits stripeAccount', () => {
    const init = initConnectStorefrontStripe(CONNECT_HARDCODED_PUBLISHABLE_KEY);
    assert.equal(init.publishableKey, 'pk_test_51234567890');
    assert.equal(init.stripeAccount, undefined);
  });
});

describe('checkout client source stays aligned', () => {
  it('catalog app initializes Stripe from window.STRIPE_KEY which is never set', () => {
    const appJs = readRepo('public/app.js');
    const indexHtml = readRepo('public/index.html');
    const webServer = readRepo('src/web-server.ts');

    assert.match(appJs, /Stripe\(window\.STRIPE_KEY \|\| ''\)/);
    assert.match(appJs, /stripe\.redirectToCheckout\(\{ sessionId: data\.sessionId \}\)/);
    assert.equal(indexHtml.includes('STRIPE_KEY'), false);
    assert.equal(indexHtml.includes('STRIPE_PUBLISHABLE_KEY'), false);
    assert.equal(webServer.includes('STRIPE_KEY'), false);
    assert.equal(webServer.includes('STRIPE_PUBLISHABLE_KEY'), false);
    assert.equal(webServer.includes('res.send('), false);
  });

  it('Connect storefront hardcodes a fake pk and does not pass stripeAccount', () => {
    const storefront = readRepo('stripe-connect-sample/public/storefront.html');
    const server = readRepo('stripe-connect-sample/server.ts');
    const envExample = readRepo('stripe-connect-sample/.env.example');

    assert.match(
      storefront,
      /const stripePublishableKey = 'pk_test_51234567890'/
    );
    assert.match(storefront, /const stripe = Stripe\(stripePublishableKey\)/);
    assert.equal(storefront.includes('stripeAccount'), false);
    assert.equal(storefront.includes('STRIPE_PUBLISHABLE_KEY'), false);
    assert.match(envExample, /STRIPE_PUBLISHABLE_KEY=/);
    assert.match(server, /stripeAccount: accountId/);
    assert.match(server, /checkout\.sessions\.create/);
  });
});
