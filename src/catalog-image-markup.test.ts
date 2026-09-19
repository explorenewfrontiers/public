import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { renderCatalogModalImage, renderCatalogProductImage } from './catalog-image-markup.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('catalog image attribute interpolation', () => {
  it('interpolates javascript: and quote-breaking image URLs into src', () => {
    const card = renderCatalogProductImage({
      name: 'Tent',
      images: ['javascript:alert(1)'],
    });
    assert.match(card, /<img src="javascript:alert\(1\)" alt="Tent" class="product-image">/);

    const broken = renderCatalogProductImage({
      name: 'Mug',
      images: ['https://cdn.example/x.png" onerror="alert(1)'],
    });
    assert.match(
      broken,
      /<img src="https:\/\/cdn\.example\/x\.png" onerror="alert\(1\)" alt="Mug" class="product-image">/
    );
  });

  it('interpolates quote-breaking names into alt', () => {
    const card = renderCatalogProductImage({
      name: 'Mug" onload="alert(1)',
      images: ['https://cdn.example/mug.png'],
    });
    assert.match(
      card,
      /<img src="https:\/\/cdn\.example\/mug\.png" alt="Mug" onload="alert\(1\)" class="product-image">/
    );
  });

  it('uses the placeholder block when images are missing', () => {
    assert.equal(
      renderCatalogProductImage({ name: 'No image' }),
      `<div class="product-image">📦</div>`
    );
  });

  it('modal image uses the same unsanitized src/alt contract', () => {
    const html = renderCatalogModalImage({
      name: 'Lamp',
      images: ['javascript:alert(2)'],
    });
    assert.match(html, /<img src="javascript:alert\(2\)" alt="Lamp">/);
  });
});

describe('catalog image source stays aligned', () => {
  it('app.js interpolates images[0] and name into img attributes', () => {
    const appJs = readRepo('public/app.js');
    const catalog = readRepo('src/catalog.ts');

    assert.match(appJs, /src="\$\{product\.images\[0\]\}" alt="\$\{product\.name\}"/);
    assert.match(catalog, /images: product\.image_url \? \[product\.image_url\] : undefined/);
  });
});
