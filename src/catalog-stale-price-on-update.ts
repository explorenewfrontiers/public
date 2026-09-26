/**
 * Mirrors src/catalog.ts ID-based update: retrieve + products.update only.
 * Open PR #3 locks create-on-retrieve-failure. Open PR #25 locks
 * retrieve-success + update-failure → duplicate product. Neither locks the
 * happy path: a successful update never creates or updates a Price.
 *
 * Production comment says "find existing product by ID or name" but name
 * lookup is not implemented. Re-syncing a row with an ID and a new Price
 * updates the product name/description/images and leaves the Stripe price
 * at the previous unit_amount.
 */

export function successfulProductUpdateWritesPrice(): boolean {
  return false;
}

export function nameBasedProductLookupImplemented(): boolean {
  return false;
}

export function centsFromCatalogPrice(price: number): number {
  return Math.round(price * 100);
}
