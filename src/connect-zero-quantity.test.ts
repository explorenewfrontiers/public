import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  checkoutApplicationFeeAmount,
  checkoutLineQuantity,
  numericZeroQuantityCoercesToOne,
} from './connect-zero-quantity.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect checkout numeric quantity 0', () => {
  it('coerces numeric 0 / null / undefined / false to 1 line item', () => {
    assert.equal(checkoutLineQuantity(0), 1);
    assert.equal(checkoutLineQuantity(undefined), 1);
    assert.equal(checkoutLineQuantity(null), 1);
    assert.equal(checkoutLineQuantity(false), 1);
    assert.equal(numericZeroQuantityCoercesToOne(), true);
  });

  it('leaves truthy quantities, including string "0", unchanged', () => {
    assert.equal(checkoutLineQuantity(2), 2);
    assert.equal(checkoutLineQuantity('0'), '0');
    assert.equal(checkoutLineQuantity('2'), '2');
    assert.equal(checkoutLineQuantity(-3), -3);
  });

  it('uses the coalesced quantity for the 10% application fee', () => {
    assert.equal(checkoutApplicationFeeAmount(0), 0);
    assert.equal(checkoutApplicationFeeAmount(1), 0);
    assert.equal(checkoutApplicationFeeAmount(10), 1);
  });
});

describe('Connect checkout quantity source stays aligned', () => {
  it('uses quantity || 1 for both the line item and the application fee', () => {
    const server = readRepo('stripe-connect-sample/server.ts');

    assert.match(server, /quantity: quantity \|\| 1,/);
    assert.match(
      server,
      /application_fee_amount: Math\.round\(\s*\(quantity \|\| 1\) \*\s*0\.1/
    );
    assert.equal(server.includes('quantity > 0'), false);
    assert.equal(server.includes('Number.isInteger(quantity)'), false);
  });
});
