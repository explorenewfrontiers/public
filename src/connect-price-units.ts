/**
 * Mirrors dashboard price entry vs Connect POST /api/products.
 *
 * The form label is "Price (in dollars)" and the client sends
 * Math.round(parseFloat(price) * 100) as priceInCents. The server then
 * parseInt(priceInCents) and uses it as Stripe unit_amount (cents).
 *
 * Open PR #12 locks parseInt truncation of the string "10.99" and rejection
 * of 0. This locks the dollar→cent client contract: if either side drops
 * the * 100 (or a direct API client sends dollars into priceInCents),
 * Stripe charges ~100x too little.
 */

export function dashboardDollarsToCents(price: string): number {
  return Math.round(parseFloat(price) * 100);
}

export function serverParsePriceInCents(priceInCents: unknown): number {
  return parseInt(priceInCents as string);
}

export function productCreateAcceptsPrice(priceInCents: unknown): boolean {
  const accountId = 'acct_x';
  const name = 'Widget';
  return Boolean(accountId && name && priceInCents);
}
