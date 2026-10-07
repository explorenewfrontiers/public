import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * Same escaping rules as public/storefront.html. A connected-account merchant
 * can set product name/description; those strings are rendered on the
 * platform origin and must not become HTML.
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

  it('neutralizes attribute breakout in a product description', () => {
    assert.equal(
      escapeHtml('Nice" onerror="alert(1)'),
      'Nice&quot; onerror=&quot;alert(1)'
    );
  });

  it('treats nullish values as empty strings', () => {
    assert.equal(escapeHtml(undefined), '');
    assert.equal(escapeHtml(null), '');
  });
});

describe('Connect storefront product cards', () => {
  const root = dirname(fileURLToPath(import.meta.url));
  const html = readFileSync(join(root, 'public/storefront.html'), 'utf8');

  it('defines escapeHtml and uses it for merchant-controlled fields', () => {
    assert.match(html, /function escapeHtml/);
    assert.match(html, /escapeHtml\(product\.name\)/);
    assert.match(html, /escapeHtml\(product\.description \|\| 'No description'\)/);
  });

  it('does not interpolate raw name or description into innerHTML', () => {
    assert.equal(html.includes('${product.name}'), false);
    assert.equal(
      html.includes("${product.description || 'No description'}"),
      false
    );
  });
});
