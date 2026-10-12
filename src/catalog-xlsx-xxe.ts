/**
 * parseProductCatalog calls XLSX.readFile(filePath) with no options.
 * PR #51 shows SpreadsheetML XML without a DOCTYPE is imported as a
 * catalog. A DOCTYPE / XXE payload takes a different path: SheetJS does
 * not expand the entity, and SpreadsheetML+DOCTYPE crashes readFile
 * instead of rejecting the file as unsupported.
 */

export const XXE_ENTITY_LITERAL = '&xxe;';

export function sourcePassesReadFileOptions(parseBody: string): boolean {
  return /XLSX\.readFile\(\s*filePath\s*,/.test(parseBody);
}

export function sourceDisablesXmlDtd(parseBody: string): boolean {
  return /DTD|XML_PARSE_NOENT|noent|disableEntityExpansion/i.test(parseBody);
}

export function looksLikePasswdLeak(value: string): boolean {
  return /root:.*:0:0:/.test(value);
}

export function productionHardensXxe(): boolean {
  return false;
}
