import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import XLSX from 'xlsx';
import { parseProductCatalog } from './catalog.js';
import {
  productionCapsCatalogRows,
  sourceCapsParsedCatalogRows,
  sourceCapsStripeSyncLoop,
  UNBOUNDED_CATALOG_ROW_COUNT,
} from './catalog-unbounded-rows.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempDirs: string[] = [];

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

after(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('parseProductCatalog does not cap Excel row count', () => {
  it(`returns all ${UNBOUNDED_CATALOG_ROW_COUNT} rows from a workbook`, async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-unbounded-'));
    tempDirs.push(dir);

    const rows = Array.from({ length: UNBOUNDED_CATALOG_ROW_COUNT }, (_, i) => ({
      Name: `Bulk ${i}`,
      Price: 1 + i * 0.01,
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Sheet1');
    const filePath = path.join(dir, 'bulk.xlsx');
    XLSX.writeFile(workbook, filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, UNBOUNDED_CATALOG_ROW_COUNT);
    assert.equal(products[0]?.name, 'Bulk 0');
    assert.equal(products[UNBOUNDED_CATALOG_ROW_COUNT - 1]?.name, `Bulk ${UNBOUNDED_CATALOG_ROW_COUNT - 1}`);
    assert.equal(productionCapsCatalogRows(), false);
  });
});

describe('catalog ingest/sync source stays unbounded', () => {
  it('parseProductCatalog maps sheet_to_json with no row cap', () => {
    const source = readRepo('src/catalog.ts');
    const start = source.indexOf('export async function parseProductCatalog');
    const end = source.indexOf('export async function syncProductsToStripe');
    const body = source.slice(start, end);

    assert.match(body, /sheet_to_json\(\s*worksheet\s*\)/);
    assert.match(body, /data\.map\(/);
    assert.equal(sourceCapsParsedCatalogRows(body), false);
  });

  it('syncProductsToStripe loops every product with no cap before Stripe writes', () => {
    const source = readRepo('src/catalog.ts');
    const start = source.indexOf('export async function syncProductsToStripe');
    const end = source.indexOf('export async function getStripeProducts');
    const body = source.slice(start, end);

    assert.match(body, /for\s*\(\s*const product of products\s*\)/);
    assert.match(body, /stripe\.products\.create/);
    assert.match(body, /stripe\.prices\.create/);
    assert.equal(sourceCapsStripeSyncLoop(body), false);
  });
});
