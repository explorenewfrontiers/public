/**
 * Mirrors remaining catalog / storefront contracts that prior coverage
 * PRs do not lock down:
 *
 * - parseProductCatalog reads workbook.SheetNames[0] with no empty-workbook
 *   guard. A file with zero sheets throws and aborts MCP sync_catalog.
 * - Excel numeric ID cells stay numbers (`(row['ID'] || '') as string` does
 *   not coerce). A numeric id is truthy, so sync tries retrieve() then
 *   falls through to create-on-error (duplicate).
 * - Catalog POST /api/checkout does `items.map` with no array guard.
 * - Connect GET /api/products/:accountId hardcodes limit: 20 and omits
 *   Stripe's has_more, so a 21st product never appears in the storefront.
 */

export function firstSheetName(sheetNames: string[]): string | undefined {
  return sheetNames[0];
}

export function catalogRowId(row: Record<string, unknown>): unknown {
  return row['ID'] || row['id'] || '';
}

export function mapCatalogCheckoutItems(body: unknown): Array<{
  price: string;
  quantity: number;
}> {
  const { items } = body as { items: Array<{ priceId: string; quantity: number }> };
  return items.map((item) => ({
    price: item.priceId,
    quantity: item.quantity,
  }));
}

export const CONNECT_PRODUCT_LIST_LIMIT = 20;

export function connectProductListExposesHasMore(): boolean {
  return false;
}
