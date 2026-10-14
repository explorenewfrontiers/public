import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  STATIC_PUBLIC_CALL,
  expressStaticHasOptions,
  htmlReferencesCheckoutAssets,
  productionSetsNoStoreOnCheckoutAssets,
  sourceSetsNoStoreOnStatic,
} from './static-cache-control.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Checkout HTML/JS are served without Cache-Control: no-store', () => {
  it('catalog express.static has no cache options', () => {
    const source = readRepo('src/web-server.ts');
    assert.equal(source.includes(STATIC_PUBLIC_CALL), true);
    assert.equal(expressStaticHasOptions(source), false);
    assert.equal(sourceSetsNoStoreOnStatic(source), false);
    assert.equal(productionSetsNoStoreOnCheckoutAssets(), false);
  });

  it('Connect express.static has no cache options', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    assert.equal(source.includes(STATIC_PUBLIC_CALL), true);
    assert.equal(expressStaticHasOptions(source), false);
    assert.equal(sourceSetsNoStoreOnStatic(source), false);
  });

  it('cached shells are the Stripe.js checkout pages', () => {
    assert.equal(htmlReferencesCheckoutAssets(readRepo('public/index.html')), true);
    assert.equal(htmlReferencesCheckoutAssets(readRepo('public/app.js')), true);
    assert.equal(
      htmlReferencesCheckoutAssets(readRepo('stripe-connect-sample/public/storefront.html')),
      true
    );
    assert.match(
      readRepo('stripe-connect-sample/public/storefront.html'),
      /pk_test_51234567890/
    );
  });
});
