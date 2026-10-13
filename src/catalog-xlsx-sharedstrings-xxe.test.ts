import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import { parseProductCatalog } from './catalog.js';
import {
  looksLikePasswdLeak,
  nameIsLiteralXxeEntity,
  productionExpandsSharedStringsXxe,
  sourceDisablesXmlDtd,
  sourcePassesReadFileOptions,
  writeSharedStringsXxeWorkbook,
  XXE_ENTITY_LITERAL,
} from './catalog-xlsx-sharedstrings-xxe.js';

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

describe('parseProductCatalog OOXML sharedStrings XXE', () => {
  it('imports literal &xxe; and does not expand file:///etc/passwd', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-sst-xxe-'));
    tempDirs.push(dir);
    const filePath = writeSharedStringsXxeWorkbook(dir);

    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 1);
    const name = products[0]?.name ?? '';
    assert.equal(nameIsLiteralXxeEntity(name), true);
    assert.equal(name, XXE_ENTITY_LITERAL);
    assert.equal(looksLikePasswdLeak(name), false);
    assert.equal(looksLikePasswdLeak(JSON.stringify(products)), false);
    assert.equal(productionExpandsSharedStringsXxe(), false);
  });
});

describe('catalog OOXML parse source stays unoptioned', () => {
  it('calls XLSX.readFile(filePath) with no options or DTD flags', () => {
    const source = readRepo('src/catalog.ts');
    const start = source.indexOf('export async function parseProductCatalog');
    const end = source.indexOf('export async function syncProductsToStripe');
    const body = source.slice(start, end);

    assert.match(body, /XLSX\.readFile\(\s*filePath\s*\)/);
    assert.equal(sourcePassesReadFileOptions(body), false);
    assert.equal(sourceDisablesXmlDtd(body), false);
  });
});
