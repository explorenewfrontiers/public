import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import XLSX from 'xlsx';
import { normalizeProductRow, parseProductCatalog } from './catalog.js';

test('normalizeProductRow does not throw when Currency is a number', () => {
  const row = normalizeProductRow({
    Name: 'Coffee',
    Price: 9.99,
    Currency: 840,
  });

  assert.equal(row.name, 'Coffee');
  assert.equal(row.price, 9.99);
  assert.equal(row.currency, '840');
});

test('normalizeProductRow accepts numeric Name/ID and dollar-string Price', () => {
  const row = normalizeProductRow({
    ID: 1001,
    Name: 42,
    Price: '12.50',
    Currency: 'USD',
  });

  assert.equal(row.id, '1001');
  assert.equal(row.name, '42');
  assert.equal(row.price, 12.5);
  assert.equal(row.currency, 'usd');
});

test('parseProductCatalog syncs a sheet whose Currency column is numeric', async () => {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet([
    { Name: 'Espresso', Price: 4.5, Currency: 840 },
    { Name: 'Latte', Price: 5, Currency: 'EUR' },
  ]);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Catalog');

  const filePath = path.join(os.tmpdir(), `catalog-numeric-currency-${process.pid}.xlsx`);
  XLSX.writeFile(workbook, filePath);

  try {
    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 2);
    assert.equal(products[0]?.name, 'Espresso');
    assert.equal(products[0]?.price, 4.5);
    assert.equal(products[0]?.currency, '840');
    assert.equal(products[1]?.currency, 'eur');
  } finally {
    fs.unlinkSync(filePath);
  }
});
