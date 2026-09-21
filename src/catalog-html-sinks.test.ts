import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  mapCatalogCheckoutLineItems,
  renderCatalogCartItem,
  renderCatalogModalCopy,
} from './catalog-html-sinks.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('catalog cart HTML interpolation', () => {
  it('interpolates item name and priceId without escaping', () => {
    const html = renderCatalogCartItem({
      name: '<img src=x onerror=alert(1)>',
      priceId: "price');alert(1);//",
      quantity: 2,
      amount: 500,
    });

    assert.match(html, /<div class="cart-item-name"><img src=x onerror=alert\(1\)><\/div>/);
    assert.match(html, /onclick="removeFromCart\('price'\);alert\(1\);\/\/'\)"/);
    assert.match(html, /\$10\.00/);
  });
});

describe('catalog modal copy interpolation', () => {
  it('interpolates product name and description as HTML', () => {
    const html = renderCatalogModalCopy(
      {
        name: '<svg onload=alert(1)>',
        description: '<script>alert(1)</script>',
      },
      'prod_1',
      { id: 'price_1', unit_amount: 1999 }
    );

    assert.match(html, /<h2><svg onload=alert\(1\)><\/h2>/);
    assert.match(html, /<p><script>alert\(1\)<\/script><\/p>/);
    assert.match(html, /<div class="modal-price">\$19\.99<\/div>/);
    assert.match(
      html,
      /onclick="addToCart\('prod_1', 'price_1', '<svg onload=alert\(1\)>', 1999\)"/
    );
  });

  it('defaults a missing description and still reads price.id', () => {
    const html = renderCatalogModalCopy({ name: 'Mug' }, 'prod_2', {
      id: 'price_2',
      unit_amount: 0,
    });
    assert.match(html, /<p>No description available<\/p>/);
    assert.match(html, /onclick="addToCart\('prod_2', 'price_2', 'Mug', 0\)"/);
  });
});

describe('catalog checkout line-item quantities', () => {
  it('forwards quantity with no integer or positivity check', () => {
    assert.deepEqual(
      mapCatalogCheckoutLineItems([
        { priceId: 'price_a', quantity: 0 },
        { priceId: 'price_b', quantity: -2 },
        { priceId: 'price_c', quantity: 1.5 },
      ]),
      [
        { price: 'price_a', quantity: 0 },
        { price: 'price_b', quantity: -2 },
        { price: 'price_c', quantity: 1.5 },
      ]
    );
  });
});

describe('catalog HTML sink source stays aligned', () => {
  it('still interpolates cart names/priceIds and modal copy into HTML', () => {
    const appJs = readRepo('public/app.js');
    const webServer = readRepo('src/web-server.ts');

    assert.match(appJs, /<div class="cart-item-name">\$\{item\.name\}<\/div>/);
    assert.match(appJs, /onclick="removeFromCart\('\$\{item\.priceId\}'\)"/);
    assert.match(appJs, /<h2>\$\{product\.name\}<\/h2>/);
    assert.match(appJs, /\$\{product\.description \|\| 'No description available'\}/);
    assert.match(
      appJs,
      /onclick="addToCart\('\$\{productId\}', '\$\{price\.id\}', '\$\{product\.name\}', \$\{price\.unit_amount\}\)"/
    );

    assert.match(
      webServer,
      /line_items: items\.map\(\(item\) => \(\{\s*price: item\.priceId,\s*quantity: item\.quantity,/
    );
  });
});
