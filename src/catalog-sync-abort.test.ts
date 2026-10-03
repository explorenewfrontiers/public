import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import type Stripe from 'stripe';
import { syncProductsToStripe, type ProductRow } from './catalog.js';
import { shouldAbortRemainingProducts } from './catalog-sync-abort.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function fakeStripe(options: {
  createImpl: (params: { name: string }) => Promise<{ id: string; name: string }>;
}): {
  stripe: Stripe;
  retrieveNames: string[];
  createNames: string[];
} {
  const retrieveNames: string[] = [];
  const createNames: string[] = [];

  const stripe = {
    products: {
      retrieve: async (id: string) => {
        retrieveNames.push(id);
        throw new Error(`No such product: '${id}'`);
      },
      update: async () => {
        throw new Error('update should not run after retrieve failure');
      },
      create: async (params: { name: string }) => {
        createNames.push(params.name);
        return options.createImpl(params);
      },
    },
    prices: {
      create: async () => ({ id: 'price_ok' }),
    },
  };

  return { stripe: stripe as unknown as Stripe, retrieveNames, createNames };
}

describe('catalog sync aborts remaining rows after fallback create fails', () => {
  it('stops the loop so later Excel products are never created', async () => {
    assert.equal(shouldAbortRemainingProducts(true), true);

    const products: ProductRow[] = [
      { name: 'Keep Me', price: 10, currency: 'usd' },
      { id: 'prod_missing', name: 'Broken Fallback', price: 20, currency: 'usd' },
      { name: 'Never Reached', price: 30, currency: 'usd' },
    ];

    const { stripe, retrieveNames, createNames } = fakeStripe({
      createImpl: async (params) => {
        if (params.name === 'Broken Fallback') {
          throw new Error('create failed: invalid currency');
        }
        return { id: `prod_${params.name}`, name: params.name };
      },
    });

    await assert.rejects(
      () => syncProductsToStripe(products, stripe),
      /create failed: invalid currency/
    );

    assert.deepEqual(retrieveNames, ['prod_missing']);
    assert.equal(createNames.includes('Keep Me'), true);
    assert.equal(createNames.includes('Broken Fallback'), true);
    assert.equal(createNames.includes('Never Reached'), false);
  });
});

describe('catalog sync abort source stays aligned', () => {
  it('rethrows retrieve errors into an unguarded fallback create', () => {
    const catalog = readRepo('src/catalog.ts');

    assert.match(catalog, /throw error;/);
    assert.match(
      catalog,
      /\/\/ Create new product if update failed/
    );
    assert.match(
      catalog,
      /const stripeProduct = await stripe\.products\.create\(/
    );
    assert.equal(catalog.includes('continue;'), false);
    assert.equal(catalog.includes('errors.push'), false);
  });
});
