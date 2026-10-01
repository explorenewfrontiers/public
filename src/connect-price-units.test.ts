import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  dashboardDollarsToCents,
  productCreateAcceptsPrice,
  serverParsePriceInCents,
} from './connect-price-units.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect dashboard dollars vs API cents', () => {
  it('converts form dollars to cents that parseInt keeps as cents', () => {
    const cents = dashboardDollarsToCents('19.99');
    assert.equal(cents, 1999);
    assert.equal(serverParsePriceInCents(cents), 1999);
  });

  it('undercounts ~100x when dollars are sent as priceInCents', () => {
    assert.equal(serverParsePriceInCents(19.99), 19);
    assert.equal(serverParsePriceInCents('19.99'), 19);
    assert.ok(dashboardDollarsToCents('19.99') / serverParsePriceInCents(19.99) > 100);
  });

  it('rejects 0 as a missing required field after a $0.00 form value', () => {
    const cents = dashboardDollarsToCents('0');
    assert.equal(cents, 0);
    assert.equal(productCreateAcceptsPrice(cents), false);
    assert.equal(productCreateAcceptsPrice(1999), true);
  });
});

describe('Connect price unit source stays aligned', () => {
  it('dashboard multiplies dollars by 100 and the API parseInt treats the field as cents', () => {
    const dashboard = readRepo('stripe-connect-sample/public/index.html');
    const server = readRepo('stripe-connect-sample/server.ts');

    assert.match(dashboard, /Price \(in dollars\)/);
    assert.match(
      dashboard,
      /priceInCents: Math\.round\(parseFloat\(price\) \* 100\)/
    );
    assert.match(server, /unit_amount: parseInt\(priceInCents\)/);
    assert.match(server, /if \(!accountId \|\| !name \|\| !priceInCents\)/);
    assert.equal(server.includes('Math.round(parseFloat'), false);
    assert.equal(server.includes('* 100'), false);
  });
});
