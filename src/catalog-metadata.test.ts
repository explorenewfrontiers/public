import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import XLSX from 'xlsx';
import {
  asStripeMetadata,
  excelText,
  parseProductCatalog,
} from './catalog.js';

test('excelText stringifies numeric Excel cells', () => {
  assert.equal(excelText(10001), '10001');
  assert.equal(excelText(7), '7');
  assert.equal(excelText(0), '0');
  assert.equal(excelText('  sku-1  '), 'sku-1');
  assert.equal(excelText(undefined, 'fallback'), 'fallback');
  assert.equal(excelText(null), '');
});

test('asStripeMetadata converts numeric values to strings Stripe will accept', () => {
  const metadata = asStripeMetadata({ sku: 10001, category: 7 });
  assert.equal(metadata.sku, '10001');
  assert.equal(typeof metadata.sku, 'string');
  assert.equal(metadata.category, '7');
  assert.equal(typeof metadata.category, 'string');
});

test('parseProductCatalog stringifies numeric SKU, category, and name cells', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-meta-'));
  const filePath = path.join(dir, 'catalog.xlsx');
  try {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet([
      {
        Name: 'Widget',
        Price: 9.99,
        Currency: 'usd',
        SKU: 10001,
        Category: 7,
      },
      {
        Name: 42,
        Price: 1,
        Currency: 'usd',
        SKU: 0,
      },
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Products');
    XLSX.writeFile(workbook, filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 2);

    const widget = products[0];
    assert.ok(widget);
    assert.equal(widget.name, 'Widget');
    assert.equal(widget.sku, '10001');
    assert.equal(typeof widget.sku, 'string');
    assert.equal(widget.metadata?.sku, '10001');
    assert.equal(typeof widget.metadata?.sku, 'string');
    assert.equal(widget.metadata?.category, '7');
    assert.equal(typeof widget.metadata?.category, 'string');

    const numbered = products[1];
    assert.ok(numbered);
    assert.equal(numbered.name, '42');
    assert.equal(typeof numbered.name, 'string');
    assert.equal(numbered.sku, '0');
    assert.equal(numbered.metadata?.sku, '0');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
