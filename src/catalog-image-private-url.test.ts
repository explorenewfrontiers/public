import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import XLSX from 'xlsx';
import { parseProductCatalog } from './catalog.js';
import {
  isPrivateOrLinkLocalImageUrl,
  productionRejectsPrivateImageUrls,
  stripeImagesFromCatalogRow,
} from './catalog-image-private-url.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempDirs: string[] = [];

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function writeCatalog(imageUrl: string): string {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['Name', 'Price', 'Image URL'],
    ['Metadata Probe', 1, imageUrl],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Catalog');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'private-image-'));
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

describe('private and link-local Image URLs are stored on products', () => {
  it('classifies loopback, link-local metadata, and RFC1918 hosts as private', () => {
    assert.equal(isPrivateOrLinkLocalImageUrl('http://169.254.169.254/latest/meta-data/'), true);
    assert.equal(isPrivateOrLinkLocalImageUrl('http://127.0.0.1:8000/admin'), true);
    assert.equal(isPrivateOrLinkLocalImageUrl('http://localhost/secret.png'), true);
    assert.equal(isPrivateOrLinkLocalImageUrl('http://[::1]/img'), true);
    assert.equal(isPrivateOrLinkLocalImageUrl('http://10.0.0.5/p.png'), true);
    assert.equal(isPrivateOrLinkLocalImageUrl('http://192.168.1.10/p.png'), true);
    assert.equal(isPrivateOrLinkLocalImageUrl('http://172.16.0.1/p.png'), true);
    assert.equal(isPrivateOrLinkLocalImageUrl('https://metadata.google.internal/computeMetadata/v1/'), true);
    assert.equal(isPrivateOrLinkLocalImageUrl('//169.254.169.254/latest/meta-data/'), true);
    assert.equal(isPrivateOrLinkLocalImageUrl('https://cdn.example.com/p.png'), false);
    assert.deepEqual(
      stripeImagesFromCatalogRow('http://169.254.169.254/latest/meta-data/'),
      ['http://169.254.169.254/latest/meta-data/']
    );
    assert.equal(productionRejectsPrivateImageUrls(), false);
  });

  it('parseProductCatalog keeps a link-local metadata Image URL', async () => {
    const metadataUrl = 'http://169.254.169.254/latest/meta-data/';
    const filePath = writeCatalog(metadataUrl);
    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 1);
    const product = products[0];
    assert.ok(product);
    assert.equal(product.image_url, metadataUrl);
    assert.equal(isPrivateOrLinkLocalImageUrl(product.image_url ?? ''), true);
  });
});

describe('private Image URL ingest source stays aligned', () => {
  it('syncs any truthy image_url onto Stripe Product.images', () => {
    const catalog = readRepo('src/catalog.ts');
    assert.match(catalog, /images: product\.image_url \? \[product\.image_url\] : undefined/);
    assert.equal(catalog.includes('169.254.169.254'), false);
    assert.equal(catalog.includes('isPrivateOrLinkLocalImageUrl'), false);
    assert.equal(productionRejectsPrivateImageUrls(), false);
  });
});
