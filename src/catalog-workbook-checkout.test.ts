import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import XLSX from 'xlsx';
import {
  CONNECT_PRODUCT_LIST_LIMIT,
  catalogRowId,
  connectProductListExposesHasMore,
  firstSheetName,
  mapCatalogCheckoutItems,
} from './catalog-workbook-checkout.js';
import { parseProductCatalog } from './catalog.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function writeWorkbook(setup: (workbook: XLSX.WorkBook) => void): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-wb-'));
  const filePath = path.join(dir, 'catalog.xlsx');
  const workbook = XLSX.utils.book_new();
  setup(workbook);
  XLSX.writeFile(workbook, filePath);
  return filePath;
}

describe('catalog workbook and checkout contracts', () => {
  it('has no first-sheet name when the workbook is empty', () => {
    assert.equal(firstSheetName([]), undefined);
    assert.equal(firstSheetName(['Products']), 'Products');
  });

  it('keeps numeric Excel IDs as numbers (truthy, not a string id)', () => {
    assert.equal(catalogRowId({ ID: 1001, Name: 'Coffee' }), 1001);
    assert.equal(typeof catalogRowId({ ID: 1001 }), 'number');
    assert.equal(catalogRowId({}), '');
  });

  it('throws when checkout items are missing or not an array', () => {
    assert.throws(() => mapCatalogCheckoutItems(undefined), TypeError);
    assert.throws(() => mapCatalogCheckoutItems({}), TypeError);
    assert.throws(() => mapCatalogCheckoutItems({ items: null }), TypeError);
    assert.throws(() => mapCatalogCheckoutItems({ items: { priceId: 'price_1' } }), TypeError);
    assert.deepEqual(mapCatalogCheckoutItems({ items: [] }), []);
    assert.deepEqual(
      mapCatalogCheckoutItems({ items: [{ priceId: 'price_1', quantity: 2 }] }),
      [{ price: 'price_1', quantity: 2 }]
    );
  });

  it('caps Connect product lists at 20 without exposing has_more', () => {
    assert.equal(CONNECT_PRODUCT_LIST_LIMIT, 20);
    assert.equal(connectProductListExposesHasMore(), false);
  });

  it('parseProductCatalog rejects a missing Excel file', async () => {
    await assert.rejects(
      () => parseProductCatalog(path.join(os.tmpdir(), 'missing-catalog.xlsx'))
    );
  });

  it('parseProductCatalog preserves a numeric ID cell', async () => {
    const filePath = writeWorkbook((workbook) => {
      const sheet = XLSX.utils.json_to_sheet([
        { ID: 1001, Name: 'Coffee', Price: 10 },
      ]);
      XLSX.utils.book_append_sheet(workbook, sheet, 'Products');
    });
    const rows = await parseProductCatalog(filePath);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.id, 1001);
    assert.equal(typeof rows[0]?.id, 'number');
    assert.equal(rows[0]?.name, 'Coffee');
  });
});

describe('catalog workbook and checkout source stays aligned', () => {
  it('reads SheetNames[0], casts ID, maps items, and lists 20 products', () => {
    const catalog = readRepo('src/catalog.ts');
    const web = readRepo('src/web-server.ts');
    const connect = readRepo('stripe-connect-sample/server.ts');

    assert.match(catalog, /const sheetName = workbook\.SheetNames\[0\];/);
    assert.match(catalog, /const worksheet = workbook\.Sheets\[sheetName\];/);
    assert.match(
      catalog,
      /id: \(row\['ID'\] \|\| row\['id'\] \|\| ''\) as string/
    );

    assert.match(web, /line_items: items\.map\(\(item\) => \(\{/);
    assert.equal(web.includes('Array.isArray(items)'), false);

    assert.match(connect, /limit: 20,/);
    assert.equal(connect.includes('has_more'), false);
    assert.match(
      connect,
      /products: products\.data\.map\(\(product\) => \(\{/
    );
  });
});
