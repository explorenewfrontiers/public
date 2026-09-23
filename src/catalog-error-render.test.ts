import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  formatCartLineTotal,
  readFirstCatalogPrice,
  sumCartDollars,
} from './catalog-error-render.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('catalog storefront error-body price access', () => {
  it('throws when the API omits prices (error JSON or empty body)', () => {
    assert.throws(() => readFirstCatalogPrice({ error: 'Unknown error' }), TypeError);
    assert.throws(() => readFirstCatalogPrice({}), TypeError);
    assert.equal(readFirstCatalogPrice({ prices: [] }), undefined);
    assert.deepEqual(readFirstCatalogPrice({ prices: [{ id: 'price_1', unit_amount: 500 }] }), {
      id: 'price_1',
      unit_amount: 500,
    });
  });

  it('treats a null unit_amount as $0.00 and an undefined amount as NaN', () => {
    assert.equal(formatCartLineTotal(null, 1), '0.00');
    assert.equal(sumCartDollars([{ amount: null, quantity: 2 }]), 0);
    assert.equal(formatCartLineTotal(undefined, 1), 'NaN');
    assert.equal(Number.isNaN(sumCartDollars([{ amount: undefined, quantity: 2 }])), true);
    assert.equal(sumCartDollars([{ amount: 250, quantity: 2 }]), 5);
  });
});

describe('catalog error-render source stays aligned', () => {
  it('indexes data.prices[0] and product fields without optional chaining', () => {
    const appJs = readRepo('public/app.js');

    assert.match(appJs, /const price = data\.prices\[0\];/);
    assert.equal(appJs.includes('data.prices?.[0]'), false);
    assert.match(appJs, /const product = data\.product;/);
    assert.match(appJs, /product\.images && product\.images\.length > 0/);
    assert.match(
      appJs,
      /\$\{\(\(item\.amount \* item\.quantity\) \/ 100\)\.toFixed\(2\)\}/
    );
    assert.match(
      appJs,
      /cart\.reduce\(\(sum, item\) => sum \+ \(item\.amount \* item\.quantity\) \/ 100, 0\)/
    );
  });
});
