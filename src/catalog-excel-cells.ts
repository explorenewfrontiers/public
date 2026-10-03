/**
 * Mirrors parseProductCatalog cell coercion in src/catalog.ts.
 *
 * Open PRs #25/#28/#33/#35 lock numeric Currency/SKU/Name/ID and $-prefixed
 * prices. They do not lock: SheetNames[0] with an empty workbook, Excel
 * Date-serial Price cells becoming huge dollar amounts, or boolean Name/Price
 * cells staying non-strings.
 */

export type CatalogWorkbook = {
  SheetNames: string[];
  Sheets: Record<string, unknown>;
};

export function firstSheetName(workbook: CatalogWorkbook): string | undefined {
  return workbook.SheetNames[0];
}

export function coerceCatalogRow(row: Record<string, unknown>): {
  id: unknown;
  name: unknown;
  description: unknown;
  price: number;
  currency: unknown;
  image_url: unknown;
  category: unknown;
  sku: unknown;
} {
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

export function excelDateSerialToUnitAmount(serial: number): number {
  return Math.round(serial * 100);
}
