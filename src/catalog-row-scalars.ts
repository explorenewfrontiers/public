/**
 * Mirrors parseProductCatalog name/description/image_url typing and first-sheet
 * selection.
 *
 * Open PR #33 locks numeric SKU/category metadata. Open PR #27 locks numeric
 * ID cells on the retrieve path. Open PR #25 locks numeric Currency throwing.
 *
 * Name, description, and image_url use the same `as string` lie. A numeric
 * Excel Name stays a number; Stripe Product.name must be a string, so
 * products.create rejects the row. Only `SheetNames[0]` is read, so products
 * on later sheets are silently dropped.
 */

export function catalogNameCell(cell: unknown): unknown {
  return (cell || 'Unnamed Product') as string;
}

export function catalogDescriptionCell(cell: unknown): unknown {
  return (cell || '') as string;
}

export function catalogImageUrlCell(cell: unknown): unknown {
  return (cell || '') as string;
}

export function stripeProductNameIsString(name: unknown): boolean {
  return typeof name === 'string';
}

export function firstSheetName(sheetNames: string[]): string | undefined {
  return sheetNames[0];
}
