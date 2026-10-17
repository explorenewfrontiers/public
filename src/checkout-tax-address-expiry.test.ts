import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  checkoutCollectsRequiredBillingAddress,
  extractCheckoutSessionCreates,
  extractPriceCreates,
  inspectCheckoutTaxFields,
  sourceEnablesAutomaticTax,
  sourceSetsBillingAddressCollection,
  sourceSetsCheckoutExpiresAt,
  sourceSetsPriceTaxBehavior,
  stripeTaxWouldCalculate,
} from './checkout-tax-address-expiry.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Checkout Sessions omit tax, billing address, and expiry', () => {
  it('Stripe Tax only calculates when automatic_tax and price tax_behavior are both set', () => {
    assert.equal(
      stripeTaxWouldCalculate({
        hasAutomaticTax: false,
        hasBillingAddressCollection: false,
        hasExpiresAt: false,
        hasTaxBehavior: false,
      }),
      false
    );
    assert.equal(
      stripeTaxWouldCalculate({
        hasAutomaticTax: true,
        hasBillingAddressCollection: true,
        hasExpiresAt: true,
        hasTaxBehavior: false,
      }),
      false
    );
    assert.equal(
      stripeTaxWouldCalculate({
        hasAutomaticTax: true,
        hasBillingAddressCollection: true,
        hasExpiresAt: true,
        hasTaxBehavior: true,
      }),
      true
    );

    assert.equal(sourceEnablesAutomaticTax('automatic_tax: { enabled: true }'), true);
    assert.equal(
      sourceSetsBillingAddressCollection(`billing_address_collection: 'required'`),
      true
    );
    assert.equal(checkoutCollectsRequiredBillingAddress(`billing_address_collection: 'auto'`), false);
    assert.equal(sourceSetsCheckoutExpiresAt('expires_at: Math.floor(Date.now()/1000)+3600'), true);
    assert.equal(sourceSetsPriceTaxBehavior(`tax_behavior: 'exclusive'`), true);
  });

  it('catalog Checkout and price creates omit tax, address, and expires_at', () => {
    const web = readRepo('src/web-server.ts');
    const catalog = readRepo('src/catalog.ts');
    const checkout = extractCheckoutSessionCreates(web);
    const prices = extractPriceCreates(catalog);
    const fields = inspectCheckoutTaxFields(web + '\n' + catalog);

    assert.match(checkout, /checkout\.sessions\.create/);
    assert.match(checkout, /mode:\s*['"]payment['"]/);
    assert.match(prices, /prices\.create/);
    assert.equal(fields.hasAutomaticTax, false);
    assert.equal(fields.hasBillingAddressCollection, false);
    assert.equal(fields.hasExpiresAt, false);
    assert.equal(fields.hasTaxBehavior, false);
    assert.equal(checkoutCollectsRequiredBillingAddress(web), false);
    assert.equal(stripeTaxWouldCalculate(fields), false);
  });

  it('Connect Checkout, subscriptions, and default_price_data omit the same tax fields', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const checkout = extractCheckoutSessionCreates(source);
    const prices = extractPriceCreates(source);
    const fields = inspectCheckoutTaxFields(source);

    assert.match(checkout, /mode:\s*['"]payment['"]/);
    assert.match(checkout, /mode:\s*['"]subscription['"]/);
    assert.match(prices, /default_price_data/);
    assert.equal((checkout.match(/checkout\.sessions\.create/g) || []).length, 2);
    assert.equal(fields.hasAutomaticTax, false);
    assert.equal(fields.hasBillingAddressCollection, false);
    assert.equal(fields.hasExpiresAt, false);
    assert.equal(fields.hasTaxBehavior, false);
    assert.equal(stripeTaxWouldCalculate(fields), false);
  });
});
