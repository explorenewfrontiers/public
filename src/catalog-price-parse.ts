/**
 * Mirrors src/catalog.ts Excel money parsing that prior coverage PRs
 * do not lock down.
 *
 * Open PR #5 treats a non-numeric Price as NaN. Real merchant sheets
 * more often use currency symbols and thousands separators:
 *   parseFloat('$10.00') === NaN
 *   parseFloat('1,299.00') === 1
 *   parseFloat('10,50') === 10
 * Those values then become unit_amount via Math.round(price * 100),
 * so Stripe is asked to charge NaN cents or $0.01 instead of $1,299.
 *
 * Currency cells are only `.toLowerCase()`'d. Whitespace around an
 * ISO code (`' USD '`) becomes `' usd '`, which Stripe rejects.
 *
 * Catalog checkout maps `item.priceId` with no required-field check,
 * so a missing/blank priceId is forwarded as `price: undefined`.
 */

export function parseCatalogPrice(raw: unknown): number {
  return parseFloat((raw || '0') as string);
}

export function normalizeCatalogCurrency(raw: unknown): string {
  return ((raw || 'usd') as string).toLowerCase();
}

export function catalogUnitAmountCents(price: number): number {
  return Math.round(price * 100);
}

export function mapCheckoutLineItem(item: {
  priceId?: string;
  quantity?: number;
}): { price: string | undefined; quantity: number | undefined } {
  return {
    price: item.priceId,
    quantity: item.quantity,
  };
}
