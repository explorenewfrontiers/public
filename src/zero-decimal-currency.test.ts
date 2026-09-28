import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  catalogListPriceLabel,
  catalogUnitAmountCents,
  connectStorefrontPriceLabel,
  stripeZeroDecimalUnitAmount,
} from './zero-decimal-currency.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('zero-decimal and non-USD money conversion', () => {
  it('catalog sync multiplies every currency by 100, including JPY', () => {
    assert.equal(catalogUnitAmountCents(10, 'usd'), 1000);
    assert.equal(catalogUnitAmountCents(500, 'jpy'), 50000);
    assert.equal(catalogUnitAmountCents(500, 'krw'), 50000);
    assert.equal(catalogUnitAmountCents(500, 'vnd'), 50000);
    assert.notEqual(catalogUnitAmountCents(500, 'jpy'), stripeZeroDecimalUnitAmount(500));
  });

  it('catalog and Connect storefronts always divide by 100 and prefix $', () => {
    assert.equal(catalogListPriceLabel(500, 'jpy'), '$5.00');
    assert.equal(catalogListPriceLabel(999, 'eur'), '$9.99');
    assert.equal(catalogListPriceLabel(1500, 'gbp'), '$15.00');
    assert.equal(connectStorefrontPriceLabel(500, 'jpy'), '$5.00');
    assert.equal(connectStorefrontPriceLabel(1999, 'eur'), '$19.99');
    assert.notEqual(catalogListPriceLabel(500, 'jpy'), '¥500');
    assert.notEqual(catalogListPriceLabel(999, 'eur'), '€9.99');
  });
});

describe('zero-decimal money source stays aligned', () => {
  it('catalog sync always uses Math.round(price * 100) and UIs hardcode $ / 100', () => {
    const catalog = readRepo('src/catalog.ts');
    const appJs = readRepo('public/app.js');
    const storefront = readRepo('stripe-connect-sample/public/storefront.html');
    const connectServer = readRepo('stripe-connect-sample/server.ts');

    assert.match(catalog, /unit_amount:\s*Math\.round\(product\.price \* 100\)/);
    assert.equal(catalog.includes('zero-decimal'), false);
    assert.equal(catalog.includes('jpy'), false);

    assert.match(appJs, /price\.unit_amount \/ 100\)\.toFixed\(2\)/);
    assert.match(appJs, /`\$\$\{amount\}`/);
    assert.equal(appJs.includes('price.currency'), false);

    assert.match(storefront, /const price = \(product\.price \/ 100\)\.toFixed\(2\)/);
    assert.match(storefront, /\$\$\{price\}/);
    assert.equal(storefront.includes('product.currency'), false);

    assert.match(connectServer, /unit_amount:\s*parseInt\(priceInCents\)/);
    assert.match(
      connectServer,
      /currency:\s*\(product\.default_price as any\)\?\.currency \|\| 'usd'/
    );
  });
});
