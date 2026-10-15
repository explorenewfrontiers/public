import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  CDN_STRIPE_JS_SRC,
  checkoutUsesRemoteStripeJs,
  htmlImportsNpmStripeJs,
  htmlLoadsCdnStripeJs,
  packageJsonPinsStripeJs,
  STRIPE_JS_NPM_PACKAGE,
} from './stripe-js-npm-pin.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Checkout loads CDN Stripe.js instead of a pinned @stripe/stripe-js build', () => {
  it('neither package.json depends on @stripe/stripe-js', () => {
    assert.equal(packageJsonPinsStripeJs(readRepo('package.json')), false);
    assert.equal(
      packageJsonPinsStripeJs(readRepo('stripe-connect-sample/package.json')),
      false
    );
    assert.equal(STRIPE_JS_NPM_PACKAGE, '@stripe/stripe-js');
  });

  it('catalog and Connect storefront HTML load the floating CDN script', () => {
    const catalog = readRepo('public/index.html');
    const storefront = readRepo('stripe-connect-sample/public/storefront.html');
    const dashboard = readRepo('stripe-connect-sample/public/index.html');

    assert.equal(htmlLoadsCdnStripeJs(catalog), true);
    assert.equal(htmlLoadsCdnStripeJs(storefront), true);
    assert.match(catalog, new RegExp(CDN_STRIPE_JS_SRC.replace(/\//g, '\\/')));
    assert.equal(htmlImportsNpmStripeJs(catalog), false);
    assert.equal(htmlImportsNpmStripeJs(storefront), false);
    assert.equal(htmlImportsNpmStripeJs(dashboard), false);
    assert.equal(
      checkoutUsesRemoteStripeJs({ htmlLoadsCdn: true, packagePinsNpm: false }),
      true
    );
  });
});
