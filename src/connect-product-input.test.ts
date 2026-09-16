import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  parseConnectedProductPriceInCents,
  productCreateCurrency,
  productCreateDescription,
  validateAccountCreate,
  validateProductCreate,
} from './connect-product-input.js';

const sampleServerPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../stripe-connect-sample/server.ts'
);

describe('validateAccountCreate', () => {
  it('requires both displayName and contactEmail', () => {
    assert.equal(validateAccountCreate({}), 'displayName and contactEmail are required');
    assert.equal(
      validateAccountCreate({ displayName: 'Trail Shop' }),
      'displayName and contactEmail are required'
    );
    assert.equal(
      validateAccountCreate({ contactEmail: 'owner@example.com' }),
      'displayName and contactEmail are required'
    );
    assert.equal(validateAccountCreate({ displayName: '', contactEmail: 'a@b.com' }), 'displayName and contactEmail are required');
  });

  it('accepts whitespace-only names because they are truthy', () => {
    assert.equal(validateAccountCreate({ displayName: '   ', contactEmail: '   ' }), null);
  });

  it('accepts a populated name and email', () => {
    assert.equal(
      validateAccountCreate({ displayName: 'Trail Shop', contactEmail: 'owner@example.com' }),
      null
    );
  });
});

describe('validateProductCreate', () => {
  it('rejects missing fields and a zero price (0 is falsy)', () => {
    assert.equal(
      validateProductCreate({ accountId: 'acct_1', name: 'Mug' }),
      'accountId, name, and priceInCents are required'
    );
    assert.equal(
      validateProductCreate({ accountId: 'acct_1', name: 'Free', priceInCents: 0 }),
      'accountId, name, and priceInCents are required'
    );
    assert.equal(
      validateProductCreate({ accountId: 'acct_1', name: 'Mug', priceInCents: 1999 }),
      null
    );
  });
});

describe('parseConnectedProductPriceInCents', () => {
  it('uses parseInt, so decimal strings are truncated rather than rounded', () => {
    assert.equal(parseConnectedProductPriceInCents('1999'), 1999);
    assert.equal(parseConnectedProductPriceInCents(1999), 1999);
    assert.equal(parseConnectedProductPriceInCents('10.99'), 10);
    assert.equal(Number.isNaN(parseConnectedProductPriceInCents('abc')), true);
  });

  it('defaults optional product fields the way the API does', () => {
    assert.equal(productCreateCurrency(), 'usd');
    assert.equal(productCreateCurrency('eur'), 'eur');
    assert.equal(productCreateDescription(), '');
    assert.equal(productCreateDescription('Enamel mug'), 'Enamel mug');
  });
});

describe('Connect product/account source stays aligned', () => {
  it('still uses truthy checks and parseInt for product prices', () => {
    const source = fs.readFileSync(sampleServerPath, 'utf8');
    assert.match(source, /if \(!displayName \|\| !contactEmail\)/);
    assert.match(source, /if \(!accountId \|\| !name \|\| !priceInCents\)/);
    assert.match(source, /unit_amount: parseInt\(priceInCents\)/);
    assert.match(source, /currency: currency \|\| 'usd'/);
    assert.match(source, /description: description \|\| ''/);
  });
});
