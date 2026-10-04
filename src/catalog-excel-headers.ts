/**
 * Mirrors parseProductCatalog row mapping in src/catalog.ts.
 *
 * Open PRs #25/#28/#33/#35/#38 lock numeric/date/boolean cell values.
 * They do not lock header matching: keys are read as exact 'Name'/'Price'
 * (and lowercase aliases) with no trim. A header of ' Price ' or 'Name '
 * yields Unnamed Product at $0.
 */

export type CatalogRow = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image_url: string;
  category: string;
  sku: string;
};

export function parseCatalogRow(row: Record<string, unknown>): CatalogRow {
  return {
    id: (row['ID'] || row['id'] || '') as string,
    name: (row['Name'] || row['name'] || 'Unnamed Product') as string,
    description: (row['Description'] || row['description'] || '') as string,
    price: parseFloat((row['Price'] || row['price'] || '0') as string),
    currency: ((row['Currency'] || row['currency'] || 'usd') as string).toLowerCase(),
    image_url: (row['Image URL'] || row['image_url'] || '') as string,
    category: (row['Category'] || row['category'] || '') as string,
    sku: (row['SKU'] || row['sku'] || '') as string,
  };
}

export function headerLookup(
  row: Record<string, unknown>,
  aliases: string[]
): unknown {
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(row, alias)) {
      return row[alias];
    }
  }
  return undefined;
}
