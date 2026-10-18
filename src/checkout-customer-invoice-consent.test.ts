import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  catalogSourceHasPhysicalProductSignals,
  checkoutRecordsNoTosAcceptance,
  extractCheckoutSessionCreates,
  extractPriceCreates,
  guestCheckoutCreatesNoCustomer,
  inspectCheckoutFulfillmentFields,
  oneTimePaymentHasNoInvoice,
  physicalGoodsCannotBeShipped,
  sourceEnablesInvoiceCreation,
  sourceSetsConsentCollection,
  sourceSetsCustomerCreation,
  sourceSetsCustomerCreationAlways,
  sourceSetsPriceTaxCode,
  sourceSetsShippingAddressCollection,
  stripeTaxHasProductClassification,
} from './checkout-customer-invoice-consent.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Checkout Sessions omit customer, invoice, consent, shipping, and tax_code', () => {
  it('guest payment-mode Checkout creates no Customer, invoice, ToS record, or ship-to', () => {
    assert.equal(
      guestCheckoutCreatesNoCustomer({
        hasCustomerCreationAlways: false,
        otherParamRequiresCustomer: false,
      }),
      true
    );
    assert.equal(
      guestCheckoutCreatesNoCustomer({
        hasCustomerCreationAlways: true,
        otherParamRequiresCustomer: false,
      }),
      false
    );
    assert.equal(oneTimePaymentHasNoInvoice(false), true);
    assert.equal(oneTimePaymentHasNoInvoice(true), false);
    assert.equal(checkoutRecordsNoTosAcceptance(false), true);
    assert.equal(checkoutRecordsNoTosAcceptance(true), false);
    assert.equal(
      physicalGoodsCannotBeShipped({
        catalogHasPhysicalSignals: true,
        hasShippingAddressCollection: false,
      }),
      true
    );
    assert.equal(
      physicalGoodsCannotBeShipped({
        catalogHasPhysicalSignals: true,
        hasShippingAddressCollection: true,
      }),
      false
    );
    assert.equal(stripeTaxHasProductClassification(false), false);
    assert.equal(stripeTaxHasProductClassification(true), true);

    assert.equal(sourceSetsCustomerCreationAlways(`customer_creation: 'always'`), true);
    assert.equal(sourceSetsCustomerCreationAlways(`customer_creation: 'if_required'`), false);
    assert.equal(sourceEnablesInvoiceCreation('invoice_creation: { enabled: true }'), true);
    assert.equal(sourceSetsConsentCollection('consent_collection: { terms_of_service: "required" }'), true);
    assert.equal(
      sourceSetsShippingAddressCollection(`shipping_address_collection: { allowed_countries: ['US'] }`),
      true
    );
    assert.equal(sourceSetsPriceTaxCode(`tax_code: 'txcd_99999999'`), true);
  });

  it('catalog Checkout and price creates omit all five fulfillment fields', () => {
    const web = readRepo('src/web-server.ts');
    const catalog = readRepo('src/catalog.ts');
    const checkout = extractCheckoutSessionCreates(web);
    const prices = extractPriceCreates(catalog);
    const fields = inspectCheckoutFulfillmentFields(web + '\n' + catalog);

    assert.match(checkout, /checkout\.sessions\.create/);
    assert.match(checkout, /mode:\s*['"]payment['"]/);
    assert.match(prices, /prices\.create/);
    assert.equal(sourceSetsCustomerCreation(web), false);
    assert.equal(sourceSetsCustomerCreationAlways(web), false);
    assert.equal(fields.hasCustomerCreation, false);
    assert.equal(fields.hasInvoiceCreation, false);
    assert.equal(fields.hasConsentCollection, false);
    assert.equal(fields.hasShippingAddressCollection, false);
    assert.equal(fields.hasTaxCode, false);
    assert.equal(
      guestCheckoutCreatesNoCustomer({
        hasCustomerCreationAlways: false,
        otherParamRequiresCustomer: false,
      }),
      true
    );
    assert.equal(oneTimePaymentHasNoInvoice(fields.hasInvoiceCreation), true);
    assert.equal(checkoutRecordsNoTosAcceptance(fields.hasConsentCollection), true);
    assert.equal(catalogSourceHasPhysicalProductSignals(catalog), true);
    assert.equal(
      physicalGoodsCannotBeShipped({
        catalogHasPhysicalSignals: true,
        hasShippingAddressCollection: fields.hasShippingAddressCollection,
      }),
      true
    );
    assert.equal(stripeTaxHasProductClassification(fields.hasTaxCode), false);
  });

  it('Connect Checkout and subscriptions omit the same fulfillment fields', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const checkout = extractCheckoutSessionCreates(source);
    const prices = extractPriceCreates(source);
    const fields = inspectCheckoutFulfillmentFields(source);

    assert.match(checkout, /mode:\s*['"]payment['"]/);
    assert.match(checkout, /mode:\s*['"]subscription['"]/);
    assert.match(prices, /default_price_data/);
    assert.equal((checkout.match(/checkout\.sessions\.create/g) || []).length, 2);
    assert.equal(sourceSetsCustomerCreation(source), false);
    assert.equal(fields.hasCustomerCreation, false);
    assert.equal(fields.hasInvoiceCreation, false);
    assert.equal(fields.hasConsentCollection, false);
    assert.equal(fields.hasShippingAddressCollection, false);
    assert.equal(fields.hasTaxCode, false);
    assert.equal(oneTimePaymentHasNoInvoice(fields.hasInvoiceCreation), true);
    assert.equal(checkoutRecordsNoTosAcceptance(fields.hasConsentCollection), true);
    assert.equal(stripeTaxHasProductClassification(fields.hasTaxCode), false);
  });
});
