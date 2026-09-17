import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  computeApplicationFeeAmount,
  mapConnectedProductMoney,
  resolveCheckoutQuantity,
} from './connect-price-coercion.js';

const sampleServerPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../stripe-connect-sample/server.ts'
);

describe('mapConnectedProductMoney', () => {
  it('uses unit_amount when default_price is an expanded object', () => {
    assert.deepEqual(
      mapConnectedProductMoney({
        id: 'price_1',
        unit_amount: 1999,
        currency: 'eur',
      }),
      { price: 1999, currency: 'eur' }
    );
  });

  it('maps a string price id to $0 usd (no unit_amount on a string)', () => {
    assert.deepEqual(mapConnectedProductMoney('price_1'), {
      price: 0,
      currency: 'usd',
    });
  });

  it('maps a missing or null default_price to $0 usd', () => {
    assert.deepEqual(mapConnectedProductMoney(undefined), {
      price: 0,
      currency: 'usd',
    });
    assert.deepEqual(mapConnectedProductMoney(null), {
      price: 0,
      currency: 'usd',
    });
  });

  it('treats a null unit_amount as $0', () => {
    assert.deepEqual(
      mapConnectedProductMoney({ id: 'price_1', unit_amount: null, currency: 'usd' }),
      { price: 0, currency: 'usd' }
    );
  });
});

describe('checkout quantity and application fee coercion', () => {
  it('defaults omitted, null, empty, and 0 quantity to 1', () => {
    assert.equal(resolveCheckoutQuantity(undefined), 1);
    assert.equal(resolveCheckoutQuantity(null), 1);
    assert.equal(resolveCheckoutQuantity(''), 1);
    assert.equal(resolveCheckoutQuantity(0), 1);
  });

  it('keeps a non-empty string quantity, so "2" is not coerced to a number', () => {
    assert.equal(resolveCheckoutQuantity('2'), '2');
    assert.equal(resolveCheckoutQuantity('0'), '0');
  });

  it('computes fee as 10% of quantity, so qty=1 and string "2" both round to 0 cents', () => {
    assert.equal(computeApplicationFeeAmount(1), 0);
    assert.equal(computeApplicationFeeAmount('2'), 0);
    assert.equal(computeApplicationFeeAmount('0'), 0);
    assert.equal(computeApplicationFeeAmount(10), 1);
    assert.equal(computeApplicationFeeAmount('15'), 2);
  });

  it('applies the same qty * 0.1 formula to negative quantities', () => {
    assert.ok(Object.is(computeApplicationFeeAmount(-5), -0));
    assert.ok(Object.is(computeApplicationFeeAmount('-5'), -0));
    assert.equal(computeApplicationFeeAmount(-15), -1);
    assert.equal(computeApplicationFeeAmount('-15'), -1);
  });
});

describe('Connect sample source stays aligned', () => {
  it('still maps default_price.unit_amount with optional chaining and qty * 0.1', () => {
    const source = fs.readFileSync(sampleServerPath, 'utf8');
    assert.match(
      source,
      /price: \(product\.default_price as any\)\?\.unit_amount \|\| 0/
    );
    assert.match(
      source,
      /currency: \(product\.default_price as any\)\?\.currency \|\| 'usd'/
    );
    assert.match(source, /quantity: quantity \|\| 1/);
    assert.match(source, /\(quantity \|\| 1\)\s*\*\s*0\.1/);
  });
});
