/**
 * Catalog Checkout, Connect Checkout, and MCP `create_payment_intent`
 * never set `capture_method` or `payment_method_options.card.request_three_d_secure`.
 *
 * Stripe defaults `capture_method` to `automatic`, so funds are captured
 * immediately. Catalog rows carry SKU / category / images (physical
 * goods), but there is no auth-then-capture window to cancel before
 * shipment. Connect Checkout already sends
 * `payment_intent_data.application_fee_amount` without `capture_method`.
 *
 * `request_three_d_secure` defaults to `automatic`. For an unauthenticated
 * catalog / Connect storefront that also skips billing address (#59) and
 * phone (#this run), that leaves SCA/3DS as Stripe's default rather than
 * an explicit `any` / `challenge` requirement on card payments.
 *
 * Open coverage PRs lock payment_method_types (#33), automatic_tax (#59),
 * and customer/invoice/shipping (#61). They do not lock capture or 3DS.
 */

export interface CaptureAndThreeDsFields {
  hasCaptureMethod: boolean;
  hasManualCapture: boolean;
  hasRequestThreeDSecure: boolean;
  hasExplicitThreeDSecureChallenge: boolean;
}

export function sourceSetsCaptureMethod(source: string): boolean {
  return /capture_method\s*:/.test(source);
}

export function sourceSetsManualCapture(source: string): boolean {
  return /capture_method\s*:\s*['"]manual['"]/.test(source);
}

export function sourceSetsRequestThreeDSecure(source: string): boolean {
  return /request_three_d_secure\s*:/.test(source);
}

export function sourceRequiresThreeDSecureChallenge(source: string): boolean {
  return /request_three_d_secure\s*:\s*['"](?:any|challenge)['"]/.test(source);
}

export function inspectCaptureAndThreeDsFields(source: string): CaptureAndThreeDsFields {
  return {
    hasCaptureMethod: sourceSetsCaptureMethod(source),
    hasManualCapture: sourceSetsManualCapture(source),
    hasRequestThreeDSecure: sourceSetsRequestThreeDSecure(source),
    hasExplicitThreeDSecureChallenge: sourceRequiresThreeDSecureChallenge(source),
  };
}

export function physicalGoodsCapturedBeforeFulfillment(args: {
  catalogHasPhysicalSignals: boolean;
  hasManualCapture: boolean;
}): boolean {
  return args.catalogHasPhysicalSignals && !args.hasManualCapture;
}

export function cardPaymentsSkipExplicit3ds(hasRequestThreeDSecure: boolean): boolean {
  return !hasRequestThreeDSecure;
}

export function catalogSourceHasPhysicalProductSignals(source: string): boolean {
  const hasSku = /\bSKU\b/.test(source) || /\bsku\b/.test(source);
  const hasCategory = /\bCategory\b/.test(source) || /\bcategory\b/.test(source);
  const hasImage = /Image URL/.test(source) || /image_url/.test(source);
  return hasSku && hasCategory && hasImage;
}

export function extractMoneyCreates(source: string): string {
  const chunks: string[] = [];
  const re = /(?:checkout\.sessions\.create|paymentIntents\.create)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    chunks.push(source.slice(match.index, match.index + 900));
  }
  return chunks.join('\n---\n');
}

export function connectCheckoutSetsApplicationFeeWithoutCapture(source: string): boolean {
  const hasFee = /application_fee_amount\s*:/.test(source);
  const hasCapture = sourceSetsCaptureMethod(source);
  return hasFee && !hasCapture;
}
