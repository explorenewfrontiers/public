import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import type Stripe from 'stripe';
import {
  centsFromCatalogPrice,
  nameBasedProductLookupImplemented,
  successfulProductUpdateWritesPrice,
} from './catalog-stale-price-on-update.js';
import { syncProductsToStripe } from './catalog.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('catalog ID update leaves the Stripe price unchanged', () => {
  it('reports that a successful update does not write a price', () => {
    assert.equal(successfulProductUpdateWritesPrice(), false);
    assert.equal(nameBasedProductLookupImplemented(), false);
    assert.equal(centsFromCatalogPrice(12.5), 1250);
  });

  it('does not call prices.create or prices.update when retrieve+update succeed', async () => {
    const priceCreates: unknown[] = [];
    const priceUpdates: unknown[] = [];
    const productCreates: unknown[] = [];

    const stripe = {
      products: {
        retrieve: async (id: string) => ({ id, name: 'Old Coffee' }),
        update: async (id: string, params: { name: string }) => ({
          id,
          name: params.name,
        }),
        create: async (params: { name: string }) => {
          productCreates.push(params);
          return { id: 'prod_should_not_create', name: params.name };
        },
      },
      prices: {
        create: async (params: unknown) => {
          priceCreates.push(params);
          return { id: 'price_should_not_create' };
        },
        update: async (id: string, params: unknown) => {
          priceUpdates.push({ id, params });
          return { id };
        },
      },
    };

    const originalLog = console.log;
    console.log = () => {};
    let result: Awaited<ReturnType<typeof syncProductsToStripe>>;
    try {
      result = await syncProductsToStripe(
        [
          {
            id: 'prod_existing',
            name: 'Coffee',
            price: 19.99,
            currency: 'usd',
          },
        ],
        stripe as unknown as Stripe
      );
    } finally {
      console.log = originalLog;
    }

    assert.equal(result.updated.length, 1);
    assert.equal(result.updated[0]?.id, 'prod_existing');
    assert.equal(result.created.length, 0);
    assert.equal(priceCreates.length, 0);
    assert.equal(priceUpdates.length, 0);
    assert.equal(productCreates.length, 0);
  });
});

describe('catalog stale-price source stays aligned', () => {
  it('updates product fields on ID hit and never looks up by name', () => {
    const catalog = readRepo('src/catalog.ts');
    const syncStart = catalog.indexOf('export async function syncProductsToStripe');
    const syncEnd = catalog.indexOf('export async function getStripeProducts');
    assert.ok(syncStart >= 0 && syncEnd > syncStart, 'syncProductsToStripe bounds');
    const syncFn = catalog.slice(syncStart, syncEnd);

    assert.match(syncFn, /\/\/ Try to find existing product by ID or name/);
    assert.match(syncFn, /if \(product\.id\) \{/);
    assert.equal(syncFn.includes('products.list'), false);
    assert.equal(syncFn.includes("eq('name'"), false);
    assert.match(
      catalog,
      /stripeProduct = await stripe\.products\.update\(product\.id, \{/
    );
    assert.match(catalog, /updated\.push\(stripeProduct\)/);

    const updateBlockStart = catalog.indexOf('if (product.id)');
    const createBlockStart = catalog.indexOf('} else {');
    const updateBlock = catalog.slice(updateBlockStart, createBlockStart);
    assert.equal(updateBlock.includes('prices.create'), false);
    assert.equal(updateBlock.includes('prices.update'), false);

    const createBlock = catalog.slice(createBlockStart);
    assert.match(createBlock, /await stripe\.prices\.create\(/);
    assert.match(createBlock, /unit_amount: Math\.round\(product\.price \* 100\)/);
  });
});
