/**
 * Catalog `POST /api/checkout` and Connect `POST /api/checkout` plus
 * `POST /api/subscriptions` create Stripe Checkout Sessions without
 * `automatic_tax`, `billing_address_collection`, or `expires_at`.
 * Catalog `prices.create` and Connect `default_price_data` also omit
 * `tax_behavior`. Stripe Tax cannot calculate sales tax, AVS/tax has no
 * required billing address, and unpaid sessions keep the default 24h
 * window instead of a locked expiry.
 *
 * Open coverage PRs lock Checkout mode/payment_method_types (#33, #37),
 * success/cancel URLs (#12, #28), and missing metadata (#38). They do not
 * lock tax, billing address, or session expiry on the money paths.
 */

export interface CheckoutTaxFields {
  hasAutomaticTax: boolean;
  hasBillingAddressCollection: boolean;
  hasExpiresAt: boolean;
  hasTaxBehavior: boolean;
}

export function sourceEnablesAutomaticTax(source: string): boolean {
  return /automatic_tax\s*:/.test(source);
}

export function sourceSetsBillingAddressCollection(source: string): boolean {
  return /billing_address_collection\s*:/.test(source);
}

export function sourceSetsCheckoutExpiresAt(source: string): boolean {
  return /expires_at\s*:/.test(source);
}

export function sourceSetsPriceTaxBehavior(source: string): boolean {
  return /tax_behavior\s*:/.test(source);
}

export function inspectCheckoutTaxFields(source: string): CheckoutTaxFields {
  return {
    hasAutomaticTax: sourceEnablesAutomaticTax(source),
    hasBillingAddressCollection: sourceSetsBillingAddressCollection(source),
    hasExpiresAt: sourceSetsCheckoutExpiresAt(source),
    hasTaxBehavior: sourceSetsPriceTaxBehavior(source),
  };
}

export function stripeTaxWouldCalculate(fields: CheckoutTaxFields): boolean {
  return fields.hasAutomaticTax && fields.hasTaxBehavior;
}

export function checkoutCollectsRequiredBillingAddress(source: string): boolean {
  return /billing_address_collection\s*:\s*['"]required['"]/.test(source);
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

export function extractPriceCreates(source: string): string {
  const chunks: string[] = [];
  const re = /(?:prices\.create|default_price_data)\s*[:=({]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    chunks.push(source.slice(match.index, match.index + 400));
  }
  return chunks.join('\n---\n');
}
