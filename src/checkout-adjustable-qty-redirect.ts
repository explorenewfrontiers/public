/**
 * Catalog `POST /api/checkout` and Connect `POST /api/checkout` /
 * `POST /api/subscriptions` never set Checkout `adjustable_quantity`,
 * `origin_context`, or `redirect_on_completion`.
 *
 * Without `line_items[].adjustable_quantity`, hosted Checkout cannot
 * let the buyer change quantity (or cap `maximum`). Catalog cart
 * qty is the only control; Connect storefront hardcodes
 * `quantity: 1`. Distinct from `quantity || 1` coercing numeric 0
 * to 1 (#25) and from forwarding 0 / negative / fractional qty
 * (#19) — those are server-side qty bugs, not the hosted stepper.
 *
 * Without `origin_context`, Stripe treats every session as
 * unspecified (web vs mobile / in-app). Wallet eligibility and
 * Radar risk scoring cannot distinguish an in-app Apple Pay
 * session from a desktop browser.
 *
 * Without `redirect_on_completion`, embedded Checkout (if later
 * added with `ui_mode: 'embedded'`, locked as missing in #68)
 * keeps Stripe's default `always` and bounces the buyer off the
 * merchant page after pay.
 *
 * Open coverage PRs lock qty *coercion* (#25), qty *validation*
 * (#19), and `ui_mode` (#68). They do not lock the hosted qty
 * stepper, origin context, or completion redirect.
 */

export interface CheckoutAdjustableQtyRedirectFields {
  hasAdjustableQuantity: boolean;
  hasOriginContext: boolean;
  hasRedirectOnCompletion: boolean;
}

export function sourceSetsAdjustableQuantity(source: string): boolean {
  return /adjustable_quantity\s*:/.test(source);
}

export function sourceSetsOriginContext(source: string): boolean {
  return /origin_context\s*:/.test(source);
}

export function sourceSetsRedirectOnCompletion(source: string): boolean {
  return /redirect_on_completion\s*:/.test(source);
}

export function inspectCheckoutAdjustableQtyRedirect(
  source: string
): CheckoutAdjustableQtyRedirectFields {
  return {
    hasAdjustableQuantity: sourceSetsAdjustableQuantity(source),
    hasOriginContext: sourceSetsOriginContext(source),
    hasRedirectOnCompletion: sourceSetsRedirectOnCompletion(source),
  };
}

export function checkoutCannotAdjustLineQuantity(
  hasAdjustableQuantity: boolean
): boolean {
  return !hasAdjustableQuantity;
}

export function checkoutLeavesOriginContextUnspecified(
  hasOriginContext: boolean
): boolean {
  return !hasOriginContext;
}

export function checkoutAlwaysRedirectsOnCompletion(
  hasRedirectOnCompletion: boolean
): boolean {
  return !hasRedirectOnCompletion;
}

export function sourceSetsAdjustableQuantityMaximum(source: string): boolean {
  return /adjustable_quantity\s*:\s*\{[\s\S]{0,240}maximum\s*:/.test(source);
}

export function sourceSetsMobileOriginContext(source: string): boolean {
  return /origin_context\s*:\s*['"]mobile_app['"]/.test(source);
}

export function sourceSetsIfRequiredRedirectOnCompletion(source: string): boolean {
  return /redirect_on_completion\s*:\s*['"]if_required['"]/.test(source);
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

export function extractCheckoutLineItems(source: string): string {
  const chunks: string[] = [];
  const re = /line_items\s*:/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    chunks.push(source.slice(match.index, match.index + 400));
  }
  return chunks.join('\n---\n');
}
