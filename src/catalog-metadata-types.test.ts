import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import XLSX from 'xlsx';
import { parseProductCatalog } from './catalog.js';
import {
  buildCatalogRowMetadata,
  catalogMetadataValue,
  stripeMetadataValuesAreStrings,
} from './catalog-metadata-types.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function writeWorkbook(rows: Array<Record<string, unknown>>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-meta-'));
  const filePath = path.join(dir, 'catalog.xlsx');
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Products');
  XLSX.writeFile(workbook, filePath);
  return filePath;
}

describe('catalog Excel metadata is not coerced to strings', () => {
  it('keeps numeric SKU/category cells as numbers and drops SKU 0', () => {
    assert.equal(catalogMetadataValue(1001), 1001);
    assert.equal(typeof catalogMetadataValue(1001), 'number');
    assert.equal(catalogMetadataValue(0), '');
    assert.equal(catalogMetadataValue('SKU-9'), 'SKU-9');

    const metadata = buildCatalogRowMetadata({ SKU: 1001, Category: 12 });
    assert.equal(metadata.sku, 1001);
    assert.equal(metadata.category, 12);
    assert.equal(stripeMetadataValuesAreStrings(metadata), false);
  });

  it('parseProductCatalog preserves numeric SKU/category on metadata', async () => {
    const filePath = writeWorkbook([
      { Name: 'Coffee', Price: 10, SKU: 1001, Category: 12 },
      { Name: 'Zero SKU', Price: 5, SKU: 0, Category: 'beans' },
    ]);
    const rows = await parseProductCatalog(filePath);
    assert.equal(rows.length, 2);

    assert.equal(rows[0]?.sku, 1001);
    assert.equal(typeof rows[0]?.sku, 'number');
    assert.equal(rows[0]?.metadata?.sku, 1001);
    assert.equal(typeof rows[0]?.metadata?.sku, 'number');
    assert.equal(rows[0]?.metadata?.category, 12);
    assert.equal(typeof rows[0]?.metadata?.category, 'number');
    assert.equal(stripeMetadataValuesAreStrings(rows[0]?.metadata ?? {}), false);

    assert.equal(rows[1]?.sku, '');
    assert.equal(rows[1]?.metadata?.sku, '');
    assert.equal(rows[1]?.metadata?.category, 'beans');
  });
});

describe('catalog metadata source stays aligned', () => {
  it('casts SKU/category with as string and uses || empty without String()', () => {
    const catalog = readRepo('src/catalog.ts');
    assert.match(
      catalog,
      /sku: \(row\['SKU'\] \|\| row\['sku'\] \|\| ''\) as string/
    );
    assert.match(
      catalog,
      /category: \(row\['Category'\] \|\| row\['category'\] \|\| ''\) as string/
    );
    assert.match(catalog, /metadata: product\.metadata/);
    assert.equal(catalog.includes('String(row'), false);
    assert.equal(catalog.includes('String(product.sku'), false);
  });
});
