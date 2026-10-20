/**
 * Catalog `POST /api/checkout` and Connect `POST /api/checkout` /
 * `POST /api/subscriptions` never set Checkout recovery, saved-card,
 * presentment-currency, or name-collection fields.
 *
 * Without `after_expiration`, an expired session has no recovery URL —
 * the buyer cannot resume after Stripe's default TTL. Distinct from
 * `expires_at` (#59), which only sets when the session dies.
 * `saved_payment_method_options` stays unset, so returning buyers
 * re-enter cards (and catalog Checkout never has a Customer to attach
 * to). `adaptive_pricing` stays unset, so presentment stays in the
 * Price currency even for international cards. `name_collection` stays
 * unset — distinct from `phone_number_collection` (#63).
 *
 * Open coverage PRs lock tax/address/expiry (#59), shipping/consent
 * (#61), and statement/phone/promo (#63). They do not lock recovery,
 * saved payment methods, adaptive pricing, or name collection.
 */

export interface CheckoutRecoveryAndWalletFields {
  hasAfterExpiration: boolean;
  hasSavedPaymentMethodOptions: boolean;
  hasAdaptivePricing: boolean;
  hasNameCollection: boolean;
}

export function sourceSetsAfterExpiration(source: string): boolean {
  return /after_expiration\s*:/.test(source);
}

export function sourceSetsSavedPaymentMethodOptions(source: string): boolean {
  return /saved_payment_method_options\s*:/.test(source);
}

export function sourceSetsAdaptivePricing(source: string): boolean {
  return /adaptive_pricing\s*:/.test(source);
}

export function sourceSetsNameCollection(source: string): boolean {
  return /name_collection\s*:/.test(source);
}

export function inspectCheckoutRecoveryAndWalletFields(
  source: string
): CheckoutRecoveryAndWalletFields {
  return {
    hasAfterExpiration: sourceSetsAfterExpiration(source),
    hasSavedPaymentMethodOptions: sourceSetsSavedPaymentMethodOptions(source),
    hasAdaptivePricing: sourceSetsAdaptivePricing(source),
    hasNameCollection: sourceSetsNameCollection(source),
  };
}

export function expiredCheckoutCannotRecover(hasAfterExpiration: boolean): boolean {
  return !hasAfterExpiration;
}

export function returningBuyersReenterCards(
  hasSavedPaymentMethodOptions: boolean
): boolean {
  return !hasSavedPaymentMethodOptions;
}

export function presentmentStaysInPriceCurrency(hasAdaptivePricing: boolean): boolean {
  return !hasAdaptivePricing;
}

export function checkoutCollectsNoName(hasNameCollection: boolean): boolean {
  return !hasNameCollection;
}

export function sourceEnablesRecoveryRedirect(source: string): boolean {
  return /after_expiration\s*:\s*\{[\s\S]{0,200}recovery\s*:/.test(source);
}

export function sourceEnablesAdaptivePricingTrue(source: string): boolean {
  return /adaptive_pricing\s*:\s*\{[\s\S]{0,120}enabled\s*:\s*true/.test(source);
}

export function extractCheckoutSessionCreates(source: string): string {
  const chunks: string[] = [];
  const re = /checkout\.sessions\.create\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    chunks.push(source.slice(match.index, match.index + 900));
  }
  return chunks.join('\n---\n');
}
