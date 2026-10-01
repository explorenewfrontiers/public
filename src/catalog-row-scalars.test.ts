import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import XLSX from 'xlsx';
import { parseProductCatalog } from './catalog.js';
import {
  catalogDescriptionCell,
  catalogImageUrlCell,
  catalogNameCell,
  firstSheetName,
  stripeProductNameIsString,
} from './catalog-row-scalars.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function writeWorkbook(
  rows: Array<Record<string, unknown>>,
  extraSheets?: Array<{ name: string; rows: Array<Record<string, unknown>> }>
): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-scalars-'));
  const filePath = path.join(dir, 'catalog.xlsx');
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Products');
  for (const extra of extraSheets ?? []) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(extra.rows),
      extra.name
    );
  }
  XLSX.writeFile(workbook, filePath);
  return filePath;
}

describe('catalog Excel name/description stay unstringified', () => {
  it('keeps numeric Name cells as numbers that Stripe would reject', () => {
    const name = catalogNameCell(12345);
    assert.equal(name, 12345);
    assert.equal(typeof name, 'number');
    assert.equal(stripeProductNameIsString(name), false);
    assert.equal(catalogNameCell('Coffee'), 'Coffee');
    assert.equal(catalogNameCell(''), 'Unnamed Product');
    assert.equal(catalogDescriptionCell(2024), 2024);
    assert.equal(catalogImageUrlCell(0), '');
  });

  it('parseProductCatalog preserves a numeric Name from Excel', async () => {
    const filePath = writeWorkbook([
      { Name: 12345, Price: 10, Description: 2024 },
    ]);
    const rows = await parseProductCatalog(filePath);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.name, 12345);
    assert.equal(typeof rows[0]?.name, 'number');
    assert.equal(stripeProductNameIsString(rows[0]?.name), false);
    assert.equal(rows[0]?.description, 2024);
    assert.equal(typeof rows[0]?.description, 'number');
  });

  it('imports only the first worksheet and drops products on later sheets', async () => {
    assert.equal(firstSheetName(['Products', 'More']), 'Products');
    const filePath = writeWorkbook([{ Name: 'First', Price: 1 }], [
      { name: 'More', rows: [{ Name: 'Second', Price: 99 }] },
    ]);
    const rows = await parseProductCatalog(filePath);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.name, 'First');
    assert.equal(
      rows.some((row) => row.name === 'Second'),
      false
    );
  });
});

describe('catalog row scalar source stays aligned', () => {
  it('casts Name/Description with as string and reads SheetNames[0] unguarded', () => {
    const catalog = readRepo('src/catalog.ts');

    assert.match(
      catalog,
      /name: \(row\['Name'\] \|\| row\['name'\] \|\| 'Unnamed Product'\) as string/
    );
    assert.match(
      catalog,
      /description: \(row\['Description'\] \|\| row\['description'\] \|\| ''\) as string/
    );
    assert.match(catalog, /const sheetName = workbook\.SheetNames\[0\];/);
    assert.match(catalog, /const worksheet = workbook\.Sheets\[sheetName\];/);
    assert.equal(catalog.includes('String(row'), false);
    assert.equal(catalog.includes('SheetNames.length'), false);
  });
});
