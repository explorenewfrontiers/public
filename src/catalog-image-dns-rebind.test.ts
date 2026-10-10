import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import XLSX from 'xlsx';
import { parseProductCatalog } from './catalog.js';
import {
  DNS_REBIND_IMAGE_URLS,
  hostnameLooksLikeDnsRebind,
  isDnsRebindImageUrl,
  nodeHostname,
  productionResolvesOrBlocksRebindHosts,
  stripeImagesFromCatalogRow,
} from './catalog-image-dns-rebind.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempDirs: string[] = [];

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function writeCatalog(imageUrl: string): string {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['Name', 'Price', 'Image URL'],
    ['Rebind Host', 1, imageUrl],
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dns-rebind-image-'));
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

describe('wildcard DNS Image URLs keep public-looking private hosts', () => {
  it('classifies nip.io, sslip.io, and localtest.me as DNS-rebind hosts', () => {
    assert.equal(nodeHostname('http://127.0.0.1.nip.io/img.png'), '127.0.0.1.nip.io');
    assert.equal(nodeHostname('http://127.0.0.1.sslip.io/img.png'), '127.0.0.1.sslip.io');
    assert.equal(
      nodeHostname('http://localhost.localtest.me/img.png'),
      'localhost.localtest.me'
    );
    assert.equal(
      nodeHostname('http://169.254.169.254.nip.io/latest/meta-data/'),
      '169.254.169.254.nip.io'
    );
    assert.equal(hostnameLooksLikeDnsRebind('127.0.0.1.nip.io'), true);
    assert.equal(hostnameLooksLikeDnsRebind('cdn.example.com'), false);
    assert.equal(isDnsRebindImageUrl('https://cdn.example.com/p.png'), false);
    for (const url of DNS_REBIND_IMAGE_URLS) {
      assert.equal(isDnsRebindImageUrl(url), true);
    }
  });

  it('parseProductCatalog stores a nip.io Image URL that embeds loopback', async () => {
    const rebindUrl = 'http://127.0.0.1.nip.io/img.png';
    const filePath = writeCatalog(rebindUrl);
    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 1);
    const product = products[0];
    assert.ok(product);
    assert.equal(product.image_url, rebindUrl);
    assert.equal(nodeHostname(product.image_url ?? ''), '127.0.0.1.nip.io');
    assert.equal(isDnsRebindImageUrl(product.image_url ?? ''), true);
    assert.deepEqual(stripeImagesFromCatalogRow(product.image_url ?? ''), [rebindUrl]);
  });

  it('parseProductCatalog stores metadata-IP and localtest.me Image URLs', async () => {
    const metadataUrl = 'http://169.254.169.254.nip.io/latest/meta-data/';
    const metadataProducts = await parseProductCatalog(writeCatalog(metadataUrl));
    const metadataProduct = metadataProducts[0];
    assert.ok(metadataProduct);
    assert.equal(metadataProduct.image_url, metadataUrl);
    assert.equal(isDnsRebindImageUrl(metadataProduct.image_url ?? ''), true);

    const localtestUrl = 'http://localhost.localtest.me/img.png';
    const localtestProducts = await parseProductCatalog(writeCatalog(localtestUrl));
    const localtestProduct = localtestProducts[0];
    assert.ok(localtestProduct);
    assert.equal(localtestProduct.image_url, localtestUrl);
    assert.equal(isDnsRebindImageUrl(localtestProduct.image_url ?? ''), true);
    assert.equal(productionResolvesOrBlocksRebindHosts(), false);
  });
});

describe('DNS-rebind Image URL ingest source stays aligned', () => {
  it('stores raw image_url without DNS lookup or rebind-suffix checks', () => {
    const catalog = readRepo('src/catalog.ts');
    assert.match(catalog, /images: product\.image_url \? \[product\.image_url\] : undefined/);
    assert.equal(catalog.includes('nip.io'), false);
    assert.equal(catalog.includes('sslip.io'), false);
    assert.equal(catalog.includes('localtest.me'), false);
    assert.equal(catalog.includes('dns.lookup'), false);
    assert.equal(catalog.includes('dns.resolve'), false);
    assert.equal(productionResolvesOrBlocksRebindHosts(), false);
  });
});
