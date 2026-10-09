/**
 * Mirrors catalog Excel Image URL ingest in src/catalog.ts.
 *
 * Open PR #46 locks formula prefixes in Name / Description / SKU cells.
 * It does not lock Image URL cells that start with `=`, `+`, `-`, `@`,
 * `=HYPERLINK(`, or `=CMD|`. Those strings are stored as image_url and
 * later passed to Stripe Product.images, then interpolated into
 * catalog <img src> in public/app.js.
 */

export const EXCEL_FORMULA_PREFIXES = ['=', '+', '-', '@'] as const;

export function looksLikeExcelFormula(value: unknown): boolean {
  if (typeof value !== 'string' || value.length === 0) {
    return false;
  }
  const trimmed = value.replace(/^[\t\r\n ]+/, '');
  if (EXCEL_FORMULA_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
    return true;
  }
  const upper = trimmed.toUpperCase();
  return upper.startsWith('=CMD|') || upper.includes('HYPERLINK(');
}

export function stripeImagesFromCatalogRow(
  imageUrl: string
): string[] | undefined {
  return imageUrl ? [imageUrl] : undefined;
}

export function productionSanitizesImageUrlFormulas(): boolean {
  return false;
}
