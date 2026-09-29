import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  CHECKOUT_CLIENT_REDIRECT,
  catalogCheckoutJson,
  checkoutResponseIncludesUrl,
  connectCheckoutJson,
} from './checkout-session-url.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Checkout APIs drop session.url', () => {
  it('Connect and catalog JSON omit the hosted Checkout URL', () => {
    const session = {
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/c/pay/cs_test_123',
    };

    const connectBody = connectCheckoutJson(session);
    const catalogBody = catalogCheckoutJson(session);

    assert.equal(connectBody.sessionId, 'cs_test_123');
    assert.equal(catalogBody.sessionId, 'cs_test_123');
    assert.equal(checkoutResponseIncludesUrl(connectBody), false);
    assert.equal(checkoutResponseIncludesUrl(catalogBody), false);
    assert.equal(CHECKOUT_CLIENT_REDIRECT, 'redirectToCheckout');
  });
});

describe('Checkout session.url source stays aligned', () => {
  it('servers return sessionId only and clients call redirectToCheckout', () => {
    const connectServer = readRepo('stripe-connect-sample/server.ts');
    const catalogServer = readRepo('src/web-server.ts');
    const storefront = readRepo('stripe-connect-sample/public/storefront.html');
    const appJs = readRepo('public/app.js');

    const connectCheckout = connectServer.slice(
      connectServer.indexOf("app.post('/api/checkout'"),
      connectServer.indexOf("app.post('/api/subscriptions'")
    );
    assert.match(connectCheckout, /sessionId:\s*session\.id/);
    assert.equal(connectCheckout.includes('session.url'), false);

    const catalogCheckout = catalogServer.slice(catalogServer.indexOf("app.post('/api/checkout'"));
    assert.match(catalogCheckout, /sessionId:\s*session\.id/);
    assert.equal(catalogCheckout.includes('session.url'), false);

    assert.match(storefront, /stripe\.redirectToCheckout\(\{\s*sessionId:\s*data\.sessionId/);
    assert.equal(storefront.includes('data.url'), false);
    assert.match(appJs, /stripe\.redirectToCheckout\(\{\s*sessionId:\s*data\.sessionId/);
    assert.equal(appJs.includes('data.url'), false);
  });
});
