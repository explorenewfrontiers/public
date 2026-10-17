import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseCatalogRow } from './catalog.js';

describe('parseCatalogRow', () => {
  it('maps a valid product row', () => {
    const product = parseCatalogRow({
      Name: 'Travel mug',
      Description: 'Insulated',
      Price: 24.99,
      Currency: 'usd',
      SKU: 'MUG-1',
      Category: 'Drinkware',
    });

    assert.ok(product);
    assert.equal(product.name, 'Travel mug');
    assert.equal(product.price, 24.99);
    assert.equal(product.currency, 'usd');
    assert.equal(product.sku, 'MUG-1');
  });

  it('skips a category-only section header so it cannot become a $0 product', () => {
    assert.equal(parseCatalogRow({ Category: 'Electronics' }), null);
  });

  it('skips a named row with a blank Price cell', () => {
    assert.equal(parseCatalogRow({ Name: 'Coming soon widget', Price: '' }), null);
    assert.equal(parseCatalogRow({ Name: 'Coming soon widget' }), null);
  });

  it('skips a price-only row so it cannot become Unnamed Product', () => {
    assert.equal(parseCatalogRow({ Price: 19.99 }), null);
    assert.equal(parseCatalogRow({ Name: '', Price: 19.99 }), null);
    assert.equal(parseCatalogRow({ Name: '   ', Price: 19.99 }), null);
  });

  it('skips zero and negative prices', () => {
    assert.equal(parseCatalogRow({ Name: 'Free leftover', Price: 0 }), null);
    assert.equal(parseCatalogRow({ Name: 'Typo', Price: -5 }), null);
  });

  it('skips non-numeric prices instead of defaulting to 0', () => {
    assert.equal(parseCatalogRow({ Name: 'TBD', Price: 'TBD' }), null);
    assert.equal(parseCatalogRow({ Name: 'TBD', Price: 'abc' }), null);
  });

  it('accepts numeric Excel prices and lowercase price headers', () => {
    const product = parseCatalogRow({ name: 'Sticker', price: 2.5 });
    assert.ok(product);
    assert.equal(product.name, 'Sticker');
    assert.equal(product.price, 2.5);
  });
});
