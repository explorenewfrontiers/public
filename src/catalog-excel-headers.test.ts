import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import XLSX from 'xlsx';
import {
  normalizeCatalogHeader,
  parseProductCatalog,
} from './catalog.js';

const tmpDirs: string[] = [];

function writeCatalog(rows: unknown[][]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-excel-headers-'));
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

describe('normalizeCatalogHeader', () => {
  it('trims padding, strips a BOM, and lowercases', () => {
    assert.equal(normalizeCatalogHeader('Name'), 'name');
    assert.equal(normalizeCatalogHeader('NAME'), 'name');
    assert.equal(normalizeCatalogHeader(' Name '), 'name');
    assert.equal(normalizeCatalogHeader('\uFEFFName'), 'name');
    assert.equal(normalizeCatalogHeader('\uFEFF PRICE '), 'price');
    assert.equal(normalizeCatalogHeader('Image URL'), 'image url');
  });
});

describe('parseProductCatalog spreadsheet headers', () => {
  it('still reads the documented Name/Price headers', async () => {
    const filePath = writeCatalog([
      ['Name', 'Price', 'Currency', 'SKU'],
      ['Mug', 12.5, 'usd', 'MUG-1'],
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 1);
    assert.equal(products[0]?.name, 'Mug');
    assert.equal(products[0]?.price, 12.5);
    assert.equal(products[0]?.currency, 'usd');
    assert.equal(products[0]?.sku, 'MUG-1');
  });

  it('does not sync ALL-CAPS NAME/PRICE headers as Unnamed Product at $0', async () => {
    const filePath = writeCatalog([
      ['NAME', 'PRICE', 'CURRENCY', 'IMAGE URL'],
      ['Travel Mug', 24.99, 'USD', 'https://cdn.example/mug.png'],
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 1);
    assert.equal(products[0]?.name, 'Travel Mug');
    assert.equal(products[0]?.price, 24.99);
    assert.equal(products[0]?.currency, 'usd');
    assert.equal(products[0]?.image_url, 'https://cdn.example/mug.png');
  });

  it('does not sync padded Name/Price headers as Unnamed Product at $0', async () => {
    const filePath = writeCatalog([
      [' Name ', ' Price ', ' Category '],
      ['Notebook', 18, 'stationery'],
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 1);
    assert.equal(products[0]?.name, 'Notebook');
    assert.equal(products[0]?.price, 18);
    assert.equal(products[0]?.category, 'stationery');
    assert.equal(products[0]?.metadata?.category, 'stationery');
  });
});
