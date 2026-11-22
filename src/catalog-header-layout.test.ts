import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import XLSX from 'xlsx';
import { parseProductCatalog } from './catalog.js';

const tmpDirs: string[] = [];

function writeWorkbook(
  sheets: Array<{ name: string; rows: unknown[][] }>
): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-header-layout-'));
  tmpDirs.push(dir);
  const filePath = path.join(dir, 'catalog.xlsx');
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  }
  XLSX.writeFile(workbook, filePath);
  return filePath;
}

after(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('parseProductCatalog header layout', () => {
  it('still reads the documented Name/Price header in row 1', async () => {
    const filePath = writeWorkbook([
      {
        name: 'Products',
        rows: [
          ['Name', 'Price', 'Currency', 'SKU'],
          ['Mug', 12.5, 'usd', 'MUG-1'],
        ],
      },
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 1);
    assert.equal(products[0]?.name, 'Mug');
    assert.equal(products[0]?.price, 12.5);
    assert.equal(products[0]?.currency, 'usd');
    assert.equal(products[0]?.sku, 'MUG-1');
  });

  it('does not treat a title row as headers and sync Unnamed Product at $0', async () => {
    const filePath = writeWorkbook([
      {
        name: 'Products',
        rows: [
          ['Product Catalog Q4 2026'],
          ['Name', 'Price', 'Currency'],
          ['Travel Mug', 24.99, 'usd'],
        ],
      },
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 1);
    assert.equal(products[0]?.name, 'Travel Mug');
    assert.equal(products[0]?.price, 24.99);
    assert.equal(products[0]?.currency, 'usd');
  });

  it('maps Product Name / Unit Price aliases instead of Unnamed Product at $0', async () => {
    const filePath = writeWorkbook([
      {
        name: 'Products',
        rows: [
          ['Product Name', 'Unit Price', 'Currency'],
          ['Notebook', 18, 'usd'],
        ],
      },
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 1);
    assert.equal(products[0]?.name, 'Notebook');
    assert.equal(products[0]?.price, 18);
    assert.equal(products[0]?.currency, 'usd');
  });

  it('reads a later Products sheet when the first sheet has no catalog headers', async () => {
    const filePath = writeWorkbook([
      {
        name: 'Notes',
        rows: [['Instructions'], ['Fill in the Products tab']],
      },
      {
        name: 'Products',
        rows: [
          ['Name', 'Price', 'Currency'],
          ['Sticker Pack', 9.99, 'usd'],
        ],
      },
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 1);
    assert.equal(products[0]?.name, 'Sticker Pack');
    assert.equal(products[0]?.price, 9.99);
  });

  it('throws instead of creating $0 Unnamed Products when no header row exists', async () => {
    const filePath = writeWorkbook([
      {
        name: 'Notes',
        rows: [['See the wiki'], ['No product table here']],
      },
    ]);

    await assert.rejects(
      () => parseProductCatalog(filePath),
      /Name\/Price/
    );
  });
});
