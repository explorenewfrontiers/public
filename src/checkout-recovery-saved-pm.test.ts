import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  checkoutCollectsNoName,
  expiredCheckoutCannotRecover,
  extractCheckoutSessionCreates,
  inspectCheckoutRecoveryAndWalletFields,
  presentmentStaysInPriceCurrency,
  returningBuyersReenterCards,
  sourceEnablesAdaptivePricingTrue,
  sourceEnablesRecoveryRedirect,
  sourceSetsAdaptivePricing,
  sourceSetsAfterExpiration,
  sourceSetsNameCollection,
  sourceSetsSavedPaymentMethodOptions,
} from './checkout-recovery-saved-pm.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Checkout omits recovery, saved cards, adaptive pricing, and name collection', () => {
  it('a session without recovery/saved-PM/adaptive/name leaves expired carts dead and wallets unused', () => {
    assert.equal(expiredCheckoutCannotRecover(false), true);
    assert.equal(expiredCheckoutCannotRecover(true), false);
    assert.equal(returningBuyersReenterCards(false), true);
    assert.equal(returningBuyersReenterCards(true), false);
    assert.equal(presentmentStaysInPriceCurrency(false), true);
    assert.equal(presentmentStaysInPriceCurrency(true), false);
    assert.equal(checkoutCollectsNoName(false), true);
    assert.equal(checkoutCollectsNoName(true), false);

    assert.equal(
      sourceSetsAfterExpiration(`after_expiration: { recovery: { enabled: true } }`),
      true
    );
    assert.equal(
      sourceEnablesRecoveryRedirect(
        `after_expiration: { recovery: { enabled: true, url: 'https://example.com/recover' } }`
      ),
      true
    );
    assert.equal(sourceSetsSavedPaymentMethodOptions('saved_payment_method_options: { payment_method_save: "enabled" }'), true);
    assert.equal(
      sourceEnablesAdaptivePricingTrue('adaptive_pricing: { enabled: true }'),
      true
    );
    assert.equal(
      sourceEnablesAdaptivePricingTrue('adaptive_pricing: { enabled: false }'),
      false
    );
    assert.equal(sourceSetsNameCollection('name_collection: { enabled: true }'), true);
  });

  it('catalog Checkout omits all four recovery and wallet fields', () => {
    const web = readRepo('src/web-server.ts');
    const checkout = extractCheckoutSessionCreates(web);
    const fields = inspectCheckoutRecoveryAndWalletFields(web);

    assert.match(checkout, /checkout\.sessions\.create/);
    assert.match(checkout, /mode:\s*['"]payment['"]/);
    assert.equal(sourceSetsAfterExpiration(web), false);
    assert.equal(sourceSetsSavedPaymentMethodOptions(web), false);
    assert.equal(sourceSetsAdaptivePricing(web), false);
    assert.equal(sourceSetsNameCollection(web), false);
    assert.equal(fields.hasAfterExpiration, false);
    assert.equal(fields.hasSavedPaymentMethodOptions, false);
    assert.equal(fields.hasAdaptivePricing, false);
    assert.equal(fields.hasNameCollection, false);
    assert.equal(expiredCheckoutCannotRecover(fields.hasAfterExpiration), true);
    assert.equal(returningBuyersReenterCards(fields.hasSavedPaymentMethodOptions), true);
    assert.equal(presentmentStaysInPriceCurrency(fields.hasAdaptivePricing), true);
    assert.equal(checkoutCollectsNoName(fields.hasNameCollection), true);
  });

  it('Connect Checkout and subscription sessions omit the same fields', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const checkout = extractCheckoutSessionCreates(source);
    const fields = inspectCheckoutRecoveryAndWalletFields(source);

    assert.match(checkout, /mode:\s*['"]payment['"]/);
    assert.match(checkout, /mode:\s*['"]subscription['"]/);
    assert.equal((checkout.match(/checkout\.sessions\.create/g) || []).length, 2);
    assert.equal(sourceSetsAfterExpiration(source), false);
    assert.equal(sourceSetsSavedPaymentMethodOptions(source), false);
    assert.equal(sourceSetsAdaptivePricing(source), false);
    assert.equal(sourceSetsNameCollection(source), false);
    assert.equal(fields.hasAfterExpiration, false);
    assert.equal(fields.hasSavedPaymentMethodOptions, false);
    assert.equal(fields.hasAdaptivePricing, false);
    assert.equal(fields.hasNameCollection, false);
    assert.equal(expiredCheckoutCannotRecover(fields.hasAfterExpiration), true);
    assert.equal(returningBuyersReenterCards(fields.hasSavedPaymentMethodOptions), true);
    assert.equal(presentmentStaysInPriceCurrency(fields.hasAdaptivePricing), true);
    assert.equal(checkoutCollectsNoName(fields.hasNameCollection), true);
  });
});
