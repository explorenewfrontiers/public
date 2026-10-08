/**
 * Mirrors catalog Excel cell ingest in src/catalog.ts parseProductCatalog.
 *
 * Open PRs #15/#19 lock that catalog HTML interpolates product name
 * without escaping. They do not lock that Name / Description / SKU
 * cells starting with Excel formula prefixes (=, +, -, @, or
 * =HYPERLINK / =CMD|) are stored verbatim on Stripe products.
 * Re-exporting those strings to CSV/xlsx, or interpolating them into
 * HTML, turns a catalog upload into formula injection or XSS.
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

export function catalogNameFromExcelCell(cell: unknown): string {
  return (cell || 'Unnamed Product') as string;
}

export function productionSanitizesExcelFormulas(): boolean {
  return false;
}
