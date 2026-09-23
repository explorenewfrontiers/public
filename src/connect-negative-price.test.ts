import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  buildConnectedProductPriceData,
  parseConnectedProductPriceInCents,
  productPriceFieldAccepted,
} from './connect-negative-price.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect product price signed/radix coercion', () => {
  it('rejects zero as missing but accepts negative cents', () => {
    assert.equal(productPriceFieldAccepted(0), false);
    assert.equal(productPriceFieldAccepted(-100), true);
    assert.equal(productPriceFieldAccepted('-250'), true);
    assert.equal(productPriceFieldAccepted(1999), true);
  });

  it('forwards negative unit_amount and parseInt hex/scientific strings', () => {
    assert.equal(parseConnectedProductPriceInCents(-100), -100);
    assert.equal(parseConnectedProductPriceInCents('-250'), -250);
    assert.deepEqual(buildConnectedProductPriceData({ priceInCents: -100 }), {
      unit_amount: -100,
      currency: 'usd',
    });

    assert.equal(parseConnectedProductPriceInCents('0x10'), 16);
    assert.equal(parseConnectedProductPriceInCents('1e3'), 1);
    assert.equal(parseConnectedProductPriceInCents('10.99'), 10);
  });
});

describe('Connect product price source stays aligned', () => {
  it('still uses a truthy priceInCents check and parseInt', () => {
    const server = readRepo('stripe-connect-sample/server.ts');

    assert.match(server, /if \(!accountId \|\| !name \|\| !priceInCents\)/);
    assert.match(server, /unit_amount: parseInt\(priceInCents\)/);
    assert.equal(server.includes('priceInCents < 0'), false);
    assert.equal(server.includes('Number.isInteger'), false);
  });
});
