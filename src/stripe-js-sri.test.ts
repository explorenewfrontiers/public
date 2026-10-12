import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  htmlLoadsStripeJs,
  htmlPinsStripeJsIntegrity,
  htmlSetsStripeJsCrossorigin,
  productionPinsStripeJsSri,
  STRIPE_JS_SRC,
  stripeJsScriptOpenTags,
} from './stripe-js-sri.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('card-entry pages load Stripe.js without SRI', () => {
  it('catalog index.html loads js.stripe.com/v3 with no integrity or crossorigin', () => {
    const html = readRepo('public/index.html');
    assert.equal(htmlLoadsStripeJs(html), true);
    assert.equal(html.includes(STRIPE_JS_SRC), true);
    assert.equal(stripeJsScriptOpenTags(html).length, 1);
    assert.equal(htmlPinsStripeJsIntegrity(html), false);
    assert.equal(htmlSetsStripeJsCrossorigin(html), false);
    assert.equal(productionPinsStripeJsSri(), false);
  });

  it('Connect storefront.html loads js.stripe.com/v3 with no integrity or crossorigin', () => {
    const html = readRepo('stripe-connect-sample/public/storefront.html');
    assert.equal(htmlLoadsStripeJs(html), true);
    assert.equal(html.includes(STRIPE_JS_SRC), true);
    assert.equal(stripeJsScriptOpenTags(html).length, 1);
    assert.equal(htmlPinsStripeJsIntegrity(html), false);
    assert.equal(htmlSetsStripeJsCrossorigin(html), false);
  });

  it('Connect dashboard HTML does not load Stripe.js (storefront is the card page)', () => {
    const html = readRepo('stripe-connect-sample/public/index.html');
    assert.equal(htmlLoadsStripeJs(html), false);
    assert.equal(stripeJsScriptOpenTags(html).length, 0);
  });
});
