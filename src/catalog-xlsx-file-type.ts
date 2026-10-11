/**
 * Mirrors catalog ingest in src/catalog.ts:
 *   const workbook = XLSX.readFile(filePath);
 *
 * Open PRs #3/#22/#26/#28/#34/#38/#39/#46/#50 lock Excel cell shapes,
 * path sandbox, and workbook headers. They all construct real .xlsx
 * workbooks. They do not lock that readFile is called with no options
 * and no extension allowlist, so HTML tables, CSV, SpreadsheetML XML,
 * and a .xlsx path whose bytes are HTML are ingested as catalogs.
 */

export const NON_XLSX_CATALOG_EXTENSIONS = [
  '.html',
  '.csv',
  '.xml',
  '.txt',
] as const;

export function sourceRestrictsCatalogExtension(source: string): boolean {
  return (
    source.includes('.xlsx') &&
    (source.includes('endsWith') ||
      source.includes('extname') ||
      source.includes('allowlist') ||
      source.includes('ALLOWED_'))
  );
}

export function sourcePassesReadFileOptions(source: string): boolean {
  return /XLSX\.readFile\(\s*filePath\s*,/.test(source);
}

export function productionAllowlistsCatalogFileType(): boolean {
  return false;
}
