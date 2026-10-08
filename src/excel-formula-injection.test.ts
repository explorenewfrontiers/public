import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import XLSX from 'xlsx';
import { parseProductCatalog } from './catalog.js';
import {
  catalogNameFromExcelCell,
  looksLikeExcelFormula,
  productionSanitizesExcelFormulas,
} from './excel-formula-injection.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempDirs: string[] = [];

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function writeCatalog(rows: Array<Record<string, unknown>>): string {
  const headers = ['Name', 'Price', 'Description', 'SKU', 'Image URL'];
  const aoa: unknown[][] = [
    headers,
    ...rows.map((row) => headers.map((header) => row[header] ?? '')),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  for (const key of Object.keys(worksheet)) {
    if (key.startsWith('!')) {
      continue;
    }
    const cell = worksheet[key];
    if (cell && typeof cell.v === 'string') {
      cell.t = 's';
      delete cell.f;
    }
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Catalog');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'excel-formula-'));
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

describe('Excel formula prefixes are stored as product fields', () => {
  it('treats =HYPERLINK, =CMD|, @, +, and - Name cells as formulas', () => {
    assert.equal(looksLikeExcelFormula('=HYPERLINK("http://evil.example","x")'), true);
    assert.equal(looksLikeExcelFormula("=CMD|'/C calc'!A0"), true);
    assert.equal(looksLikeExcelFormula('@SUM(1+1)'), true);
    assert.equal(looksLikeExcelFormula('+2+3'), true);
    assert.equal(looksLikeExcelFormula('-2+3'), true);
    assert.equal(looksLikeExcelFormula('\t=1+1'), true);
    assert.equal(looksLikeExcelFormula('Plain Shirt'), false);
    assert.equal(catalogNameFromExcelCell('=CMD|\'/C calc\'!A0'), "=CMD|'/C calc'!A0");
    assert.equal(productionSanitizesExcelFormulas(), false);
  });

  it('parseProductCatalog keeps formula Name, Description, and SKU cells', async () => {
    const filePath = writeCatalog([
      {
        Name: '=HYPERLINK("http://evil.example/steal","Click")',
        Price: 9.99,
        Description: "=CMD|'/C calc'!A0",
        SKU: '@SUM(1+1)',
      },
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 1);
    const product = products[0];
    assert.ok(product);
    assert.equal(looksLikeExcelFormula(product.name), true);
    assert.equal(looksLikeExcelFormula(product.description), true);
    assert.equal(looksLikeExcelFormula(product.sku), true);
    assert.equal(product.name.startsWith('='), true);
    assert.equal(product.metadata?.sku?.startsWith('@'), true);
  });
});

describe('Excel formula ingest source stays aligned', () => {
  it('does not sanitize formula prefixes before storing name or metadata', () => {
    const catalog = readRepo('src/catalog.ts');
    const parseStart = catalog.indexOf('export async function parseProductCatalog');
    const parseEnd = catalog.indexOf('export async function syncProductsToStripe', parseStart);
    const parseBody = catalog.slice(parseStart, parseEnd);

    assert.match(parseBody, /name: \(row\['Name'\] \|\| row\['name'\] \|\| 'Unnamed Product'\) as string/);
    assert.match(parseBody, /sku: \(row\['SKU'\] \|\| row\['sku'\] \|\| ''\) as string/);
    assert.equal(parseBody.includes('HYPERLINK'), false);
    assert.equal(parseBody.includes('CMD|'), false);
    assert.equal(/startsWith\(['"]=/.test(parseBody), false);
    assert.equal(productionSanitizesExcelFormulas(), false);
  });
});
