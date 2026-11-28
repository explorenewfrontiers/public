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
  getProductWithPrices,
  type ProductRow,
} from './catalog.js';

function writeCatalog(rows: Record<string, unknown>[], filePath: string): void {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
  XLSX.writeFile(workbook, filePath);
}

function writeAoa(filePath: string, rows: unknown[][]): void {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
  XLSX.writeFile(workbook, filePath);
}

function createMockStripe() {
  const createdProducts: Array<Record<string, unknown>> = [];
  const createdPrices: Array<Record<string, unknown>> = [];
  const updatedProducts: Array<Record<string, unknown>> = [];
  const retrieveById: Record<string, Record<string, unknown>> = {};
  const retrieveCalls: Array<string | number | boolean> = [];
  const createCalls: Array<Record<string, unknown>> = [];
  const priceListByProduct: Record<string, Array<Record<string, unknown>>> = {};
  let lastPriceListParams: Record<string, unknown> | undefined;
  let productSeq = 0;
  let createErrorForName: string | undefined;

  const stripe = {
    products: {
      retrieve: async (id: string) => {
        retrieveCalls.push(id);
        if (!retrieveById[id as string]) {
          throw new Error(`No such product: ${id}`);
        }
        return retrieveById[id as string];
      },
      update: async (id: string, data: Record<string, unknown>) => {
        const updated = { id, ...data };
        updatedProducts.push(updated);
        retrieveById[id] = { ...retrieveById[id], ...updated };
        return updated;
      },
      create: async (data: Record<string, unknown>) => {
        createCalls.push(data);
        if (createErrorForName && data.name === createErrorForName) {
          throw new Error(`Invalid product name: ${createErrorForName}`);
        }
        const product = { id: `prod_${++productSeq}`, ...data };
        createdProducts.push(product);
        retrieveById[product.id] = product;
        return product;
      },
    },
    prices: {
      create: async (data: Record<string, unknown>) => {
        const price = { id: `price_${createdPrices.length + 1}`, ...data };
        createdPrices.push(price);
        return price;
      },
      list: async (params: Record<string, unknown>) => {
        lastPriceListParams = params;
        const productId = String(params.product);
        return { data: priceListByProduct[productId] ?? [] };
      },
    },
  };

  return {
    stripe: stripe as unknown as Stripe,
    createdProducts,
    createdPrices,
    updatedProducts,
    retrieveById,
    retrieveCalls,
    createCalls,
    priceListByProduct,
    get lastPriceListParams() {
      return lastPriceListParams;
    },
    failCreateForName(name: string) {
      createErrorForName = name;
    },
  };
}

