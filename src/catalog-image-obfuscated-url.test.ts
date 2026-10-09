import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import XLSX from 'xlsx';
import { parseProductCatalog } from './catalog.js';
import {
  isIpv4MappedLoopbackOrLinkLocal,
  isObfuscatedPrivateImageUrl,
  nodeCanonicalHostname,
  productionCanonicalizesImageHosts,
  stripeImagesFromCatalogRow,
} from './catalog-image-obfuscated-url.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempDirs: string[] = [];

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function writeCatalog(imageUrl: string): string {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['Name', 'Price', 'Image URL'],
    ['Obfuscated Host', 1, imageUrl],
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'obfuscated-image-'));
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

describe('obfuscated loopback Image URLs resolve to private hosts', () => {
  it('WHATWG-parses decimal, hex, octal, and short IPv4 to 127.0.0.1', () => {
    assert.equal(nodeCanonicalHostname('http://2130706433/latest/meta-data/'), '127.0.0.1');
    assert.equal(nodeCanonicalHostname('http://0x7f000001/admin'), '127.0.0.1');
    assert.equal(nodeCanonicalHostname('http://0x7f.0x0.0x0.0x1/x'), '127.0.0.1');
    assert.equal(nodeCanonicalHostname('http://0177.0.0.1/x'), '127.0.0.1');
    assert.equal(nodeCanonicalHostname('http://127.1/x'), '127.0.0.1');
    assert.equal(nodeCanonicalHostname('http://0/x'), '0.0.0.0');
    assert.equal(isObfuscatedPrivateImageUrl('http://2130706433/latest/meta-data/'), true);
    assert.equal(isObfuscatedPrivateImageUrl('http://0x7f000001/admin'), true);
    assert.equal(isObfuscatedPrivateImageUrl('https://cdn.example.com/p.png'), false);
  });

  it('classifies IPv4-mapped IPv6 loopback and link-local as private', () => {
    const mappedLoopback = nodeCanonicalHostname('http://[::ffff:127.0.0.1]/x');
    const mappedMetadata = nodeCanonicalHostname(
      'http://[::ffff:169.254.169.254]/latest/meta-data/'
    );
    assert.ok(mappedLoopback);
    assert.ok(mappedMetadata);
    assert.equal(isIpv4MappedLoopbackOrLinkLocal(mappedLoopback), true);
    assert.equal(isIpv4MappedLoopbackOrLinkLocal(mappedMetadata), true);
    assert.equal(isObfuscatedPrivateImageUrl('http://[::ffff:127.0.0.1]/x'), true);
    assert.deepEqual(stripeImagesFromCatalogRow('http://2130706433/img.png'), [
      'http://2130706433/img.png',
    ]);
    assert.equal(productionCanonicalizesImageHosts(), false);
  });

  it('parseProductCatalog keeps a decimal-IP Image URL that Node maps to loopback', async () => {
    const obfuscated = 'http://2130706433/latest/meta-data/';
    const filePath = writeCatalog(obfuscated);
    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 1);
    const product = products[0];
    assert.ok(product);
    assert.equal(product.image_url, obfuscated);
    assert.equal(nodeCanonicalHostname(product.image_url ?? ''), '127.0.0.1');
    assert.equal(isObfuscatedPrivateImageUrl(product.image_url ?? ''), true);
  });

  it('parseProductCatalog keeps hex-IP and IPv4-mapped Image URLs', async () => {
    const hexUrl = 'http://0x7f000001/admin.png';
    const hexPath = writeCatalog(hexUrl);
    const hexProducts = await parseProductCatalog(hexPath);
    const hexProduct = hexProducts[0];
    assert.ok(hexProduct);
    assert.equal(hexProduct.image_url, hexUrl);
    assert.equal(nodeCanonicalHostname(hexProduct.image_url ?? ''), '127.0.0.1');

    const mappedUrl = 'http://[::ffff:169.254.169.254]/latest/meta-data/';
    const mappedPath = writeCatalog(mappedUrl);
    const mappedProducts = await parseProductCatalog(mappedPath);
    const mappedProduct = mappedProducts[0];
    assert.ok(mappedProduct);
    assert.equal(mappedProduct.image_url, mappedUrl);
    assert.equal(isObfuscatedPrivateImageUrl(mappedProduct.image_url ?? ''), true);
  });
});

describe('obfuscated Image URL ingest source stays aligned', () => {
  it('stores raw image_url without URL canonicalization or host checks', () => {
    const catalog = readRepo('src/catalog.ts');
    assert.match(catalog, /images: product\.image_url \? \[product\.image_url\] : undefined/);
    assert.equal(catalog.includes('2130706433'), false);
    assert.equal(catalog.includes('0x7f000001'), false);
    assert.equal(catalog.includes('::ffff:'), false);
    assert.equal(catalog.includes('new URL('), false);
    assert.equal(productionCanonicalizesImageHosts(), false);
  });
});
