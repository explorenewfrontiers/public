import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import { parseProductCatalog } from './catalog.js';
import {
  NON_XLSX_CATALOG_EXTENSIONS,
  productionAllowlistsCatalogFileType,
  sourcePassesReadFileOptions,
  sourceRestrictsCatalogExtension,
} from './catalog-xlsx-file-type.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempDirs: string[] = [];

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-file-type-'));
  tempDirs.push(dir);
  return dir;
}

after(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('parseProductCatalog accepts non-xlsx catalog bytes', () => {
  it('ingests an HTML table as Name/Price rows', async () => {
    const filePath = path.join(tempDir(), 'catalog.html');
    fs.writeFileSync(
      filePath,
      '<table><tr><th>Name</th><th>Price</th></tr><tr><td>From HTML</td><td>9.99</td></tr></table>'
    );

    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 1);
    const product = products[0];
    assert.ok(product);
    assert.equal(product.name, 'From HTML');
    assert.equal(product.price, 9.99);
  });

  it('ingests CSV and SpreadsheetML XML catalogs', async () => {
    const dir = tempDir();
    const csvPath = path.join(dir, 'catalog.csv');
    fs.writeFileSync(csvPath, 'Name,Price\nFrom CSV,4.5\n');

    const xmlPath = path.join(dir, 'catalog.xml');
    fs.writeFileSync(
      xmlPath,
      `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Sheet1">
  <Table>
   <Row>
    <Cell><Data ss:Type="String">Name</Data></Cell>
    <Cell><Data ss:Type="String">Price</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">From XML</Data></Cell>
    <Cell><Data ss:Type="Number">2</Data></Cell>
   </Row>
  </Table>
 </Worksheet>
</Workbook>`
    );

    const csvProducts = await parseProductCatalog(csvPath);
    assert.equal(csvProducts[0]?.name, 'From CSV');
    assert.equal(csvProducts[0]?.price, 4.5);

    const xmlProducts = await parseProductCatalog(xmlPath);
    assert.equal(xmlProducts[0]?.name, 'From XML');
    assert.equal(xmlProducts[0]?.price, 2);
  });

  it('treats an HTML document with a .xlsx name as a catalog', async () => {
    const filePath = path.join(tempDir(), 'catalog.xlsx');
    fs.writeFileSync(
      filePath,
      '<table><tr><th>Name</th><th>Price</th></tr><tr><td>Spoofed XLSX</td><td>3</td></tr></table>'
    );

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.name, 'Spoofed XLSX');
    assert.equal(products[0]?.price, 3);
  });
});

describe('catalog file-type source stays aligned', () => {
  it('calls XLSX.readFile(filePath) with no options or extension allowlist', () => {
    const source = readRepo('src/catalog.ts');
    const start = source.indexOf('export async function parseProductCatalog');
    const end = source.indexOf('export async function syncProductsToStripe');
    const body = source.slice(start, end);

    assert.match(body, /XLSX\.readFile\(\s*filePath\s*\)/);
    assert.equal(sourcePassesReadFileOptions(body), false);
    assert.equal(sourceRestrictsCatalogExtension(body), false);
    assert.equal(productionAllowlistsCatalogFileType(), false);
    for (const ext of NON_XLSX_CATALOG_EXTENSIONS) {
      assert.equal(body.includes(ext), false);
    }
  });
});
