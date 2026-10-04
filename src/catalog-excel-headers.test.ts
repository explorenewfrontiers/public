import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { headerLookup, parseCatalogRow } from './catalog-excel-headers.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Excel catalog header matching', () => {
  it('treats padded Name/Price headers as missing → Unnamed Product at $0', () => {
    const padded = parseCatalogRow({
      ' Name ': 'Widget',
      ' Price ': 19.99,
      ' Currency ': 'usd',
    });

    assert.equal(padded.name, 'Unnamed Product');
    assert.equal(padded.price, 0);
    assert.equal(padded.currency, 'usd');
    assert.equal(
      headerLookup({ ' Name ': 'Widget', ' Price ': 19.99 }, ['Name', 'Price']),
      undefined
    );
  });

  it('still maps exact Name/Price headers', () => {
    const exact = parseCatalogRow({
      Name: 'Widget',
      Price: '19.99',
      Currency: 'USD',
    });

    assert.equal(exact.name, 'Widget');
    assert.equal(exact.price, 19.99);
    assert.equal(exact.currency, 'usd');
  });
});

describe('Excel catalog header source stays aligned', () => {
  it('reads Name/Price keys without trim or padded aliases', () => {
    const catalog = readRepo('src/catalog.ts');
    const parser = catalog.slice(
      catalog.indexOf('export async function parseProductCatalog'),
      catalog.indexOf('export async function syncProductsToStripe')
    );

    assert.match(parser, /row\['Name'\] \|\| row\['name'\] \|\| 'Unnamed Product'/);
    assert.match(parser, /row\['Price'\] \|\| row\['price'\] \|\| '0'/);
    assert.equal(parser.includes('.trim()'), false);
    assert.equal(parser.includes("' Name '"), false);
    assert.equal(parser.includes("' Price '"), false);
    assert.equal(parser.includes('Object.keys'), false);
  });
});
