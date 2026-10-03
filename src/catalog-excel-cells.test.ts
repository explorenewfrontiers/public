import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import XLSX from 'xlsx';
import { parseProductCatalog } from './catalog.js';
import {
  coerceCatalogRow,
  excelDateSerialToUnitAmount,
  firstSheetName,
} from './catalog-excel-cells.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Excel workbook sheet selection and cell types', () => {
  it('selects undefined as the first sheet of an empty workbook', () => {
    const workbook = { SheetNames: [], Sheets: {} };
    assert.equal(firstSheetName(workbook), undefined);
  });

  it('treats an Excel date-serial Price as dollars (100x to cents)', () => {
    const serial = 45488;
    const row = coerceCatalogRow({ Name: 'Dated', Price: serial });
    assert.equal(row.price, 45488);
    assert.equal(excelDateSerialToUnitAmount(row.price), 4_548_800);
    assert.ok(row.price > 1000);
  });

  it('keeps boolean Name and parses boolean Price as NaN', () => {
    const row = coerceCatalogRow({ Name: true, Price: true });
    assert.equal(row.name, true);
    assert.equal(typeof row.name, 'boolean');
    assert.equal(Number.isNaN(row.price), true);
  });

  it('parses a real workbook with boolean Name and numeric date-serial Price', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-excel-'));
    const filePath = path.join(dir, 'catalog.xlsx');

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Name', 'Price', 'Currency'],
      [true, 45488, 'usd'],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Catalog');
    XLSX.writeFile(workbook, filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 1);
    assert.equal(products[0]?.price, 45488);
    assert.equal(typeof products[0]?.name === 'boolean' || products[0]?.name === 'TRUE' || products[0]?.name === 'true', true);

    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('Excel cell coercion source stays aligned', () => {
  it('uses SheetNames[0] and parseFloat without cell-type guards', () => {
    const catalog = readRepo('src/catalog.ts');

    assert.match(catalog, /const sheetName = workbook\.SheetNames\[0\];/);
    assert.match(catalog, /const worksheet = workbook\.Sheets\[sheetName\];/);
    assert.equal(catalog.includes('SheetNames.length'), false);
    assert.equal(catalog.includes('cellDates'), false);
    assert.match(
      catalog,
      /price:\s*parseFloat\(\(row\['Price'\] \|\| row\['price'\] \|\| '0'\) as string\)/
    );
    assert.match(
      catalog,
      /name:\s*\(row\['Name'\] \|\| row\['name'\] \|\| 'Unnamed Product'\) as string/
    );
  });
});
