import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  checkoutCollectsZeroLineItemTax,
  extractCatalogPriceCreates,
  extractCheckoutLineItems,
  extractCheckoutSessionCreates,
  extractConnectDefaultPriceData,
  inspectCheckoutLineItemTax,
  sourceCallsTaxRatesCreate,
  sourceCallsTaxRatesList,
  sourceSetsDynamicTaxRates,
  sourceSetsTaxRates,
} from './checkout-line-item-tax-rates.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Checkout and prices omit line-item tax_rates and dynamic_tax_rates', () => {
  it('missing tax_rates and dynamic_tax_rates collect $0 line-item tax', () => {
    assert.equal(checkoutCollectsZeroLineItemTax(false, false), true);
    assert.equal(checkoutCollectsZeroLineItemTax(true, false), false);
    assert.equal(checkoutCollectsZeroLineItemTax(false, true), false);

    assert.equal(
      sourceSetsTaxRates(`line_items: [{ price: 'price_x', tax_rates: ['txr_1'] }]`),
      true
    );
    assert.equal(
      sourceSetsTaxRates(`line_items: [{ price: 'price_x', quantity: 1 }]`),
      false
    );
    // dynamic_tax_rates must not count as tax_rates
    assert.equal(
      sourceSetsTaxRates(`dynamic_tax_rates: ['txr_1']`),
      false
    );
    // automatic_tax / tax_id_collection / tax_code / tax_behavior are other fields
    assert.equal(sourceSetsTaxRates(`automatic_tax: { enabled: true }`), false);
    assert.equal(sourceSetsTaxRates(`tax_id_collection: { enabled: true }`), false);
    assert.equal(sourceSetsTaxRates(`tax_code: 'txcd_99999999'`), false);
    assert.equal(sourceSetsTaxRates(`tax_behavior: 'exclusive'`), false);

    assert.equal(
      sourceSetsDynamicTaxRates(`dynamic_tax_rates: ['txr_1', 'txr_2']`),
      true
    );
    assert.equal(
      sourceSetsDynamicTaxRates(`tax_rates: ['txr_1']`),
      false
    );
    assert.equal(sourceCallsTaxRatesCreate(`await stripe.taxRates.create({`), true);
    assert.equal(sourceCallsTaxRatesCreate(`await stripe.prices.create({`), false);
    assert.equal(sourceCallsTaxRatesList(`await stripe.taxRates.list({`), true);
    assert.equal(sourceCallsTaxRatesList(`await stripe.products.list({`), false);
  });

  it('catalog Checkout line items and prices.create omit tax_rates and dynamic_tax_rates', () => {
    const web = readRepo('src/web-server.ts');
    const catalog = readRepo('src/catalog.ts');
    const checkout = extractCheckoutSessionCreates(web);
    const lineItems = extractCheckoutLineItems(web);
    const prices = extractCatalogPriceCreates(catalog);
    const fields = inspectCheckoutLineItemTax(`${web}\n${catalog}`);

    assert.match(checkout, /checkout\.sessions\.create/);
    assert.match(checkout, /mode:\s*['"]payment['"]/);
    assert.match(lineItems, /price:\s*item\.priceId/);
    assert.match(lineItems, /quantity:\s*item\.quantity/);
    assert.doesNotMatch(lineItems, /tax_rates/);
    assert.doesNotMatch(lineItems, /dynamic_tax_rates/);
    assert.match(prices, /prices\.create/);
    assert.match(prices, /unit_amount:/);
    assert.doesNotMatch(prices, /tax_rates/);
    assert.equal(sourceSetsTaxRates(web), false);
    assert.equal(sourceSetsDynamicTaxRates(web), false);
    assert.equal(sourceSetsTaxRates(catalog), false);
    assert.equal(sourceSetsDynamicTaxRates(catalog), false);
    assert.equal(sourceCallsTaxRatesCreate(catalog), false);
    assert.equal(fields.hasTaxRates, false);
    assert.equal(fields.hasDynamicTaxRates, false);
    assert.equal(fields.callsTaxRatesCreate, false);
    assert.equal(
      checkoutCollectsZeroLineItemTax(fields.hasTaxRates, fields.hasDynamicTaxRates),
      true
    );
  });

  it('Connect Checkout, subscriptions, and default_price_data omit the same tax fields', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const checkout = extractCheckoutSessionCreates(source);
    const lineItems = extractCheckoutLineItems(source);
    const defaultPrice = extractConnectDefaultPriceData(source);
    const fields = inspectCheckoutLineItemTax(source);

    assert.match(checkout, /mode:\s*['"]payment['"]/);
    assert.match(checkout, /mode:\s*['"]subscription['"]/);
    assert.equal((checkout.match(/checkout\.sessions\.create/g) || []).length, 2);
    assert.match(lineItems, /price:\s*priceId/);
    assert.doesNotMatch(lineItems, /tax_rates/);
    assert.doesNotMatch(lineItems, /dynamic_tax_rates/);
    assert.match(defaultPrice, /default_price_data:/);
    assert.match(defaultPrice, /unit_amount:/);
    assert.doesNotMatch(defaultPrice, /tax_rates/);
    assert.equal(sourceSetsTaxRates(source), false);
    assert.equal(sourceSetsDynamicTaxRates(source), false);
    assert.equal(sourceCallsTaxRatesCreate(source), false);
    assert.equal(sourceCallsTaxRatesList(source), false);
    assert.equal(fields.hasTaxRates, false);
    assert.equal(fields.hasDynamicTaxRates, false);
    assert.equal(fields.callsTaxRatesCreate, false);
    assert.equal(fields.callsTaxRatesList, false);
    assert.equal(
      checkoutCollectsZeroLineItemTax(fields.hasTaxRates, fields.hasDynamicTaxRates),
      true
    );
  });
});
