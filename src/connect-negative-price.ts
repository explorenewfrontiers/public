/**
 * Mirrors stripe-connect-sample/server.ts POST /api/products price validation.
 *
 * Required-field checks are truthy-only (`!priceInCents`), so 0 is rejected
 * but negative cents are accepted. The amount is then `parseInt(priceInCents)`,
 * which also accepts hex strings (`0x10` → 16) and truncates decimals.
 *
 * Open PR #12 locks the zero-price reject and `10.99` truncation. This module
 * locks the remaining signed/radix coercion that still reaches Stripe.
 */

export function productPriceFieldAccepted(priceInCents: unknown): boolean {
  return Boolean(priceInCents);
}

export function parseConnectedProductPriceInCents(priceInCents: unknown): number {
  return parseInt(priceInCents as string);
}

export function buildConnectedProductPriceData(input: {
  priceInCents: unknown;
  currency?: string;
}): { unit_amount: number; currency: string } {
  return {
    unit_amount: parseConnectedProductPriceInCents(input.priceInCents),
    currency: input.currency || 'usd',
  };
}
