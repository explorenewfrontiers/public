import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * Same escaping rules as public/app.js. Catalog product name/description/images
 * are merchant- or spreadsheet-controlled and must not become HTML or JS.
 */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

describe('escapeHtml', () => {
  it('neutralizes a stored XSS payload in a product name', () => {
    assert.equal(
      escapeHtml('Shirt<img src=x onerror="alert(1)">'),
      'Shirt&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'
    );
  });

  it('neutralizes a JS-string breakout used in inline onclick handlers', () => {
    assert.equal(
      escapeHtml("Widget'); alert(document.cookie); //"),
      'Widget&#39;); alert(document.cookie); //'
    );
  });

  it('neutralizes attribute breakout in an image URL', () => {
    assert.equal(
      escapeHtml('https://cdn.example/x.png" onerror="alert(1)'),
      'https://cdn.example/x.png&quot; onerror=&quot;alert(1)'
    );
  });

  it('treats nullish values as empty strings', () => {
    assert.equal(escapeHtml(undefined), '');
    assert.equal(escapeHtml(null), '');
  });
});

describe('catalog storefront product markup', () => {
  const root = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(root, 'public/app.js'), 'utf8');

  it('defines escapeHtml and uses it for catalog-controlled fields', () => {
    assert.match(source, /function escapeHtml/);
    assert.match(source, /escapeHtml\(product\.name\)/);
    assert.match(source, /escapeHtml\(product\.description \|\| 'No description'\)/);
    assert.match(source, /escapeHtml\(product\.images\[0\]\)/);
    assert.match(source, /escapeHtml\(item\.name\)/);
  });

  it('does not interpolate raw name, description, or image URLs into innerHTML', () => {
    assert.equal(source.includes('${product.name}'), false);
    assert.equal(source.includes('${product.description || \'No description\'}'), false);
    assert.equal(source.includes('${product.description || \'No description available\'}'), false);
    assert.equal(source.includes('${product.images[0]}'), false);
    assert.equal(source.includes('${item.name}'), false);
  });

  it('does not build Add to Cart handlers by interpolating product fields into onclick', () => {
    assert.equal(source.includes('onclick="addToCart('), false);
    assert.equal(source.includes("onclick=\"showProductDetails("), false);
    assert.equal(source.includes('onclick="quickAddToCart('), false);
    assert.equal(source.includes('onclick="removeFromCart('), false);
  });
});
