/**
 * parseProductCatalog maps every sheet_to_json row with no cap, and
 * syncProductsToStripe then products.create/prices.create per row.
 * A large Excel file becomes unbounded Stripe writes (cost + rate limits).
 *
 * Open coverage PRs #3/#25/#38 lock parse/sync cell shapes and first-sheet
 * behavior. They do not lock a max row count before Stripe is called.
 */

export const UNBOUNDED_CATALOG_ROW_COUNT = 250;

export function sourceCapsParsedCatalogRows(parseBody: string): boolean {
  return (
    /\.slice\s*\(/.test(parseBody) ||
    /maxRows|MAX_ROWS|rowLimit|ROW_LIMIT/.test(parseBody) ||
    /sheet_to_json\([^)]*range/.test(parseBody)
  );
}

export function sourceCapsStripeSyncLoop(syncBody: string): boolean {
  return (
    /\.slice\s*\(/.test(syncBody) ||
    /maxRows|MAX_ROWS|rowLimit|ROW_LIMIT/.test(syncBody) ||
    /products\.length\s*[<>]=/.test(syncBody)
  );
}

export function productionCapsCatalogRows(): boolean {
  return false;
}
