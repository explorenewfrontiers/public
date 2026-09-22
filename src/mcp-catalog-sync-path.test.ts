import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  catalogPathWouldReachHostFile,
  isCatalogPathRejected,
  readSyncCatalogFilePath,
} from './mcp-catalog-sync-path.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('sync_catalog file_path is unsandboxed', () => {
  it('forwards the client path unchanged, including missing values', () => {
    assert.equal(
      readSyncCatalogFilePath({ file_path: '/etc/passwd' }),
      '/etc/passwd'
    );
    assert.equal(
      readSyncCatalogFilePath({ file_path: '../../../.env' }),
      '../../../.env'
    );
    assert.equal(readSyncCatalogFilePath({ file_path: 'catalog.csv' }), 'catalog.csv');
    assert.equal(readSyncCatalogFilePath({}), undefined);
  });

  it('does not reject absolute, parent-traversal, or non-xlsx paths', () => {
    for (const filePath of ['/etc/passwd', '../../../.env', 'notes.txt', '']) {
      assert.equal(isCatalogPathRejected(filePath), false);
      assert.equal(catalogPathWouldReachHostFile(filePath), true);
    }
  });
});

describe('sync_catalog path source stays aligned', () => {
  it('still passes file_path to XLSX.readFile with no allowlist', () => {
    const indexSource = readRepo('src/index.ts');
    const catalogSource = readRepo('src/catalog.ts');

    assert.match(indexSource, /required: \['file_path'\]/);
    assert.match(
      indexSource,
      /const filePath = input\.file_path as string;\s*const products = await parseProductCatalog\(filePath\);/
    );
    assert.equal(indexSource.includes('path.resolve'), false);
    assert.equal(indexSource.includes('.xlsx'), false);

    assert.match(catalogSource, /XLSX\.readFile\(filePath\)/);
    assert.equal(catalogSource.includes('startsWith'), false);
    assert.equal(catalogSource.includes('path.normalize'), false);
    assert.equal(/filePath\.endsWith\(/.test(catalogSource), false);
  });
});
