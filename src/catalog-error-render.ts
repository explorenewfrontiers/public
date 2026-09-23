/**
 * Mirrors public/app.js price/detail/cart rendering when the catalog API
 * returns an error body instead of `{ product, prices }`.
 *
 * loadProductPrice, showProductDetails, and quickAddToCart all do
 * `const price = data.prices[0]` with no guard. An `{ error }` response
 * (or a product with no prices array) throws TypeError and aborts render.
 * showProductDetails then reads `product.images` even when `data.product`
 * is missing.
 *
 * Cart totals use `(item.amount * item.quantity) / 100`. A null
 * unit_amount (usage-based price) coerces to 0 and displays as $0.00.
 * An undefined amount becomes NaN.
 */

export interface CatalogProductPayload {
  product?: { id?: string; name?: string; images?: string[]; description?: string };
  prices?: Array<{ id?: string; unit_amount?: number | null }>;
  error?: string;
}

export function readFirstCatalogPrice(data: CatalogProductPayload): {
  id?: string;
  unit_amount?: number | null;
} {
  return (data.prices as NonNullable<CatalogProductPayload['prices']>)[0];
}

export function formatCartLineTotal(amount: number | null | undefined, quantity: number): string {
  return ((amount as number) * quantity / 100).toFixed(2);
}

export function sumCartDollars(
  items: Array<{ amount: number | null | undefined; quantity: number }>
): number {
  return items.reduce((sum, item) => sum + (item.amount as number) * item.quantity / 100, 0);
}
