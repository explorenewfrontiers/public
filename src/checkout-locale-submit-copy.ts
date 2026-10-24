/**
 * Catalog `POST /api/checkout` and Connect `POST /api/checkout` /
 * `POST /api/subscriptions` never set Checkout `locale`, `submit_type`,
 * or `custom_text`.
 *
 * Without `locale`, the hosted page follows the browser language, not
 * the merchant or connected-account country (Connect accounts are
 * hardcoded `identity.country: 'us'` — #28). Without `submit_type`,
 * payment mode always shows the default "Pay" CTA even when the
 * product is a booking or donation. Without `custom_text`, Checkout
 * shows no merchant shipping / submit / terms-acceptance copy —
 * distinct from `consent_collection` (#61), which only toggles the
 * checkbox, and from `name_collection` (#66).
 *
 * Open coverage PRs lock tax/address (#59), shipping/consent (#61),
 * statement/phone/promo (#63), and recovery/saved-PM/adaptive/name
 * (#66). They do not lock locale, submit CTA, or custom Checkout copy.
 */

export interface CheckoutLocaleSubmitCopyFields {
  hasLocale: boolean;
  hasSubmitType: boolean;
  hasCustomText: boolean;
}

export function sourceSetsLocale(source: string): boolean {
  return /locale\s*:/.test(source);
}

export function sourceSetsSubmitType(source: string): boolean {
  return /submit_type\s*:/.test(source);
}

export function sourceSetsCustomText(source: string): boolean {
  return /custom_text\s*:/.test(source);
}

export function inspectCheckoutLocaleSubmitCopy(
  source: string
): CheckoutLocaleSubmitCopyFields {
  return {
    hasLocale: sourceSetsLocale(source),
    hasSubmitType: sourceSetsSubmitType(source),
    hasCustomText: sourceSetsCustomText(source),
  };
}

export function checkoutIgnoresBuyerLanguage(hasLocale: boolean): boolean {
  return !hasLocale;
}

export function checkoutUsesDefaultPayCta(hasSubmitType: boolean): boolean {
  return !hasSubmitType;
}

export function checkoutShowsNoMerchantCopy(hasCustomText: boolean): boolean {
  return !hasCustomText;
}

export function sourceSetsSubmitTypeBook(source: string): boolean {
  return /submit_type\s*:\s*['"]book['"]/.test(source);
}

export function sourceSetsSubmitTypeDonate(source: string): boolean {
  return /submit_type\s*:\s*['"]donate['"]/.test(source);
}

export function sourceSetsCustomTextTerms(source: string): boolean {
  return /custom_text\s*:\s*\{[\s\S]{0,240}terms_of_service_acceptance\s*:/.test(
    source
  );
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
