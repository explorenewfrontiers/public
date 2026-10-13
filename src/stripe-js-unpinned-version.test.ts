import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  FLOATING_STRIPE_JS_SRC,
  htmlPinsStripeJsVersionedUrl,
  htmlUsesFloatingStripeJsChannel,
  productionPinsStripeJsVersion,
  stripeJsScriptSrcs,
} from './stripe-js-unpinned-version.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('card-entry pages load the floating Stripe.js /v3/ channel', () => {
  it('catalog index.html uses https://js.stripe.com/v3/ with no versioned URL', () => {
    const html = readRepo('public/index.html');
    const srcs = stripeJsScriptSrcs(html);
    assert.deepEqual(srcs, [FLOATING_STRIPE_JS_SRC]);
    assert.equal(htmlUsesFloatingStripeJsChannel(html), true);
    assert.equal(htmlPinsStripeJsVersionedUrl(html), false);
    assert.equal(productionPinsStripeJsVersion(), false);
  });

  it('Connect storefront.html uses https://js.stripe.com/v3/ with no versioned URL', () => {
    const html = readRepo('stripe-connect-sample/public/storefront.html');
    const srcs = stripeJsScriptSrcs(html);
    assert.deepEqual(srcs, [FLOATING_STRIPE_JS_SRC]);
    assert.equal(htmlUsesFloatingStripeJsChannel(html), true);
    assert.equal(htmlPinsStripeJsVersionedUrl(html), false);
  });

  it('Connect dashboard HTML does not load Stripe.js', () => {
    const html = readRepo('stripe-connect-sample/public/index.html');
    assert.deepEqual(stripeJsScriptSrcs(html), []);
    assert.equal(htmlUsesFloatingStripeJsChannel(html), false);
    assert.equal(htmlPinsStripeJsVersionedUrl(html), false);
  });
});