describe('parseProductCatalog remaining abort and whitespace isolation', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-catalog-parse-abort-'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('throws on a numeric Currency cell (840) because toLowerCase is not a function, aborting later rows', async () => {
    const filePath = path.join(tmpDir, 'numeric-currency.xlsx');
    writeAoa(filePath, [
      ['Name', 'Price', 'Currency'],
      ['Mug', 12, 840],
      ['Tent', 89.99, 'usd'],
    ]);

    await assert.rejects(
      () => parseProductCatalog(filePath),
      (error: unknown) => {
        assert.equal(error instanceof TypeError, true);
        assert.match(String(error), /toLowerCase is not a function/);
        return true;
      }
    );
  });

  it('keeps a whitespace-only Name instead of substituting Unnamed Product', async () => {
    const filePath = path.join(tmpDir, 'whitespace-name.xlsx');
    writeCatalog([{ Name: '   ', Price: 12 }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.name, '   ');
    assert.notEqual(products[0]?.name, 'Unnamed Product');
    assert.equal(products[0]?.price, 12);
  });

  it('keeps a whitespace-only Description instead of treating it as missing', async () => {
    const filePath = path.join(tmpDir, 'whitespace-description.xlsx');
    writeCatalog([{ Name: 'Mug', Price: 12, Description: '   ' }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.description, '   ');
  });

  it('yields NaN for a boolean Price of true (Excel TRUE)', async () => {
    const filePath = path.join(tmpDir, 'boolean-price.xlsx');
    writeAoa(filePath, [
      ['Name', 'Price'],
      ['Flagged', true],
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.name, 'Flagged');
    assert.equal(Number.isNaN(products[0]?.price), true);
  });

  it('forwards a relative Image URL instead of dropping or absolutizing it', async () => {
    const filePath = path.join(tmpDir, 'relative-image.xlsx');
    writeCatalog(
      [{ Name: 'Mug', Price: 8, 'Image URL': 'images/mug.png' }],
      filePath
    );

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.image_url, 'images/mug.png');
  });

  it('keeps a numeric Description of 0 as missing (falsy fallthrough to empty string)', async () => {
    const filePath = path.join(tmpDir, 'zero-description.xlsx');
    writeAoa(filePath, [
      ['Name', 'Price', 'Description'],
      ['Mug', 12, 0],
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.name, 'Mug');
    assert.equal(products[0]?.description, '');
  });
});

describe('syncProductsToStripe remaining abort and whitespace isolation', () => {
  before(() => {
    mock.method(console, 'log', () => undefined);
    mock.method(console, 'error', () => undefined);
  });

  after(() => {
    mock.restoreAll();
  });

  it('syncs a whitespace-only Name as-is, not Unnamed Product', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-ws-name-sync-'));
    try {
      const filePath = path.join(dir, 'ws-name.xlsx');
      writeCatalog([{ Name: '   ', Price: 12 }], filePath);
      const products = await parseProductCatalog(filePath);
      const mockStripe = createMockStripe();
      await syncProductsToStripe(products, mockStripe.stripe);

      assert.equal(mockStripe.createdProducts[0]?.name, '   ');
      assert.equal(mockStripe.createdPrices[0]?.unit_amount, 1200);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('sends a whitespace-only Description to Stripe instead of omitting it', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe(
      [{ name: 'Mug', price: 12, currency: 'usd', description: '   ' }],
      mockStripe.stripe
    );

    assert.equal(mockStripe.createdProducts[0]?.description, '   ');
  });

  it('uploads a relative Image URL as images[0]', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe(
      [
        {
          name: 'Mug',
          price: 8,
          currency: 'usd',
          image_url: 'images/mug.png',
        },
      ],
      mockStripe.stripe
    );

    assert.deepEqual(mockStripe.createdProducts[0]?.images, ['images/mug.png']);
  });

  it('syncs a boolean Price of true as unit_amount NaN', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-bool-price-sync-'));
    try {
      const filePath = path.join(dir, 'bool-price.xlsx');
      writeAoa(filePath, [
        ['Name', 'Price'],
        ['Flagged', true],
      ]);
      const products = await parseProductCatalog(filePath);
      const mockStripe = createMockStripe();
      await syncProductsToStripe(products, mockStripe.stripe);

      assert.equal(Number.isNaN(mockStripe.createdPrices[0]?.unit_amount), true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('omits description on create when Excel Description was numeric 0', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-zero-desc-sync-'));
    try {
      const filePath = path.join(dir, 'zero-desc.xlsx');
      writeAoa(filePath, [
        ['Name', 'Price', 'Description'],
        ['Mug', 12, 0],
      ]);
      const products = await parseProductCatalog(filePath);
      const mockStripe = createMockStripe();
      await syncProductsToStripe(products, mockStripe.stripe);

      assert.equal(mockStripe.createdProducts[0]?.description, undefined);
      assert.equal(mockStripe.createdPrices[0]?.unit_amount, 1200);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does not process later rows when the fallback create also throws', async () => {
    const mockStripe = createMockStripe();
    mockStripe.failCreateForName('Bad');

    const products: ProductRow[] = [
      { name: 'Bad', price: 1, currency: 'usd' },
      { name: 'Good', price: 2, currency: 'usd' },
    ];

    await assert.rejects(
      () => syncProductsToStripe(products, mockStripe.stripe),
      /Invalid product name: Bad/
    );

    assert.equal(mockStripe.createCalls.length, 2);
    assert.deepEqual(
      mockStripe.createCalls.map((call) => call.name),
      ['Bad', 'Bad']
    );
    assert.equal(mockStripe.createdProducts.length, 0);
    assert.equal(mockStripe.createdPrices.length, 0);
  });
});

describe('getProductWithPrices retrieve-throw isolation', () => {
  it('propagates a missing-product retrieve error instead of returning a deleted stub', async () => {
    const mockStripe = createMockStripe();

    await assert.rejects(
      () => getProductWithPrices(mockStripe.stripe, 'prod_missing'),
      /No such product: prod_missing/
    );
    assert.deepEqual(mockStripe.retrieveCalls, ['prod_missing']);
    assert.equal(mockStripe.lastPriceListParams, undefined);
  });
});
