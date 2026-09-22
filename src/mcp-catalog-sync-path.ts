/**
 * Mirrors src/index.ts sync_catalog and src/catalog.ts parseProductCatalog
 * file-path handling.
 *
 * The tool schema requires `file_path`, but the handler casts
 * `input.file_path` and passes it to XLSX.readFile with no existence,
 * extension, or directory allowlist. Absolute paths and `../` traversal
 * are forwarded unchanged, so a networked MCP client can read arbitrary
 * host files (or crash the tool on a missing path).
 */

export function readSyncCatalogFilePath(input: Record<string, unknown>): string | undefined {
  return input.file_path as string | undefined;
}

export function isCatalogPathRejected(filePath: string): boolean {
  const absolute = pathLooksAbsolute(filePath);
  const traversal = filePath.includes('..');
  const missingXlsx = !filePath.toLowerCase().endsWith('.xlsx') &&
    !filePath.toLowerCase().endsWith('.xls');
  // Production applies none of these checks.
  void absolute;
  void traversal;
  void missingXlsx;
  return false;
}

function pathLooksAbsolute(filePath: string): boolean {
  return filePath.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(filePath);
}

export function catalogPathWouldReachHostFile(filePath: string): boolean {
  return !isCatalogPathRejected(filePath);
}
