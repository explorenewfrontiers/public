/**
 * Mirrors catalog/MCP product listing: a single `products.list` page is
 * returned as `.data` (has_more is dropped), list_products has no
 * starting_after, and limits are not clamped to Stripe's 1–100 range.
 *
 * Open PR #27 locks Connect GET /api/products/:accountId `limit: 20` and
 * omitted has_more. This locks the *catalog website and MCP list_products*
 * pagination contract.
 */

export function catalogApiLimit(queryLimit: unknown): number {
  return parseInt(queryLimit as string) || 20;
}

export function mcpListProductsLimit(inputLimit: unknown): number {
  return (inputLimit as number) || 10;
}

export function stripeProductListParams(limit: number): {
  limit: number;
  active: true;
} {
  return { limit, active: true };
}

export function mappedProductList<T>(list: {
  data: T[];
  has_more: boolean;
}): T[] {
  return list.data;
}

export function listProductsSchemaHasStartingAfter(schemaRequiredAndProps: {
  properties: Record<string, unknown>;
}): boolean {
  return 'starting_after' in schemaRequiredAndProps.properties;
}
