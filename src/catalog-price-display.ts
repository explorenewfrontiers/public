/**
 * Mirrors public/app.js loadProductPrice / showProductDetails amount formatting
 * and src/web-server.ts GET /api/products limit parsing.
 */

export function formatCatalogUnitAmount(unitAmount: number | null | undefined): string {
  return ((unitAmount as number) / 100).toFixed(2);
}

export function catalogListPriceLabel(
  prices: Array<{ unit_amount: number | null }> | undefined
): string | null {
  const price = prices?.[0];
  if (price) {
    return `$${formatCatalogUnitAmount(price.unit_amount)}`;
  }
  return null;
}

export function catalogModalAmount(
  prices: Array<{ unit_amount: number | null }> | undefined
): string {
  const price = prices?.[0];
  return price ? formatCatalogUnitAmount(price.unit_amount) : 'N/A';
}

export function parseCatalogProductLimit(queryLimit: unknown): number {
  return parseInt(queryLimit as string) || 20;
}
