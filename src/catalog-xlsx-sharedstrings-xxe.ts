/**
 * PR #52 locks SpreadsheetML+DOCTYPE: XLSX.readFile throws (no /etc/passwd
 * leak). A real .xlsx is a ZIP whose xl/sharedStrings.xml can carry the
 * same DOCTYPE / file entity. SheetJS does not expand that entity — the
 * catalog imports the literal "&xxe;" as the product name and still
 * creates a Stripe product. Production still calls unoptioned
 * XLSX.readFile(filePath).
 *
 * Open coverage PRs #51/#52 lock SpreadsheetML ingest and the DOCTYPE
 * crash path. They do not lock OOXML sharedStrings XXE.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';

export const XXE_ENTITY_LITERAL = '&xxe;';

export const SHARED_STRINGS_XXE_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<!DOCTYPE sst [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="3" uniqueCount="3"><si><t>Name</t></si><si><t>Price</t></si><si><t>&xxe;</t></si></sst>
`;

export function sourcePassesReadFileOptions(parseBody: string): boolean {
  return /XLSX\.readFile\(\s*filePath\s*,/.test(parseBody);
}

export function sourceDisablesXmlDtd(parseBody: string): boolean {
  return /DTD|XML_PARSE_NOENT|noent|disableEntityExpansion/i.test(parseBody);
}

export function looksLikePasswdLeak(value: string): boolean {
  return /root:.*:0:0:/.test(value);
}

export function nameIsLiteralXxeEntity(name: string): boolean {
  return name === XXE_ENTITY_LITERAL;
}

export function writeSharedStringsXxeWorkbook(dir: string): string {
  const cleanPath = path.join(dir, 'clean.xlsx');
  const outPath = path.join(dir, 'sharedstrings-xxe.xlsx');
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([{ Name: 'SAFE', Price: 1 }]),
    'Sheet1'
  );
  XLSX.writeFile(workbook, cleanPath, { bookSST: true });

  const extractDir = path.join(dir, 'extract');
  fs.mkdirSync(extractDir);
  execFileSync('unzip', ['-q', cleanPath, '-d', extractDir]);

  const sharedStringsPath = path.join(extractDir, 'xl/sharedStrings.xml');
  if (!fs.existsSync(sharedStringsPath)) {
    throw new Error('expected bookSST workbook to contain xl/sharedStrings.xml');
  }
  fs.writeFileSync(sharedStringsPath, SHARED_STRINGS_XXE_XML);

  execFileSync('zip', ['-q', '-r', outPath, '.'], { cwd: extractDir });
  return outPath;
}

export function productionExpandsSharedStringsXxe(): boolean {
  return false;
}
