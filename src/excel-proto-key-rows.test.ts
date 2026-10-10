import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import XLSX from 'xlsx';
import { parseProductCatalog } from './catalog.js';
import {
  PROTO_HEADER_ALIASES,
  productionFiltersProtoHeaders,
  rowHasProtoKey,
} from './excel-proto-key-rows.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempDirs: string[] = [];

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function writeCatalog(headers: string[], row: Array<string | number>): string {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, row]);
  for (const key of Object.keys(worksheet)) {
    if (key.startsWith('!')) {
      continue;
    }
    const cell = worksheet[key] as { v?: unknown; t?: string; f?: string };
    if (cell && typeof cell.v === 'string') {
      cell.t = 's';
      delete cell.f;
    }
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Catalog');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proto-key-'));
  tempDirs.push(dir);
  const filePath = path.join(dir, 'catalog.xlsx');
  XLSX.writeFile(workbook, filePath);
  return filePath;
}

after(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('Excel proto-key headers are ingested without sanitization', () => {
  it('sheet_to_json keeps a mangled __proto__ column and does not pollute Object.prototype', () => {
    const filePath = writeCatalog(
      ['Name', 'Price', '__proto__'],
      ['Widget', 9.99, 'polluted']
    );
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    assert.ok(sheetName);
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as Record<
      string,
      unknown
    >[];
    assert.equal(rows.length, 1);
    const row = rows[0];
    assert.ok(row);
    assert.equal(rowHasProtoKey(row), true);
    assert.equal(Object.prototype.hasOwnProperty('polluted'), false);
    assert.equal(({} as { polluted?: unknown }).polluted, undefined);
    assert.equal(row.Name, 'Widget');
  });

  it('parseProductCatalog still maps Name/Price when constructor and __proto__ columns exist', async () => {
    const protoPath = writeCatalog(
      ['Name', 'Price', '__proto__', 'SKU'],
      ['Safe Name', 12.5, 'admin', 'SKU-1']
    );
    const protoProducts = await parseProductCatalog(protoPath);
    const protoProduct = protoProducts[0];
    assert.ok(protoProduct);
    assert.equal(protoProduct.name, 'Safe Name');
    assert.equal(protoProduct.price, 12.5);
    assert.equal(protoProduct.sku, 'SKU-1');
    assert.equal(protoProduct.metadata?.sku, 'SKU-1');

    const ctorPath = writeCatalog(
      ['constructor', 'Name', 'Price'],
      ['prototype', 'Other Product', 3]
    );
    const ctorProducts = await parseProductCatalog(ctorPath);
    const ctorProduct = ctorProducts[0];
    assert.ok(ctorProduct);
    assert.equal(ctorProduct.name, 'Other Product');
    assert.equal(ctorProduct.price, 3);
    assert.deepEqual(PROTO_HEADER_ALIASES, ['__proto__', 'constructor', 'prototype']);
  });
});

describe('Excel proto-key ingest source stays aligned', () => {
  it('uses sheet_to_json with no proto-key filter', () => {
    const catalog = readRepo('src/catalog.ts');
    const start = catalog.indexOf('export async function parseProductCatalog');
    const end = catalog.indexOf('export async function syncProductsToStripe');
    const body = catalog.slice(start, end);
    assert.match(body, /XLSX\.utils\.sheet_to_json/);
    assert.equal(productionFiltersProtoHeaders(body), false);
    assert.equal(body.includes('__proto__'), false);
    assert.equal(body.includes('Object.create(null)'), false);
  });
});
