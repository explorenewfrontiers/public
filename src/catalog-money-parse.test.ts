import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import XLSX from 'xlsx';
import { parseCatalogPrice, parseProductCatalog } from './catalog.js';

const tmpDirs: string[] = [];

function writeCatalog(rows: unknown[][]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-money-parse-'));
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

describe('parseCatalogPrice', () => {
  it('keeps numeric dollar amounts', () => {
    assert.equal(parseCatalogPrice(12.5), 12.5);
    assert.equal(parseCatalogPrice(1299), 1299);
  });

  it('parses currency-prefixed and code-suffixed strings', () => {
    assert.equal(parseCatalogPrice('$10.00'), 10);
    assert.equal(parseCatalogPrice('$1,299.00'), 1299);
    assert.equal(parseCatalogPrice('10.00 USD'), 10);
    assert.equal(parseCatalogPrice('USD 10.00'), 10);
    assert.equal(parseCatalogPrice('€10,50'), 10.5);
  });

  it('parses thousands separators instead of truncating at the comma', () => {
    assert.equal(parseCatalogPrice('1,299.00'), 1299);
    assert.equal(parseCatalogPrice('1.299,00'), 1299);
    assert.equal(parseCatalogPrice('10,50'), 10.5);
  });

  it('parses a plain decimal string', () => {
    assert.equal(parseCatalogPrice('29.99'), 29.99);
  });
});

describe('parseProductCatalog spreadsheet money formats', () => {
  it('does not sync $10.00 text as NaN or 1,299.00 text as $1', async () => {
    const filePath = writeCatalog([
      ['Name', 'Price', 'Currency'],
      ['Mug', '$10.00', ' USD '],
      ['Laptop', '1,299.00', 'usd'],
      ['Notebook', '10,50', 'eur'],
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 3);
    assert.equal(products[0]?.name, 'Mug');
    assert.equal(products[0]?.price, 10);
    assert.equal(products[0]?.currency, 'usd');
    assert.equal(products[1]?.name, 'Laptop');
    assert.equal(products[1]?.price, 1299);
    assert.equal(products[2]?.name, 'Notebook');
    assert.equal(products[2]?.price, 10.5);
    assert.equal(
      products.some((product) => Number.isNaN(product.price) || product.price === 1),
      false
    );
  });
});
