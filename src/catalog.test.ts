import assert from 'node:assert/strict';
import { after, afterEach, before, describe, it } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import XLSX from 'xlsx';
import type Stripe from 'stripe';
import {
  getProductWithPrices,
  getStripeProducts,
  parseProductCatalog,
  syncProductsToStripe,
  type ProductRow,
} from './catalog.js';

const tempDirs: string[] = [];
const originalLog = console.log;
const originalError = console.error;

before(() => {
  console.log = () => undefined;
  console.error = () => undefined;
});

after(() => {
  console.log = originalLog;
  console.error = originalError;
});

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function writeCatalog(rows: Record<string, unknown>[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-'));
  tempDirs.push(dir);
  const file = path.join(dir, 'catalog.xlsx');
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
  XLSX.writeFile(workbook, file);
  return file;
}

function productRow(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    name: 'Widget',
    price: 10,
    ...overrides,
  };
}

interface MockStripeOptions {
  existing?: Record<string, { id: string; name: string }>;
  failCreate?: boolean;
}

function createMockStripe(options: MockStripeOptions = {}) {
  const createdProducts: Record<string, unknown>[] = [];
  const updatedProducts: Record<string, unknown>[] = [];
  const createdPrices: Record<string, unknown>[] = [];
  const listCalls: Record<string, unknown>[] = [];
  const retrieveCalls: string[] = [];
  let productSeq = 0;

  const stripe = {
    products: {
      retrieve: async (id: string) => {
        retrieveCalls.push(id);
        const existing = options.existing?.[id];
        if (!existing) {
          throw new Error(`No such product: ${id}`);
        }
        return existing;
      },
      update: async (id: string, data: Record<string, unknown>) => {
        const updated = { id, ...data };
        updatedProducts.push(updated);
        return updated;
      },
      create: async (data: Record<string, unknown>) => {
        if (options.failCreate) {
          throw new Error('create failed');
        }
        productSeq += 1;
        const created = { id: `prod_${productSeq}`, ...data };
        createdProducts.push(created);
        return created;
      },
      list: async (params: Record<string, unknown>) => {
        listCalls.push(params);
        return { data: [{ id: 'prod_1', name: 'Listed' }] };
      },
    },
    prices: {
      create: async (data: Record<string, unknown>) => {
        createdPrices.push(data);
        return { id: 'price_1', ...data };
      },
      list: async (params: Record<string, unknown>) => {
        listCalls.push(params);
        return {
          data: [{ id: 'price_1', product: params.product, unit_amount: 1000, currency: 'usd' }],
        };
      },
    },
  };

  return { stripe: stripe as unknown as Stripe, createdProducts, updatedProducts, createdPrices, listCalls, retrieveCalls };
}

describe('parseProductCatalog', () => {
  it('maps title-case columns and lowercases currency', async () => {
    const file = writeCatalog([
      {
        ID: 'prod_existing',
        Name: 'Trail Tent',
        Description: 'Two-person tent',
        Price: 129.99,
        Currency: 'USD',
        'Image URL': 'https://example.com/tent.png',
        Category: 'gear',
        SKU: 'TENT-1',
      },
    ]);

    const [product] = await parseProductCatalog(file);
    assert.deepEqual(product, {
      id: 'prod_existing',
      name: 'Trail Tent',
      description: 'Two-person tent',
      price: 129.99,
      currency: 'usd',
      image_url: 'https://example.com/tent.png',
      category: 'gear',
      sku: 'TENT-1',
      metadata: { category: 'gear', sku: 'TENT-1' },
    });
  });

  it('accepts lowercase column names and default values', async () => {
    const file = writeCatalog([{ name: 'Mug', price: '12.5' }]);
    const [product] = await parseProductCatalog(file);

    assert.equal(product?.name, 'Mug');
    assert.equal(product?.price, 12.5);
    assert.equal(product?.currency, 'usd');
    assert.equal(product?.id, '');
    assert.equal(product?.description, '');
    assert.equal(product?.image_url, '');
  });

  it('defaults a missing name and price', async () => {
    const file = writeCatalog([{ Description: 'No name row' }]);
    const [product] = await parseProductCatalog(file);

    assert.equal(product?.name, 'Unnamed Product');
    assert.equal(product?.price, 0);
  });

  it('returns an empty list for a header-only sheet', async () => {
    const file = writeCatalog([]);
    const products = await parseProductCatalog(file);
    assert.deepEqual(products, []);
  });
});

