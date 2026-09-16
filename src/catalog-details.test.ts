import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  buildAddToCartArgs,
  formatCatalogPrice,
  shouldRedirectToCheckout,
} from './catalog-details.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('catalog product details', () => {
  it('formats a unit_amount in dollars and falls back to N/A', () => {
    assert.equal(formatCatalogPrice({ id: 'price_1', unit_amount: 1999 }), '19.99');
    assert.equal(formatCatalogPrice({ id: 'price_2', unit_amount: 0 }), '0.00');
    assert.equal(formatCatalogPrice(undefined), 'N/A');
  });

  it('still reads price.id when building the Add to Cart action, so a missing price throws', () => {
    assert.deepEqual(buildAddToCartArgs('prod_1', 'Kit', { id: 'price_1', unit_amount: 500 }), {
      productId: 'prod_1',
      priceId: 'price_1',
      name: 'Kit',
      unitAmount: 500,
    });

    assert.throws(
      () => buildAddToCartArgs('prod_1', 'Kit', undefined),
      (error: unknown) => error instanceof TypeError
    );
  });

  it('only redirects to Stripe Checkout when the API returned a sessionId', () => {
    assert.equal(shouldRedirectToCheckout({ sessionId: 'cs_test_1' }), true);
    assert.equal(shouldRedirectToCheckout({}), false);
    assert.equal(shouldRedirectToCheckout({ sessionId: '' }), false);
  });
});

describe('catalog website source stays aligned', () => {
  it('guards the displayed amount but interpolates price.id in the same modal', () => {
    const appJs = fs.readFileSync(path.join(repoRoot, 'public/app.js'), 'utf8');
    assert.match(appJs, /price \? \(price\.unit_amount \/ 100\)\.toFixed\(2\) : 'N\/A'/);
    assert.match(appJs, /addToCart\('\$\{productId\}', '\$\{price\.id\}'/);
    assert.match(appJs, /if \(data\.sessionId\)/);
  });

  it('has no success or cancel pages for storefront checkout redirects', () => {
    const files = fs.readdirSync(path.join(repoRoot, 'public'));
    assert.ok(files.includes('index.html'));
    assert.ok(files.includes('app.js'));
    assert.ok(!files.includes('success.html'));
    assert.ok(!files.includes('cancel.html'));

    const webServer = fs.readFileSync(path.join(repoRoot, 'src/web-server.ts'), 'utf8');
    assert.match(webServer, /\/success\?session_id=\{CHECKOUT_SESSION_ID\}/);
    assert.match(webServer, /\/cancel`/);
  });
});
