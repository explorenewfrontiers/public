import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import XLSX from 'xlsx';
import { parseProductCatalog } from './catalog.js';
import {
  looksLikeExcelFormula,
  productionSanitizesImageUrlFormulas,
  stripeImagesFromCatalogRow,
} from './catalog-image-formula.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempDirs: string[] = [];

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function writeCatalog(imageUrl: string): string {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['Name', 'Price', 'Image URL'],
    ['Formula Image', 1, imageUrl],
  ]);
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'image-formula-'));
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

describe('Excel formula Image URL cells are stored on products', () => {
  it('treats HYPERLINK, CMD, and prefix Image URL cells as formulas', () => {
    assert.equal(
      looksLikeExcelFormula('=HYPERLINK("http://169.254.169.254/latest/meta-data/","x")'),
      true
    );
    assert.equal(looksLikeExcelFormula("=CMD|'/C calc'!A0"), true);
    assert.equal(looksLikeExcelFormula('@SUM(1+1)'), true);
    assert.equal(looksLikeExcelFormula('+http://evil.example/p.png'), true);
    assert.equal(looksLikeExcelFormula('https://cdn.example.com/p.png'), false);
    assert.deepEqual(
      stripeImagesFromCatalogRow('=HYPERLINK("http://evil.example/p.png","x")'),
      ['=HYPERLINK("http://evil.example/p.png","x")']
    );
    assert.equal(productionSanitizesImageUrlFormulas(), false);
  });

  it('parseProductCatalog keeps a HYPERLINK Image URL cell verbatim', async () => {
    const formula = '=HYPERLINK("http://169.254.169.254/latest/meta-data/","img")';
    const filePath = writeCatalog(formula);
    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 1);
    const product = products[0];
    assert.ok(product);
    assert.equal(product.image_url, formula);
    assert.equal(looksLikeExcelFormula(product.image_url), true);
    assert.equal(product.image_url?.startsWith('='), true);
  });
});

describe('Image URL formula ingest source stays aligned', () => {
  it('does not sanitize Image URL cells before Product.images', () => {
    const catalog = readRepo('src/catalog.ts');
    const parseStart = catalog.indexOf('export async function parseProductCatalog');
    const parseEnd = catalog.indexOf(
      'export async function syncProductsToStripe',
      parseStart
    );
    const parseBody = catalog.slice(parseStart, parseEnd);

    assert.match(
      parseBody,
      /image_url: \(row\['Image URL'\] \|\| row\['image_url'\] \|\| ''\) as string/
    );
    assert.equal(parseBody.includes('HYPERLINK'), false);
    assert.equal(parseBody.includes('CMD|'), false);
    assert.equal(/image_url.*startsWith/.test(parseBody), false);
    assert.equal(productionSanitizesImageUrlFormulas(), false);
  });
});
