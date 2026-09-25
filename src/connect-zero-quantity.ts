/**
 * Mirrors stripe-connect-sample/server.ts POST /api/checkout quantity
 * coalescing that previous coverage PRs do not lock down.
 *
 * Open PR #14 locks string `"0"` staying truthy (so it does not default)
 * and the `Math.round(qty * 0.1)` fee formula. Production still uses
 * `quantity || 1` for the Checkout line item. A numeric `0` is falsy, so
 * a client that sends `{ quantity: 0 }` is charged for 1 unit.
 */

export function checkoutLineQuantity(quantity: unknown): unknown {
  return quantity || 1;
}

export function checkoutApplicationFeeAmount(quantity: unknown): number {
  return Math.round(((quantity as number) || 1) * 0.1);
}

export function numericZeroQuantityCoercesToOne(): boolean {
  return checkoutLineQuantity(0) === 1;
}
