import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  isUnsafeImageUrl,
  productionRejectsUnsafeImageUrls,
  stripeImagesFromCatalogRow,
} from './catalog-image-url-scheme.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('catalog Excel Image URL schemes are stored unsanitized', () => {
  it('treats javascript/data/file/vbscript URLs as unsafe', () => {
    assert.equal(isUnsafeImageUrl('javascript:alert(1)'), true);
    assert.equal(isUnsafeImageUrl(' DATA:text/html,<script>x</script> '), true);
    assert.equal(isUnsafeImageUrl('file:///etc/passwd'), true);
    assert.equal(isUnsafeImageUrl('vbscript:msgbox(1)'), true);
    assert.equal(isUnsafeImageUrl('https://cdn.example.com/p.png'), false);
  });

  it('production would persist a javascript: Image URL on the Stripe product', () => {
    const payload = 'javascript:alert(document.cookie)';
    assert.deepEqual(stripeImagesFromCatalogRow(payload), [payload]);
    assert.equal(productionRejectsUnsafeImageUrls(), false);
  });
});

describe('catalog image URL source stays aligned', () => {
  it('create and update paths assign image_url with no scheme check', () => {
    const catalog = readRepo('src/catalog.ts');

    assert.match(catalog, /image_url: \(row\['Image URL'\] \|\| row\['image_url'\] \|\| ''\) as string/);

    const imageAssignments = catalog.match(
      /images: product\.image_url \? \[product\.image_url\] : undefined/g
    );
    assert.equal(imageAssignments?.length, 3);

    assert.equal(catalog.includes('javascript:'), false);
    assert.equal(catalog.includes('startsWith'), false);
    assert.equal(catalog.includes('new URL'), false);
  });
});
