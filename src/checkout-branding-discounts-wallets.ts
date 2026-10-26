/**
 * Catalog `POST /api/checkout` and Connect `POST /api/checkout` /
 * `POST /api/subscriptions` never set Checkout `branding_settings`,
 * `customer_update`, `discounts`, or `wallet_options`.
 *
 * Without `branding_settings`, hosted Checkout shows generic Stripe
 * chrome (no merchant logo / colors), so returning buyers cannot tell
 * which seller they are paying. Without `customer_update`, a session
 * that later attaches a Customer cannot let the buyer refresh name /
 * address / shipping — stale saved details ship the order. Without
 * `discounts`, the server cannot attach a coupon or promotion_code
 * (distinct from the hosted `allow_promotion_codes` checkbox — #63).
 * Without `wallet_options`, Apple Pay / Google Pay / Link are left
 * to Stripe defaults and cannot be disabled or display-named.
 *
 * Open coverage PRs lock statement/3DS/coupons-in-UI (#63),
 * recovery/saved-PM/name (#66), locale/CTA/copy (#67), and
 * custom fields/VAT/ui_mode (#68). They do not lock branding,
 * customer_update, server-side discounts, or wallets.
 */

export interface CheckoutBrandingDiscountsWalletFields {
  hasBrandingSettings: boolean;
  hasCustomerUpdate: boolean;
  hasDiscounts: boolean;
  hasWalletOptions: boolean;
}

export function sourceSetsBrandingSettings(source: string): boolean {
  return /branding_settings\s*:/.test(source);
}

export function sourceSetsCustomerUpdate(source: string): boolean {
  return /customer_update\s*:/.test(source);
}

export function sourceSetsDiscounts(source: string): boolean {
  return /discounts\s*:/.test(source);
}

export function sourceSetsWalletOptions(source: string): boolean {
  return /wallet_options\s*:/.test(source);
}

export function inspectCheckoutBrandingDiscountsWallets(
  source: string
): CheckoutBrandingDiscountsWalletFields {
  return {
    hasBrandingSettings: sourceSetsBrandingSettings(source),
    hasCustomerUpdate: sourceSetsCustomerUpdate(source),
    hasDiscounts: sourceSetsDiscounts(source),
    hasWalletOptions: sourceSetsWalletOptions(source),
  };
}

export function checkoutShowsGenericStripeBranding(
  hasBrandingSettings: boolean
): boolean {
  return !hasBrandingSettings;
}

export function checkoutCannotRefreshSavedCustomer(
  hasCustomerUpdate: boolean
): boolean {
  return !hasCustomerUpdate;
}

export function checkoutCannotAttachServerCoupon(hasDiscounts: boolean): boolean {
  return !hasDiscounts;
}

export function checkoutLeavesWalletsUnconfigured(
  hasWalletOptions: boolean
): boolean {
  return !hasWalletOptions;
}

export function sourceSetsBrandingLogo(source: string): boolean {
  return /branding_settings\s*:\s*\{[\s\S]{0,240}logo\s*:/.test(source);
}

export function sourceSetsCustomerUpdateShipping(source: string): boolean {
  return /customer_update\s*:\s*\{[\s\S]{0,240}shipping\s*:\s*['"]auto['"]/.test(
    source
  );
}

export function sourceAttachesCouponDiscount(source: string): boolean {
  return /discounts\s*:\s*\[[\s\S]{0,240}coupon\s*:/.test(source);
}

export function sourceSetsApplePayWallet(source: string): boolean {
  return /wallet_options\s*:\s*\{[\s\S]{0,240}apple_pay\s*:/.test(source);
}

export function extractCheckoutSessionCreates(source: string): string {
  const chunks: string[] = [];
  const re = /checkout\.sessions\.create\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    chunks.push(source.slice(match.index, match.index + 1100));
  }
  return chunks.join('\n---\n');
}
