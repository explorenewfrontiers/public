import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  catalogListChecksResponseOk,
  catalogProductsFromListResponse,
  connectStorefrontProductsFromListResponse,
} from './catalog-list-http-errors.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('catalog list HTTP error handling', () => {
  it('treats a failed list payload as an empty catalog', () => {
    const failed = catalogProductsFromListResponse(false, {
      error: 'Invalid API Key provided',
    });
    assert.deepEqual(failed, []);
    assert.equal(catalogListChecksResponseOk(), false);

    const ok = catalogProductsFromListResponse(true, {
      products: [{ id: 'prod_1' }],
    });
    assert.deepEqual(ok, [{ id: 'prod_1' }]);
  });

  it('Connect storefront throws on a non-OK list response', () => {
    assert.throws(
      () =>
        connectStorefrontProductsFromListResponse(false, {
          error: 'Invalid API Key provided',
        }),
      /Failed to load products/
    );
    assert.deepEqual(
      connectStorefrontProductsFromListResponse(true, { products: [{ id: 'prod_1' }] }),
      [{ id: 'prod_1' }]
    );
  });
});

describe('catalog list HTTP error source stays aligned', () => {
  it('app.js skips response.ok on /api/products while storefront.html checks it', () => {
    const appJs = readRepo('public/app.js');
    const storefront = readRepo('stripe-connect-sample/public/storefront.html');

    const loadStart = appJs.indexOf('async function loadProducts()');
    const loadEnd = appJs.indexOf('function renderProducts', loadStart);
    const loadProducts = appJs.slice(loadStart, loadEnd);
    assert.match(loadProducts, /fetch\('\/api\/products\?limit=50'\)/);
    assert.match(loadProducts, /products = data\.products \|\| \[\]/);
    assert.equal(loadProducts.includes('response.ok'), false);

    assert.match(storefront, /if \(!response\.ok\) \{\s*throw new Error\('Failed to load products'\)/);
  });
});
