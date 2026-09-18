import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  catalogSearchMatches,
  renderCatalogProductCard,
  renderConnectProductCard,
} from './catalog-markup.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('catalog product markup interpolation', () => {
  it('interpolates name, description, and id without HTML escaping', () => {
    const html = renderCatalogProductCard({
      id: "prod'onload=alert(1)",
      name: '<img src=x onerror=alert(1)>',
      description: '<script>alert(1)</script>',
    });

    assert.match(html, /onclick="showProductDetails\('prod'onload=alert\(1\)'\)"/);
    assert.match(html, /<div class="product-name"><img src=x onerror=alert\(1\)><\/div>/);
    assert.match(html, /<div class="product-description"><script>alert\(1\)<\/script><\/div>/);
    assert.match(html, /onclick="quickAddToCart\(event, 'prod'onload=alert\(1\)'\)"/);
  });

  it('defaults a missing description to "No description"', () => {
    const html = renderCatalogProductCard({ id: 'prod_1', name: 'Mug' });
    assert.match(html, /<div class="product-description">No description<\/div>/);
  });
});

describe('Connect storefront product markup interpolation', () => {
  it('interpolates merchant-controlled name and description without escaping', () => {
    const html = renderConnectProductCard({
      id: 'prod_1',
      name: '<svg onload=alert(1)>',
      description: '<img src=x onerror=alert(1)>',
      priceId: '',
    });

    assert.match(html, /<div class="product-name"><svg onload=alert\(1\)><\/div>/);
    assert.match(html, /<div class="product-description"><img src=x onerror=alert\(1\)><\/div>/);
    assert.match(html, /data-price-id=""/);
  });
});

describe('catalog search', () => {
  it('matches name or description case-insensitively and skips a missing description', () => {
    const products = [
      { name: 'Trail Tent', description: 'Two-person shelter' },
      { name: 'Mug' },
    ];

    assert.deepEqual(
      catalogSearchMatches(products, 'TENT').map((product) => product.name),
      ['Trail Tent']
    );
    assert.deepEqual(
      catalogSearchMatches(products, 'shelter').map((product) => product.name),
      ['Trail Tent']
    );
    assert.deepEqual(catalogSearchMatches(products, 'mug').map((product) => product.name), ['Mug']);
    assert.deepEqual(catalogSearchMatches(products, 'missing'), []);
  });
});

describe('storefront markup source stays aligned', () => {
  it('still interpolates product fields into HTML strings', () => {
    const appJs = readRepo('public/app.js');
    const storefront = readRepo('stripe-connect-sample/public/storefront.html');

    assert.match(appJs, /onclick="showProductDetails\('\$\{product\.id\}'\)"/);
    assert.match(appJs, /<div class="product-name">\$\{product\.name\}<\/div>/);
    assert.match(appJs, /\$\{product\.description \|\| 'No description'\}/);
    assert.match(appJs, /p\.name\.toLowerCase\(\)\.includes\(query\)/);
    assert.match(
      storefront,
      /<div class="product-name">\$\{product\.name\}<\/div>/
    );
    assert.match(
      storefront,
      /data-price-id="\$\{product\.priceId \|\| ''\}"/
    );
  });
});
