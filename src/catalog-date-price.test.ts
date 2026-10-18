import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import XLSX from 'xlsx';
import { isExcelDatePrice, parseProductCatalog } from './catalog.js';

const tmpDirs: string[] = [];

function writeCatalog(rows: unknown[][]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-date-price-'));
  tmpDirs.push(dir);
  const filePath = path.join(dir, 'catalog.xlsx');
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
  XLSX.writeFile(workbook, filePath);
  return filePath;
}

after(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('isExcelDatePrice', () => {
  it('detects Date objects from SheetJS cellDates', () => {
    assert.equal(isExcelDatePrice(new Date('2026-10-15T00:00:00.000Z')), true);
  });

  it('does not treat numeric dollar amounts as dates', () => {
    assert.equal(isExcelDatePrice(12.5), false);
    assert.equal(isExcelDatePrice(46310), false);
    assert.equal(isExcelDatePrice('10/15'), false);
  });
});

describe('parseProductCatalog date-formatted Price cells', () => {
  it('keeps numeric Price cells as dollar amounts', async () => {
    const filePath = writeCatalog([
      ['Name', 'Price', 'Currency'],
      ['Mug', 12.5, 'usd'],
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 1);
    assert.equal(products[0]?.name, 'Mug');
    assert.equal(products[0]?.price, 12.5);
  });

  it('skips a Price cell Excel stored as a date serial (e.g. 10/15 → Oct 15)', async () => {
    const filePath = writeCatalog([
      ['Name', 'Price', 'Currency'],
      ['Mug', 12.5, 'usd'],
      ['Dated', new Date(2026, 9, 15), 'usd'],
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 1);
    assert.equal(products[0]?.name, 'Mug');
    assert.equal(products[0]?.price, 12.5);
    assert.equal(
      products.some((product) => product.price === 46310 || product.name === 'Dated'),
      false
    );
  });

  it('skips a numeric serial that carries a date number format', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-date-price-'));
    tmpDirs.push(dir);
    const filePath = path.join(dir, 'serial.xlsx');
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Name', 'Price'],
      ['Auto date', 46310],
    ]);
    worksheet['B2']!.z = 'm/d/yy';
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    XLSX.writeFile(workbook, filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 0);
  });
});
