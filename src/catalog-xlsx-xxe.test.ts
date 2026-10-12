import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import { parseProductCatalog } from './catalog.js';
import {
  looksLikePasswdLeak,
  productionHardensXxe,
  sourceDisablesXmlDtd,
  sourcePassesReadFileOptions,
  XXE_ENTITY_LITERAL,
} from './catalog-xlsx-xxe.js';

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

const SPREADSHEETML_XXE = `<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Sheet1">
  <Table>
   <Row>
    <Cell><Data ss:Type="String">Name</Data></Cell>
    <Cell><Data ss:Type="String">Price</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">&xxe;</Data></Cell>
    <Cell><Data ss:Type="Number">1</Data></Cell>
   </Row>
  </Table>
 </Worksheet>
</Workbook>`;

describe('parseProductCatalog SpreadsheetML DOCTYPE / XXE', () => {
  it('throws on SpreadsheetML with a DOCTYPE file entity (does not import /etc/passwd)', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-xxe-'));
    tempDirs.push(dir);
    const filePath = path.join(dir, 'xxe.xml');
    fs.writeFileSync(filePath, SPREADSHEETML_XXE);

    await assert.rejects(
      () => parseProductCatalog(filePath),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal(looksLikePasswdLeak(error.message), false);
        assert.equal(error.message.includes(XXE_ENTITY_LITERAL), false);
        return true;
      }
    );
    assert.equal(productionHardensXxe(), false);
  });
});

describe('catalog XML parse source stays unoptioned', () => {
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
