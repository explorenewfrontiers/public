/**
 * Documents syncProductsToStripe control flow in src/catalog.ts:
 * the outer catch's fallback products.create is not wrapped, so a second
 * failure aborts the for-loop and remaining Excel rows are never processed.
 *
 * Open PR #25 locks retrieve/update failure creating a duplicate. It does
 * not lock partial-sync abort when that fallback create also throws.
 */

export type SyncAbortCall = {
  name: string;
  phase: 'retrieve' | 'create' | 'price';
};

export function shouldAbortRemainingProducts(
  fallbackCreateThrew: boolean
): boolean {
  return fallbackCreateThrew;
}
