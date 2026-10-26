import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  checkoutCannotAttachServerCoupon,
  checkoutCannotRefreshSavedCustomer,
  checkoutLeavesWalletsUnconfigured,
  checkoutShowsGenericStripeBranding,
  extractCheckoutSessionCreates,
  inspectCheckoutBrandingDiscountsWallets,
  sourceAttachesCouponDiscount,
  sourceSetsApplePayWallet,
  sourceSetsBrandingLogo,
  sourceSetsBrandingSettings,
  sourceSetsCustomerUpdate,
  sourceSetsCustomerUpdateShipping,
  sourceSetsDiscounts,
  sourceSetsWalletOptions,
} from './checkout-branding-discounts-wallets.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Checkout omits branding_settings, customer_update, discounts, and wallet_options', () => {
  it('a session without those fields shows generic Stripe chrome, cannot refresh the customer, attach a coupon, or configure wallets', () => {
    assert.equal(checkoutShowsGenericStripeBranding(false), true);
    assert.equal(checkoutShowsGenericStripeBranding(true), false);
    assert.equal(checkoutCannotRefreshSavedCustomer(false), true);
    assert.equal(checkoutCannotRefreshSavedCustomer(true), false);
    assert.equal(checkoutCannotAttachServerCoupon(false), true);
    assert.equal(checkoutCannotAttachServerCoupon(true), false);
    assert.equal(checkoutLeavesWalletsUnconfigured(false), true);
    assert.equal(checkoutLeavesWalletsUnconfigured(true), false);

    assert.equal(
      sourceSetsBrandingSettings(`branding_settings: { background_color: '#111' }`),
      true
    );
    assert.equal(
      sourceSetsBrandingLogo(`branding_settings: { logo: { type: 'file', file: 'file_x' } }`),
      true
    );
    assert.equal(
      sourceSetsBrandingLogo(`branding_settings: { background_color: '#111' }`),
      false
    );
    assert.equal(
      sourceSetsCustomerUpdate(`customer_update: { name: 'auto', address: 'auto' }`),
      true
    );
    assert.equal(
      sourceSetsCustomerUpdateShipping(
        `customer_update: { name: 'auto', shipping: 'auto' }`
      ),
      true
    );
    assert.equal(
      sourceSetsCustomerUpdateShipping(`customer_update: { name: 'auto' }`),
      false
    );
    assert.equal(sourceSetsDiscounts(`discounts: [{ coupon: 'SAVE10' }]`), true);
    assert.equal(
      sourceAttachesCouponDiscount(`discounts: [{ coupon: 'SAVE10' }]`),
      true
    );
    assert.equal(
      sourceAttachesCouponDiscount(`discounts: [{ promotion_code: 'promo_x' }]`),
      false
    );
    assert.equal(
      sourceSetsWalletOptions(`wallet_options: { apple_pay: { type: 'classic' } }`),
      true
    );
    assert.equal(
      sourceSetsApplePayWallet(`wallet_options: { apple_pay: { type: 'classic' } }`),
      true
    );
    assert.equal(
      sourceSetsApplePayWallet(`wallet_options: { google_pay: { button_type: 'buy' } }`),
      false
    );
    // allow_promotion_codes is the hosted checkbox (#63), not discounts[]
    assert.equal(sourceSetsDiscounts(`allow_promotion_codes: true`), false);
  });

  it('catalog Checkout omits branding_settings, customer_update, discounts, and wallet_options', () => {
    const web = readRepo('src/web-server.ts');
    const checkout = extractCheckoutSessionCreates(web);
    const fields = inspectCheckoutBrandingDiscountsWallets(web);

    assert.match(checkout, /checkout\.sessions\.create/);
    assert.match(checkout, /mode:\s*['"]payment['"]/);
    assert.match(checkout, /sessionId:\s*session\.id/);
    assert.equal(sourceSetsBrandingSettings(web), false);
    assert.equal(sourceSetsCustomerUpdate(web), false);
    assert.equal(sourceSetsDiscounts(web), false);
    assert.equal(sourceSetsWalletOptions(web), false);
    assert.equal(fields.hasBrandingSettings, false);
    assert.equal(fields.hasCustomerUpdate, false);
    assert.equal(fields.hasDiscounts, false);
    assert.equal(fields.hasWalletOptions, false);
    assert.equal(checkoutShowsGenericStripeBranding(fields.hasBrandingSettings), true);
    assert.equal(checkoutCannotRefreshSavedCustomer(fields.hasCustomerUpdate), true);
    assert.equal(checkoutCannotAttachServerCoupon(fields.hasDiscounts), true);
    assert.equal(checkoutLeavesWalletsUnconfigured(fields.hasWalletOptions), true);
  });

  it('Connect Checkout and subscription sessions omit the same fields', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const checkout = extractCheckoutSessionCreates(source);
    const fields = inspectCheckoutBrandingDiscountsWallets(source);

    assert.match(checkout, /mode:\s*['"]payment['"]/);
    assert.match(checkout, /mode:\s*['"]subscription['"]/);
    assert.equal((checkout.match(/checkout\.sessions\.create/g) || []).length, 2);
    assert.equal(sourceSetsBrandingSettings(source), false);
    assert.equal(sourceSetsCustomerUpdate(source), false);
    assert.equal(sourceSetsDiscounts(source), false);
    assert.equal(sourceSetsWalletOptions(source), false);
    assert.equal(fields.hasBrandingSettings, false);
    assert.equal(fields.hasCustomerUpdate, false);
    assert.equal(fields.hasDiscounts, false);
    assert.equal(fields.hasWalletOptions, false);
    assert.equal(checkoutShowsGenericStripeBranding(fields.hasBrandingSettings), true);
    assert.equal(checkoutCannotRefreshSavedCustomer(fields.hasCustomerUpdate), true);
    assert.equal(checkoutCannotAttachServerCoupon(fields.hasDiscounts), true);
    assert.equal(checkoutLeavesWalletsUnconfigured(fields.hasWalletOptions), true);
  });
});
