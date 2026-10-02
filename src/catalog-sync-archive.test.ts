import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  idsSyncWouldArchive,
  stripeIdsMissingFromExcel,
} from './catalog-sync-archive.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('catalog sync never archives omitted products', () => {
  it('detects Stripe IDs missing from Excel but archives none of them', () => {
    const excelIds = ['prod_keep'];
    const stripeIds = ['prod_keep', 'prod_old', 'prod_discontinued'];

    assert.deepEqual(stripeIdsMissingFromExcel(excelIds, stripeIds), [
      'prod_old',
      'prod_discontinued',
    ]);
    assert.deepEqual(idsSyncWouldArchive(excelIds, stripeIds), []);
  });
});

describe('catalog sync archive source stays aligned', () => {
  it('syncProductsToStripe never sets active false or diffs existing catalog', () => {
    const catalog = readRepo('src/catalog.ts');
    const syncStart = catalog.indexOf('export async function syncProductsToStripe');
    const syncEnd = catalog.indexOf('export async function getStripeProducts');
    const syncFn = catalog.slice(syncStart, syncEnd);

    assert.equal(syncFn.includes("active: false"), false);
    assert.equal(syncFn.includes("active:false"), false);
    assert.equal(syncFn.includes('products.list'), false);
    assert.equal(syncFn.includes('products.del'), false);
    assert.equal(syncFn.includes('products.create'), true);
    assert.equal(syncFn.includes('products.update'), true);
    assert.equal(syncFn.includes('products.retrieve'), true);
  });
});
