/**
 * Catalog `POST /api/checkout` and Connect `POST /api/checkout` /
 * `POST /api/subscriptions` never set Checkout `shipping_options`,
 * `payment_method_options`, or `permissions`.
 *
 * Without `shipping_options`, hosted Checkout cannot attach a
 * shipping rate (or restrict destination countries). Catalog rows
 * already carry SKU / category / images for physical goods, and
 * #61 locked the missing `shipping_address_collection` — collecting
 * an address without a rate still ships for $0 and never blocks
 * unsupported regions.
 *
 * Without `payment_method_options`, per-method knobs stay at Stripe
 * defaults: card installments cannot be offered or refused, and
 * method-specific 3DS cannot be required. Distinct from the
 * session-level `payment_method_types` allowlist (#33) and the
 * PaymentIntent `request_three_d_secure` flag (#63).
 *
 * Without `permissions.update_shipping_details`, a Checkout session
 * cannot let the buyer (or a fulfillment worker) change the ship-to
 * after the session is created — stale address from #61 stays final.
 *
 * Open coverage PRs lock shipping *address* (#61), card-only vs
 * unset method types (#33), and request_three_d_secure (#63). They
 * do not lock shipping *rates*, per-method options, or session
 * permissions.
 */

export interface CheckoutShippingPmPermissionFields {
  hasShippingOptions: boolean;
  hasPaymentMethodOptions: boolean;
  hasPermissions: boolean;
}

export function sourceSetsShippingOptions(source: string): boolean {
  return /shipping_options\s*:/.test(source);
}

export function sourceSetsPaymentMethodOptions(source: string): boolean {
  return /payment_method_options\s*:/.test(source);
}

export function sourceSetsCheckoutPermissions(source: string): boolean {
  return /permissions\s*:\s*\{/.test(source);
}

export function inspectCheckoutShippingPmPermissions(
  source: string
): CheckoutShippingPmPermissionFields {
  return {
    hasShippingOptions: sourceSetsShippingOptions(source),
    hasPaymentMethodOptions: sourceSetsPaymentMethodOptions(source),
    hasPermissions: sourceSetsCheckoutPermissions(source),
  };
}

export function checkoutCannotChargeShipping(hasShippingOptions: boolean): boolean {
  return !hasShippingOptions;
}

export function checkoutLeavesMethodOptionsAtDefaults(
  hasPaymentMethodOptions: boolean
): boolean {
  return !hasPaymentMethodOptions;
}

export function checkoutCannotUpdateShippingAfterCreate(
  hasPermissions: boolean
): boolean {
  return !hasPermissions;
}

export function sourceSetsShippingRateOption(source: string): boolean {
  return /shipping_options\s*:\s*\[[\s\S]{0,240}shipping_rate\s*:/.test(source);
}

export function sourceSetsCardInstallments(source: string): boolean {
  return /payment_method_options\s*:\s*\{[\s\S]{0,240}card\s*:[\s\S]{0,240}installments\s*:/.test(
    source
  );
}

export function sourceAllowsUpdateShippingDetails(source: string): boolean {
  return /permissions\s*:\s*\{[\s\S]{0,240}update_shipping_details\s*:/.test(
    source
  );
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
