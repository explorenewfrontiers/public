import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  catalogAttachesPriceAsDefault,
  catalogDefaultPriceStaysNull,
  extractDefaultPriceData,
  extractPricesCreates,
  inspectPriceLookupNickname,
  priceCannotBeLookedUpBySku,
  priceHasNoDashboardLabel,
  sourceSetsLookupKey,
  sourceSetsNickname,
} from './price-lookup-nickname.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Catalog and Connect prices omit lookup_key, nickname, and default_price attach', () => {
  it('a price without lookup_key/nickname cannot be resolved by SKU', () => {
    assert.equal(priceCannotBeLookedUpBySku(false), true);
    assert.equal(priceCannotBeLookedUpBySku(true), false);
    assert.equal(priceHasNoDashboardLabel(false), true);
    assert.equal(priceHasNoDashboardLabel(true), false);
    assert.equal(catalogDefaultPriceStaysNull(false), true);
    assert.equal(catalogDefaultPriceStaysNull(true), false);

    assert.equal(sourceSetsLookupKey(`lookup_key: product.sku`), true);
    assert.equal(sourceSetsNickname(`nickname: 'Retail'`), true);
    assert.equal(
      catalogAttachesPriceAsDefault(
        `await stripe.products.update(id, { default_price: price.id })`
      ),
      true
    );
    assert.equal(
      catalogAttachesPriceAsDefault(
        `await stripe.products.create({ name, default_price_data: { unit_amount: 100, currency: 'usd' } })`
      ),
      true
    );
    assert.equal(
      catalogAttachesPriceAsDefault(
        `await stripe.products.create({ name }); await stripe.prices.create({ product, unit_amount })`
      ),
      false
    );
  });

  it('catalog prices.create omits lookup_key/nickname and never attaches default_price', () => {
    const catalog = readRepo('src/catalog.ts');
    const creates = extractPricesCreates(catalog);
    const fields = inspectPriceLookupNickname(catalog);

    assert.equal((creates.match(/prices\.create/g) || []).length, 2);
    assert.match(creates, /unit_amount:\s*Math\.round/);
    assert.equal(sourceSetsLookupKey(catalog), false);
    assert.equal(sourceSetsNickname(catalog), false);
    assert.equal(fields.hasLookupKey, false);
    assert.equal(fields.hasNickname, false);
    assert.equal(catalogAttachesPriceAsDefault(catalog), false);
    assert.equal(priceCannotBeLookedUpBySku(fields.hasLookupKey), true);
    assert.equal(priceHasNoDashboardLabel(fields.hasNickname), true);
    assert.equal(catalogDefaultPriceStaysNull(false), true);
  });

  it('Connect default_price_data omits lookup_key and nickname', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const priceData = extractDefaultPriceData(source);
    const fields = inspectPriceLookupNickname(priceData);

    assert.match(priceData, /default_price_data\s*:/);
    assert.match(priceData, /unit_amount:\s*parseInt\(priceInCents\)/);
    assert.equal(sourceSetsLookupKey(priceData), false);
    assert.equal(sourceSetsNickname(priceData), false);
    assert.equal(fields.hasLookupKey, false);
    assert.equal(fields.hasNickname, false);
    assert.equal(priceCannotBeLookedUpBySku(fields.hasLookupKey), true);
    assert.equal(priceHasNoDashboardLabel(fields.hasNickname), true);
  });
});
