import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import XLSX from 'xlsx';
import { parseProductCatalog } from './catalog.js';
import {
  USERINFO_PRIVATE_IMAGE_URLS,
  isUserinfoPrivateImageUrl,
  nodeHostname,
  productionCanonicalizesUserinfoImageUrls,
  stripeImagesFromCatalogRow,
} from './catalog-image-userinfo.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempDirs: string[] = [];

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function writeCatalog(imageUrl: string): string {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['Name', 'Price', 'Image URL'],
    ['Userinfo Host', 1, imageUrl],
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'userinfo-image-'));
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

describe('userinfo Image URLs resolve to private hosts', () => {
  it('classifies @-trick URLs by the host after userinfo', () => {
    assert.equal(
      nodeHostname('https://cdn.example.com@169.254.169.254/latest/meta-data/'),
      '169.254.169.254'
    );
    assert.equal(nodeHostname('https://images.stripe.com@127.0.0.1/img.png'), '127.0.0.1');
    assert.equal(isUserinfoPrivateImageUrl('https://cdn.example.com/p.png'), false);
    assert.equal(isUserinfoPrivateImageUrl('https://user@cdn.example.com/p.png'), false);
    for (const url of USERINFO_PRIVATE_IMAGE_URLS) {
      assert.equal(isUserinfoPrivateImageUrl(url), true);
    }
  });

  it('parseProductCatalog stores the raw userinfo metadata URL', async () => {
    const imageUrl = 'https://cdn.example.com@169.254.169.254/latest/meta-data/';
    const filePath = writeCatalog(imageUrl);
    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 1);
    const product = products[0];
    assert.ok(product);
    assert.equal(product.image_url, imageUrl);
    assert.deepEqual(stripeImagesFromCatalogRow(product.image_url ?? ''), [imageUrl]);
    assert.equal(isUserinfoPrivateImageUrl(product.image_url ?? ''), true);
    assert.equal(productionCanonicalizesUserinfoImageUrls(), false);
  });
});

describe('catalog image ingest source stays aligned', () => {
  it('writes Product.images from the raw Image URL cell', () => {
    const source = readRepo('src/catalog.ts');
    assert.match(source, /image_url: \(row\['Image URL'\] \|\| row\['image_url'\] \|\| ''\) as string/);
    assert.match(source, /images: product\.image_url \? \[product\.image_url\] : undefined/);
    assert.equal(source.includes('new URL('), false);
    assert.equal(source.includes('username'), false);
  });
});
