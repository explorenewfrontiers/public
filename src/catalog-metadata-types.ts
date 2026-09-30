/**
 * Mirrors Excel → Stripe metadata typing in parseProductCatalog.
 *
 * Open PR #27 locks numeric ID cells staying numbers (retrieve-then-create).
 * Open PR #25 locks numeric Currency cells throwing on toLowerCase.
 *
 * Category and SKU are stored on product.metadata. Stripe requires every
 * metadata value to be a string (max 500 chars). Excel often stores SKU
 * and category as numbers; `as string` is a compile-time lie, so those
 * values are forwarded as numbers and products.create / update reject the
 * payload. The outer sync catch then retries create with the same
 * non-string metadata.
 *
 * SKU 0 is also falsy, so `row['SKU'] || ''` drops a real SKU of 0.
 */

export function catalogMetadataValue(cell: unknown): unknown {
  return (cell || '') as string;
}

export function stripeMetadataValuesAreStrings(metadata: Record<string, unknown>): boolean {
  return Object.values(metadata).every((value) => typeof value === 'string');
}

export function buildCatalogRowMetadata(row: Record<string, unknown>): Record<string, unknown> {
  return {
    category: catalogMetadataValue(row['Category'] || row['category']),
    sku: catalogMetadataValue(row['SKU'] || row['sku']),
  };
}
