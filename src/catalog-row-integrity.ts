/**
 * Mirrors src/catalog.ts parse/sync edge cases that previous coverage PRs
 * do not lock down.
 *
 * Open PR #5 locks non-numeric Price → NaN and first-sheet-only reads.
 * Open PR #3 locks create-on-retrieve-failure as the intended fallback.
 *
 * Production still does:
 *   ((row['Currency'] || row['currency'] || 'usd') as string).toLowerCase()
 * Excel often stores ISO numeric codes (840) as numbers, and Number has no
 * toLowerCase — the whole catalog parse throws.
 *
 * A row with only Category/SKU (no Name/Price) becomes "Unnamed Product"
 * at $0.00 and is created in Stripe.
 *
 * If retrieve succeeds and update then fails, the inner catch rethrows into
 * the outer catch, which creates a second product (duplicate at a new id).
 */

export function parseCurrencyCell(value: unknown): string {
  return ((value || 'usd') as string).toLowerCase();
}

export function defaultProductName(name: unknown): string {
  return (name || 'Unnamed Product') as string;
}

export function defaultProductPrice(price: unknown): number {
  return parseFloat((price || '0') as string);
}

export function updateFailureCreatesDuplicateProduct(): boolean {
  return true;
}
