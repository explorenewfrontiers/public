/**
 * Mirrors parseProductCatalog in src/catalog.ts.
 *
 * sheet_to_json is called with no proto-safe options. A workbook whose
 * header row includes __proto__ or constructor is still ingested; xlsx
 * currently mangles those keys (e.g. __proto___NaN) rather than
 * dropping them. Production never filters proto/constructor keys and
 * copies category/sku into metadata without sanitizing the source row.
 *
 * Open PR #46 locks formula text in Name/SKU cells. It does not lock
 * prototype-key column names.
 */

export const PROTO_HEADER_ALIASES = ['__proto__', 'constructor', 'prototype'] as const;

export function rowHasProtoKey(row: Record<string, unknown>): boolean {
  return Object.keys(row).some((key) => {
    const normalized = key.toLowerCase().replace(/_nan$/i, '');
    return (
      normalized === '__proto__' ||
      normalized === 'constructor' ||
      normalized === 'prototype' ||
      key.includes('__proto__') ||
      key.includes('constructor')
    );
  });
}

export function productionFiltersProtoHeaders(source: string): boolean {
  return (
    source.includes('__proto__') ||
    source.includes('hasOwnProperty') ||
    source.includes('Object.hasOwn') ||
    source.includes('Object.create(null)')
  );
}
