/**
 * Mirrors catalog and Connect money conversion that prior coverage PRs
 * do not lock down.
 *
 * Open PR #17 locks null unit_amount displayed as `$0.00`. Open PR #28
 * locks Excel `$10.00` / `1,299.00` parse. Neither locks currency
 * exponent. Stripe treats JPY/KRW/VND (and other zero-decimal codes) as
 * whole currency units — `unit_amount: 500` is ¥500, not ¥5.00.
 *
 * Production always does:
 *   catalog sync:  Math.round(product.price * 100)
 *   catalog UI:    `$${ (unit_amount / 100).toFixed(2) }`
 *   Connect UI:    `$${ (product.price / 100).toFixed(2) }`
 * so a ¥500 row is stored as 50000 (¥50,000) and a correctly stored
 * ¥500 price is shown as `$5.00`. EUR/GBP prices are also prefixed `$`.
 */

export const STRIPE_ZERO_DECIMAL_CURRENCIES = [
  'bif',
  'clp',
  'djf',
  'gnf',
  'jpy',
  'kmf',
  'krw',
  'mga',
  'pyg',
  'rwf',
  'ugx',
  'vnd',
  'vuv',
  'xaf',
  'xof',
  'xpf',
] as const;

export function catalogUnitAmountCents(price: number, _currency?: string): number {
  return Math.round(price * 100);
}

export function catalogListPriceLabel(
  unitAmount: number | null | undefined,
  _currency?: string
): string {
  return `$${((unitAmount as number) / 100).toFixed(2)}`;
}

export function connectStorefrontPriceLabel(
  unitAmount: number | null | undefined,
  _currency?: string
): string {
  const price = ((unitAmount as number) / 100).toFixed(2);
  return `$${price}`;
}

export function stripeZeroDecimalUnitAmount(majorUnits: number): number {
  return majorUnits;
}
