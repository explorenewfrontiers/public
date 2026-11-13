import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import XLSX from 'xlsx';
import type Stripe from 'stripe';
import {
  parseProductCatalog,
  syncProductsToStripe,
  getStripeProducts,
  type ProductRow,
} from './catalog.js';

function writeWorkbook(filePath: string, sheets: Array<{ name: string; rows: Record<string, unknown>[] }>): void {
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sheet.rows), sheet.name);
  }
  XLSX.writeFile(workbook, filePath);
}

function createMockStripe() {
  const createdProducts: Array<Record<string, unknown>> = [];
  const createdPrices: Array<Record<string, unknown>> = [];
  const updatedProducts: Array<Record<string, unknown>> = [];
  const retrieveById: Record<string, Record<string, unknown>> = {};
  let lastProductListParams: Record<string, unknown> | undefined;
  let productSeq = 0;
  let updateError: Error | undefined;

  const stripe = {
    products: {
      retrieve: async (id: string) => {
        if (!retrieveById[id]) {
          throw new Error(`No such product: ${id}`);
        }
        return retrieveById[id];
      },
      update: async (id: string, data: Record<string, unknown>) => {
        if (updateError) {
          throw updateError;
        }
        const updated = { id, ...data };
        updatedProducts.push(updated);
        retrieveById[id] = updated;
        return updated;
      },
      create: async (data: Record<string, unknown>) => {
        const product = { id: `prod_${++productSeq}`, ...data };
        createdProducts.push(product);
        return product;
      },
      list: async (params: Record<string, unknown>) => {
        lastProductListParams = params;
        return { data: Object.values(retrieveById) };
      },
    },
    prices: {
      create: async (data: Record<string, unknown>) => {
        const price = { id: `price_${createdPrices.length + 1}`, ...data };
        createdPrices.push(price);
        return price;
      },
    },
  };

  return {
    stripe: stripe as unknown as Stripe,
    createdProducts,
    createdPrices,
    updatedProducts,
    retrieveById,
    get lastProductListParams() {
      return lastProductListParams;
    },
    failNextUpdate(error: Error) {
      updateError = error;
    },
  };
}

describe('parseProductCatalog edge cases', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-catalog-edge-'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('parses Excel prices stored as strings', async () => {
    const filePath = path.join(tmpDir, 'string-price.xlsx');
    writeWorkbook(filePath, [{ name: 'Products', rows: [{ Name: 'Mug', Price: '12.50' }] }]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.price, 12.5);
  });

  it('yields NaN for a non-numeric price cell', async () => {
    const filePath = path.join(tmpDir, 'bad-price.xlsx');
    writeWorkbook(filePath, [{ name: 'Products', rows: [{ Name: 'Broken', Price: 'free' }] }]);

    const products = await parseProductCatalog(filePath);
    assert.equal(Number.isNaN(products[0]?.price), true);
  });

  it('reads only the first worksheet when multiple sheets are present', async () => {
    const filePath = path.join(tmpDir, 'two-sheets.xlsx');
    writeWorkbook(filePath, [
      { name: 'Live', rows: [{ Name: 'Live Product', Price: 10 }] },
      { name: 'Archive', rows: [{ Name: 'Archived Product', Price: 99 }] },
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 1);
    assert.equal(products[0]?.name, 'Live Product');
  });

  it('keeps a numeric SKU cell as a number in metadata (current Excel contract)', async () => {
    const filePath = path.join(tmpDir, 'numeric-sku.xlsx');
    writeWorkbook(filePath, [{ name: 'Products', rows: [{ Name: 'Widget', SKU: 1001 }] }]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.sku, 1001);
    assert.equal(products[0]?.metadata?.sku, 1001);
  });
});

describe('syncProductsToStripe edge cases', () => {
  before(() => {
    mock.method(console, 'log', () => undefined);
    mock.method(console, 'error', () => undefined);
  });

  after(() => {
    mock.restoreAll();
  });

  it('omits images and description when they are empty strings', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe(
      [{ name: 'Blank', price: 5, description: '', image_url: '', currency: 'usd' }],
      mockStripe.stripe
    );

    assert.equal(mockStripe.createdProducts[0]?.description, undefined);
    assert.equal(mockStripe.createdProducts[0]?.images, undefined);
  });

  it('defaults missing currency to usd and does not invent a price for an empty catalog', async () => {
    const mockStripe = createMockStripe();
    const empty = await syncProductsToStripe([], mockStripe.stripe);
    assert.deepEqual(empty, { created: [], updated: [] });
    assert.equal(mockStripe.createdPrices.length, 0);

    await syncProductsToStripe([{ name: 'NoFx', price: 1 }], mockStripe.stripe);
    assert.equal(mockStripe.createdPrices[0]?.currency, 'usd');
    assert.equal(mockStripe.createdPrices[0]?.unit_amount, 100);
  });

  it('sends NaN cents when the catalog price is not a number', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe([{ name: 'Broken', price: Number.NaN, currency: 'usd' }], mockStripe.stripe);
    assert.equal(Number.isNaN(mockStripe.createdPrices[0]?.unit_amount), true);
  });

  it('creates a negative unit_amount for a negative catalog price', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe([{ name: 'Credit', price: -2.5, currency: 'usd' }], mockStripe.stripe);
    assert.equal(mockStripe.createdPrices[0]?.unit_amount, -250);
  });

  it('falls back to create when an existing product update throws', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_existing = { id: 'prod_existing', name: 'Old' };
    mockStripe.failNextUpdate(new Error('update rejected'));

    const products: ProductRow[] = [
      { id: 'prod_existing', name: 'New Name', price: 9, currency: 'usd' },
    ];
    const result = await syncProductsToStripe(products, mockStripe.stripe);

    assert.equal(result.updated.length, 0);
    assert.equal(result.created.length, 1);
    assert.equal(mockStripe.createdProducts[0]?.name, 'New Name');
    assert.equal(mockStripe.createdPrices[0]?.unit_amount, 900);
  });
});

describe('getStripeProducts defaults', () => {
  it('requests 100 active products when no limit is passed', async () => {
    const mockStripe = createMockStripe();
    await getStripeProducts(mockStripe.stripe);
    assert.deepEqual(mockStripe.lastProductListParams, { limit: 100, active: true });
  });
});
