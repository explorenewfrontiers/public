import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import XLSX from 'xlsx';
import { parseProductCatalog } from './catalog.js';
import {
  IPV6_PRIVATE_IMAGE_URLS,
  UNICODE_LOOPBACK_IMAGE_URLS,
  isIpv6LoopbackLinkLocalOrUla,
  isUnicodeOrIpv6PrivateImageUrl,
  productionCanonicalizesUnicodeOrIpv6Hosts,
  stripeImagesFromCatalogRow,
  whatwgHostname,
} from './catalog-image-unicode-ip.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempDirs: string[] = [];

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function writeCatalog(imageUrl: string): string {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['Name', 'Price', 'Image URL'],
    ['Unicode Host', 1, imageUrl],
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'unicode-image-'));
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

describe('Unicode and IPv6 Image URLs resolve to private hosts', () => {
  it('WHATWG-parses fullwidth-dot and circled-digit IPs to 127.0.0.1', () => {
    for (const url of UNICODE_LOOPBACK_IMAGE_URLS) {
      assert.equal(whatwgHostname(url), '127.0.0.1');
      assert.equal(isUnicodeOrIpv6PrivateImageUrl(url), true);
    }
    assert.equal(isUnicodeOrIpv6PrivateImageUrl('https://cdn.example.com/p.png'), false);
  });

  it('classifies bare IPv6 loopback, link-local, and ULA as private', () => {
    assert.equal(whatwgHostname('http://[::1]/img.png'), '[::1]');
    assert.equal(whatwgHostname('http://[fe80::1]/x'), '[fe80::1]');
    assert.equal(whatwgHostname('http://[fc00::1]/x'), '[fc00::1]');
    assert.equal(isIpv6LoopbackLinkLocalOrUla('[::1]'), true);
    assert.equal(isIpv6LoopbackLinkLocalOrUla('[fe80::1]'), true);
    assert.equal(isIpv6LoopbackLinkLocalOrUla('[fc00::1]'), true);
    assert.equal(isIpv6LoopbackLinkLocalOrUla('[fd12:3456:789a:1::1]'), true);
    assert.equal(isIpv6LoopbackLinkLocalOrUla('cdn.example.com'), false);
    for (const url of IPV6_PRIVATE_IMAGE_URLS) {
      assert.equal(isUnicodeOrIpv6PrivateImageUrl(url), true);
    }
    assert.deepEqual(stripeImagesFromCatalogRow('http://[::1]/img.png'), [
      'http://[::1]/img.png',
    ]);
    assert.equal(productionCanonicalizesUnicodeOrIpv6Hosts(), false);
  });

  it('parseProductCatalog keeps a fullwidth-dot Image URL that WHATWG maps to loopback', async () => {
    const unicodeUrl = 'http://127。0。0。1/img.png';
    const products = await parseProductCatalog(writeCatalog(unicodeUrl));
    assert.equal(products.length, 1);
    const product = products[0];
    assert.ok(product);
    assert.equal(product.image_url, unicodeUrl);
    assert.equal(product.image_url?.includes('127.0.0.1'), false);
    assert.equal(whatwgHostname(product.image_url ?? ''), '127.0.0.1');
    assert.equal(isUnicodeOrIpv6PrivateImageUrl(product.image_url ?? ''), true);
  });

  it('parseProductCatalog keeps circled-digit and IPv6 loopback Image URLs', async () => {
    const circledUrl = 'http://①②⑦.⓪.⓪.①/img.png';
    const circledProducts = await parseProductCatalog(writeCatalog(circledUrl));
    const circledProduct = circledProducts[0];
    assert.ok(circledProduct);
    assert.equal(circledProduct.image_url, circledUrl);
    assert.equal(whatwgHostname(circledProduct.image_url ?? ''), '127.0.0.1');

    const ipv6Url = 'http://[::1]/img.png';
    const ipv6Products = await parseProductCatalog(writeCatalog(ipv6Url));
    const ipv6Product = ipv6Products[0];
    assert.ok(ipv6Product);
    assert.equal(ipv6Product.image_url, ipv6Url);
    assert.equal(isUnicodeOrIpv6PrivateImageUrl(ipv6Product.image_url ?? ''), true);
  });
});

describe('Unicode/IPv6 Image URL ingest source stays aligned', () => {
  it('stores raw image_url without Unicode or IPv6 host checks', () => {
    const catalog = readRepo('src/catalog.ts');
    assert.match(catalog, /images: product\.image_url \? \[product\.image_url\] : undefined/);
    assert.equal(catalog.includes('::1'), false);
    assert.equal(catalog.includes('fe80'), false);
    assert.equal(catalog.includes('U+3002'), false);
    assert.equal(catalog.includes('fullwidth'), false);
    assert.equal(productionCanonicalizesUnicodeOrIpv6Hosts(), false);
  });
});
