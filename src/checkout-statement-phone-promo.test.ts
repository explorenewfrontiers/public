import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  bankStatementIsGeneric,
  checkoutCollectsNoPhone,
  checkoutRejectsDashboardCoupons,
  extractCheckoutAndPaymentIntentCreates,
  extractProductCreates,
  inspectCheckoutBuyerFacingFields,
  sourceEnablesAllowPromotionCodes,
  sourceEnablesPhoneNumberCollection,
  sourceEnablesPromotionCodesTrue,
  sourceSetsPhoneNumberCollection,
  sourceSetsStatementDescriptor,
  sourceSetsStatementDescriptorSuffix,
} from './checkout-statement-phone-promo.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Checkout and PaymentIntents omit statement descriptor, phone, and promo codes', () => {
  it('a session without descriptor/phone/promo leaves a generic statement and no contact or coupon path', () => {
    assert.equal(
      bankStatementIsGeneric({
        hasStatementDescriptor: false,
        hasStatementDescriptorSuffix: false,
      }),
      true
    );
    assert.equal(
      bankStatementIsGeneric({
        hasStatementDescriptor: true,
        hasStatementDescriptorSuffix: false,
      }),
      false
    );
    assert.equal(
      bankStatementIsGeneric({
        hasStatementDescriptor: false,
        hasStatementDescriptorSuffix: true,
      }),
      false
    );
    assert.equal(checkoutCollectsNoPhone(false), true);
    assert.equal(checkoutCollectsNoPhone(true), false);
    assert.equal(checkoutRejectsDashboardCoupons(false), true);
    assert.equal(checkoutRejectsDashboardCoupons(true), false);

    assert.equal(sourceSetsStatementDescriptor(`statement_descriptor: 'ACME SHOP'`), true);
    assert.equal(
      sourceSetsStatementDescriptorSuffix(`statement_descriptor_suffix: 'ORDER'`),
      true
    );
    assert.equal(sourceSetsPhoneNumberCollection('phone_number_collection: { enabled: true }'), true);
    assert.equal(sourceEnablesPhoneNumberCollection('phone_number_collection: { enabled: true }'), true);
    assert.equal(sourceEnablesPhoneNumberCollection('phone_number_collection: { enabled: false }'), false);
    assert.equal(sourceEnablesAllowPromotionCodes('allow_promotion_codes: true'), true);
    assert.equal(sourceEnablesPromotionCodesTrue('allow_promotion_codes: true'), true);
    assert.equal(sourceEnablesPromotionCodesTrue('allow_promotion_codes: false'), false);
  });

  it('catalog Checkout and MCP PaymentIntents omit all four buyer-facing fields', () => {
    const web = readRepo('src/web-server.ts');
    const mcp = readRepo('src/index.ts');
    const checkout = extractCheckoutAndPaymentIntentCreates(web);
    const intents = extractCheckoutAndPaymentIntentCreates(mcp);
    const fields = inspectCheckoutBuyerFacingFields(web + '\n' + mcp);

    assert.match(checkout, /checkout\.sessions\.create/);
    assert.match(checkout, /mode:\s*['"]payment['"]/);
    assert.match(intents, /paymentIntents\.create/);
    assert.equal(sourceSetsStatementDescriptor(web + mcp), false);
    assert.equal(sourceSetsStatementDescriptorSuffix(web + mcp), false);
    assert.equal(sourceSetsPhoneNumberCollection(web), false);
    assert.equal(sourceEnablesAllowPromotionCodes(web), false);
    assert.equal(fields.hasStatementDescriptor, false);
    assert.equal(fields.hasStatementDescriptorSuffix, false);
    assert.equal(fields.hasPhoneNumberCollection, false);
    assert.equal(fields.hasAllowPromotionCodes, false);
    assert.equal(
      bankStatementIsGeneric({
        hasStatementDescriptor: fields.hasStatementDescriptor,
        hasStatementDescriptorSuffix: fields.hasStatementDescriptorSuffix,
      }),
      true
    );
    assert.equal(checkoutCollectsNoPhone(fields.hasPhoneNumberCollection), true);
    assert.equal(checkoutRejectsDashboardCoupons(fields.hasAllowPromotionCodes), true);
  });

  it('Connect Checkout, subscriptions, and product creates omit the same fields', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const checkout = extractCheckoutAndPaymentIntentCreates(source);
    const products = extractProductCreates(source);
    const fields = inspectCheckoutBuyerFacingFields(source);

    assert.match(checkout, /mode:\s*['"]payment['"]/);
    assert.match(checkout, /mode:\s*['"]subscription['"]/);
    assert.match(products, /products\.create/);
    assert.equal((checkout.match(/checkout\.sessions\.create/g) || []).length, 2);
    assert.equal(sourceSetsStatementDescriptor(source), false);
    assert.equal(sourceSetsStatementDescriptorSuffix(source), false);
    assert.equal(fields.hasStatementDescriptor, false);
    assert.equal(fields.hasStatementDescriptorSuffix, false);
    assert.equal(fields.hasPhoneNumberCollection, false);
    assert.equal(fields.hasAllowPromotionCodes, false);
    assert.equal(
      bankStatementIsGeneric({
        hasStatementDescriptor: fields.hasStatementDescriptor,
        hasStatementDescriptorSuffix: fields.hasStatementDescriptorSuffix,
      }),
      true
    );
    assert.equal(checkoutCollectsNoPhone(fields.hasPhoneNumberCollection), true);
    assert.equal(checkoutRejectsDashboardCoupons(fields.hasAllowPromotionCodes), true);
  });
});
