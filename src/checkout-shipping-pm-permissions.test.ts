import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  checkoutCannotChargeShipping,
  checkoutCannotUpdateShippingAfterCreate,
  checkoutLeavesMethodOptionsAtDefaults,
  extractCheckoutSessionCreates,
  inspectCheckoutShippingPmPermissions,
  sourceAllowsUpdateShippingDetails,
  sourceSetsCardInstallments,
  sourceSetsCheckoutPermissions,
  sourceSetsPaymentMethodOptions,
  sourceSetsShippingOptions,
  sourceSetsShippingRateOption,
} from './checkout-shipping-pm-permissions.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Checkout omits shipping_options, payment_method_options, and permissions', () => {
  it('a session without those fields cannot charge shipping, configure methods, or update ship-to', () => {
    assert.equal(checkoutCannotChargeShipping(false), true);
    assert.equal(checkoutCannotChargeShipping(true), false);
    assert.equal(checkoutLeavesMethodOptionsAtDefaults(false), true);
    assert.equal(checkoutLeavesMethodOptionsAtDefaults(true), false);
    assert.equal(checkoutCannotUpdateShippingAfterCreate(false), true);
    assert.equal(checkoutCannotUpdateShippingAfterCreate(true), false);

    assert.equal(
      sourceSetsShippingOptions(`shipping_options: [{ shipping_rate: 'shr_x' }]`),
      true
    );
    assert.equal(
      sourceSetsShippingRateOption(`shipping_options: [{ shipping_rate: 'shr_x' }]`),
      true
    );
    assert.equal(
      sourceSetsShippingRateOption(`shipping_options: [{ shipping_rate_data: {} }]`),
      false
    );
    // shipping_address_collection (#61) is not a shipping rate
    assert.equal(
      sourceSetsShippingOptions(`shipping_address_collection: { allowed_countries: ['US'] }`),
      false
    );
    assert.equal(
      sourceSetsPaymentMethodOptions(
        `payment_method_options: { card: { installments: { enabled: true } } }`
      ),
      true
    );
    assert.equal(
      sourceSetsCardInstallments(
        `payment_method_options: { card: { installments: { enabled: true } } }`
      ),
      true
    );
    assert.equal(
      sourceSetsCardInstallments(`payment_method_options: { card: { request_three_d_secure: 'any' } }`),
      false
    );
    // payment_method_types (#33) is an allowlist, not per-method options
    assert.equal(
      sourceSetsPaymentMethodOptions(`payment_method_types: ['card']`),
      false
    );
    assert.equal(
      sourceSetsCheckoutPermissions(`permissions: { update_shipping_details: 'client_only' }`),
      true
    );
    assert.equal(
      sourceAllowsUpdateShippingDetails(
        `permissions: { update_shipping_details: 'client_only' }`
      ),
      true
    );
    assert.equal(
      sourceAllowsUpdateShippingDetails(`permissions: { update_line_items: 'client_only' }`),
      false
    );
  });

  it('catalog Checkout omits shipping_options, payment_method_options, and permissions', () => {
    const web = readRepo('src/web-server.ts');
    const checkout = extractCheckoutSessionCreates(web);
    const fields = inspectCheckoutShippingPmPermissions(web);

    assert.match(checkout, /checkout\.sessions\.create/);
    assert.match(checkout, /mode:\s*['"]payment['"]/);
    assert.match(checkout, /sessionId:\s*session\.id/);
    assert.equal(sourceSetsShippingOptions(web), false);
    assert.equal(sourceSetsPaymentMethodOptions(web), false);
    assert.equal(sourceSetsCheckoutPermissions(web), false);
    assert.equal(fields.hasShippingOptions, false);
    assert.equal(fields.hasPaymentMethodOptions, false);
    assert.equal(fields.hasPermissions, false);
    assert.equal(checkoutCannotChargeShipping(fields.hasShippingOptions), true);
    assert.equal(
      checkoutLeavesMethodOptionsAtDefaults(fields.hasPaymentMethodOptions),
      true
    );
    assert.equal(
      checkoutCannotUpdateShippingAfterCreate(fields.hasPermissions),
      true
    );
  });

  it('Connect Checkout and subscription sessions omit the same fields', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const checkout = extractCheckoutSessionCreates(source);
    const fields = inspectCheckoutShippingPmPermissions(source);

    assert.match(checkout, /mode:\s*['"]payment['"]/);
    assert.match(checkout, /mode:\s*['"]subscription['"]/);
    assert.equal((checkout.match(/checkout\.sessions\.create/g) || []).length, 2);
    assert.equal(sourceSetsShippingOptions(source), false);
    assert.equal(sourceSetsPaymentMethodOptions(source), false);
    assert.equal(sourceSetsCheckoutPermissions(source), false);
    assert.equal(fields.hasShippingOptions, false);
    assert.equal(fields.hasPaymentMethodOptions, false);
    assert.equal(fields.hasPermissions, false);
    assert.equal(checkoutCannotChargeShipping(fields.hasShippingOptions), true);
    assert.equal(
      checkoutLeavesMethodOptionsAtDefaults(fields.hasPaymentMethodOptions),
      true
    );
    assert.equal(
      checkoutCannotUpdateShippingAfterCreate(fields.hasPermissions),
      true
    );
  });
});