describe('syncProductsToStripe', () => {
  it('creates a product and price in cents when no id is set', async () => {
    const { stripe, createdProducts, createdPrices, updatedProducts } = createMockStripe();

    const result = await syncProductsToStripe(
      [productRow({ name: 'Lamp', price: 19.99, currency: 'eur', sku: 'LAMP-1', image_url: 'https://img/lamp.png' })],
      stripe
    );

    assert.equal(result.created.length, 1);
    assert.equal(result.updated.length, 0);
    assert.equal(createdProducts[0]?.name, 'Lamp');
    assert.deepEqual(createdProducts[0]?.images, ['https://img/lamp.png']);
    assert.equal(updatedProducts.length, 0);
    assert.equal(createdPrices[0]?.unit_amount, 1999);
    assert.equal(createdPrices[0]?.currency, 'eur');
    assert.equal(createdPrices[0]?.product, 'prod_1');
    assert.deepEqual(createdPrices[0]?.metadata, { sku: 'LAMP-1' });
  });

  it('rounds fractional cents using Math.round', async () => {
    const { stripe, createdPrices } = createMockStripe();
    await syncProductsToStripe([productRow({ price: 10.125 })], stripe);
    assert.equal(createdPrices[0]?.unit_amount, 1013);
  });

  it('updates an existing product by id and does not create a price', async () => {
    const { stripe, createdPrices, updatedProducts, createdProducts } = createMockStripe({
      existing: { prod_123: { id: 'prod_123', name: 'Old' } },
    });

    const result = await syncProductsToStripe(
      [productRow({ id: 'prod_123', name: 'New name', description: 'Updated' })],
      stripe
    );

    assert.equal(result.updated.length, 1);
    assert.equal(result.created.length, 0);
    assert.equal(updatedProducts[0]?.name, 'New name');
    assert.equal(createdProducts.length, 0);
    assert.equal(createdPrices.length, 0);
  });

  it('falls back to create when retrieve fails for a supplied id', async () => {
    const { stripe, createdProducts, createdPrices, retrieveCalls } = createMockStripe();

    const result = await syncProductsToStripe(
      [productRow({ id: 'prod_missing', name: 'Recovered', price: 5 })],
      stripe
    );

    assert.deepEqual(retrieveCalls, ['prod_missing']);
    assert.equal(result.created.length, 1);
    assert.equal(result.updated.length, 0);
    assert.equal(createdProducts[0]?.name, 'Recovered');
    assert.equal(createdPrices[0]?.unit_amount, 500);
  });

  it('treats an empty string id as a create', async () => {
    const { stripe, retrieveCalls, createdProducts } = createMockStripe();
    await syncProductsToStripe([productRow({ id: '', name: 'Blank id' })], stripe);
    assert.deepEqual(retrieveCalls, []);
    assert.equal(createdProducts[0]?.name, 'Blank id');
  });
});

describe('getStripeProducts', () => {
  it('lists active products with the provided limit', async () => {
    const { stripe, listCalls } = createMockStripe();
    const products = await getStripeProducts(stripe, 25);
    assert.deepEqual(listCalls[0], { limit: 25, active: true });
    assert.equal(products[0]?.id, 'prod_1');
  });

  it('defaults the list limit to 100', async () => {
    const { stripe, listCalls } = createMockStripe();
    await getStripeProducts(stripe);
    assert.deepEqual(listCalls[0], { limit: 100, active: true });
  });
});

describe('getProductWithPrices', () => {
  it('loads the product and its active prices', async () => {
    const { stripe, listCalls } = createMockStripe({
      existing: { prod_9: { id: 'prod_9', name: 'Kit' } },
    });

    const result = await getProductWithPrices(stripe, 'prod_9');
    assert.equal(result.product.id, 'prod_9');
    assert.equal(result.prices[0]?.id, 'price_1');
    assert.deepEqual(listCalls[0], { product: 'prod_9', active: true });
  });
});
