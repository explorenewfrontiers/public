import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  addToCart,
  cartTotalDollars,
  filterProducts,
  formatUnitAmount,
  removeFromCart,
  toCheckoutItems,
  type CartItem,
} from './storefront-cart.js';

describe('storefront cart', () => {
  it('increments quantity when the same priceId is added again', () => {
    const cart: CartItem[] = [];
    addToCart(cart, 'prod_1', 'price_1', 'Kit', 1500);
    addToCart(cart, 'prod_1', 'price_1', 'Kit', 1500);

    assert.deepEqual(cart, [
      { productId: 'prod_1', priceId: 'price_1', name: 'Kit', amount: 1500, quantity: 2 },
    ]);
    assert.equal(cartTotalDollars(cart), 30);
  });

  it('adds a separate line for a different priceId', () => {
    const cart: CartItem[] = [];
    addToCart(cart, 'prod_1', 'price_1', 'Kit', 1000);
    addToCart(cart, 'prod_2', 'price_2', 'Pass', 250);

    assert.equal(cart.length, 2);
    assert.equal(cartTotalDollars(cart), 12.5);
    assert.deepEqual(toCheckoutItems(cart), [
      { priceId: 'price_1', quantity: 1 },
      { priceId: 'price_2', quantity: 1 },
    ]);
  });

  it('removes a line by priceId and treats an empty cart as $0', () => {
    let cart = addToCart([], 'prod_1', 'price_1', 'Kit', 999);
    cart = removeFromCart(cart, 'price_1');

    assert.deepEqual(cart, []);
    assert.equal(cartTotalDollars(cart), 0);
    assert.deepEqual(toCheckoutItems(cart), []);
  });

  it('forwards the current quantity on checkout, not a reset to 1', () => {
    const cart: CartItem[] = [];
    addToCart(cart, 'prod_1', 'price_1', 'Kit', 400);
    addToCart(cart, 'prod_1', 'price_1', 'Kit', 400);
    addToCart(cart, 'prod_1', 'price_1', 'Kit', 400);

    assert.deepEqual(toCheckoutItems(cart), [{ priceId: 'price_1', quantity: 3 }]);
    assert.equal(cartTotalDollars(cart), 12);
  });
});

describe('catalog search and price display', () => {
  it('filters by name or description, case-insensitively', () => {
    const products = [
      { id: '1', name: "Traveler's Pass", description: 'Day ticket' },
      { id: '2', name: 'Field Kit', description: 'Includes maps' },
    ];

    assert.deepEqual(
      filterProducts(products, 'pass').map((product) => product.id),
      ['1']
    );
    assert.deepEqual(
      filterProducts(products, 'MAP').map((product) => product.id),
      ['2']
    );
    assert.deepEqual(filterProducts(products, 'missing'), []);
  });

  it('formats Stripe unit amounts as dollars and missing prices as N/A', () => {
    assert.equal(formatUnitAmount(1099), '10.99');
    assert.equal(formatUnitAmount(0), '0.00');
    assert.equal(formatUnitAmount(undefined), 'N/A');
  });
});

describe('catalog website source stays aligned', () => {
  it('still groups cart lines by priceId and sends those lines to checkout', () => {
    const sourcePath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '../public/app.js'
    );
    const source = fs.readFileSync(sourcePath, 'utf8');

    assert.match(source, /const existingItem = cart\.find\(\(item\) => item\.priceId === priceId\)/);
    assert.match(source, /existingItem\.quantity \+= 1/);
    assert.match(source, /item\.amount \* item\.quantity\) \/ 100/);
    assert.match(
      source,
      /items: cart\.map\(\(item\) => \(\{\s*priceId: item\.priceId,\s*quantity: item\.quantity,/
    );
    assert.match(
      source,
      /p\.name\.toLowerCase\(\)\.includes\(query\) \|\| p\.description\?\.toLowerCase\(\)\.includes\(query\)/
    );
  });
});
