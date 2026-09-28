/**
 * Mirrors public/app.js loadProducts versus the Connect storefront.
 *
 * Open PR #23 locks `data.prices[0]` throwing on an `{ error }` body for
 * product detail / cart. The catalog list path never checks response.ok:
 *
 *   const data = await response.json();
 *   products = data.products || [];
 *
 * A 500 `{ error: "Invalid API Key" }` therefore renders "No products
 * found" instead of the failure. Connect storefront.html does check
 * `response.ok` before reading `data.products`.
 */

export interface CatalogListPayload {
  products?: Array<{ id: string }>;
  error?: string;
}

export function catalogProductsFromListResponse(
  _responseOk: boolean,
  data: CatalogListPayload
): Array<{ id: string }> {
  return data.products || [];
}

export function connectStorefrontProductsFromListResponse(
  responseOk: boolean,
  data: CatalogListPayload
): Array<{ id: string }> {
  if (!responseOk) {
    throw new Error('Failed to load products');
  }
  return data.products as Array<{ id: string }>;
}

export function catalogListChecksResponseOk(): boolean {
  return false;
}
