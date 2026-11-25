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
  const priceListByProduct: Record<string, Array<Record<string, unknown>>> = {};
  let lastPriceListParams: Record<string, unknown> | undefined;
  let productSeq = 0;

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
        if (retrieveById[id]?.deleted === true) {
          throw new Error(`No such product: ${id}`);
        }
        const updated = { id, ...data };
        updatedProducts.push(updated);
        retrieveById[id] = { ...retrieveById[id], ...updated };
        return updated;
      },
      create: async (data: Record<string, unknown>) => {
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
    priceListByProduct,
    get lastPriceListParams() {
      return lastPriceListParams;
    },
  };
}

describe('parseProductCatalog falsy identity and remaining currency isolation', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-catalog-falsy-identity-'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('treats a numeric Name of 0 as missing, so the row becomes Unnamed Product', async () => {
    const filePath = path.join(tmpDir, 'zero-name.xlsx');
    writeAoa(filePath, [
      ['Name', 'Price'],
      [0, 12],
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.name, 'Unnamed Product');
    assert.equal(products[0]?.price, 12);
  });

  it('treats a boolean Name of false as missing, so the row becomes Unnamed Product', async () => {
    const filePath = path.join(tmpDir, 'false-name.xlsx');
    writeAoa(filePath, [
      ['Name', 'Price'],
      [false, 9.5],
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.name, 'Unnamed Product');
    assert.equal(products[0]?.price, 9.5);
  });

  it('drops a boolean ID of false, so the row is treated as new instead of retrieved', async () => {
    const filePath = path.join(tmpDir, 'false-id.xlsx');
    writeAoa(filePath, [
      ['ID', 'Name', 'Price'],
      [false, 'Mug', 12],
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.id, '');
    assert.equal(products[0]?.name, 'Mug');
  });

  it('forwards Currency 840 (ISO numeric code as string) instead of mapping it to usd', async () => {
    const filePath = path.join(tmpDir, 'iso-numeric-currency.xlsx');
    writeCatalog([{ Name: 'Mug', Price: 12, Currency: '840' }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.currency, '840');
  });

  it('lowercases Currency USA instead of mapping it to usd', async () => {
    const filePath = path.join(tmpDir, 'usa-currency.xlsx');
    writeCatalog([{ Name: 'Mug', Price: 12, Currency: 'USA' }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.currency, 'usa');
  });

  it('yields NaN for a currency-code-prefixed Price with no space (USD12.50)', async () => {
    const filePath = path.join(tmpDir, 'usd-prefix-price.xlsx');
    writeCatalog([{ Name: 'Tagged', Price: 'USD12.50' }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(Number.isNaN(products[0]?.price), true);
  });

  it('keeps comma-separated Image URLs as a single string instead of splitting them', async () => {
    const filePath = path.join(tmpDir, 'comma-images.xlsx');
    writeCatalog(
      [
        {
          Name: 'Gallery',
          Price: 8,
          'Image URL': 'https://cdn.example/a.png,https://cdn.example/b.png',
        },
      ],
      filePath
    );

    const products = await parseProductCatalog(filePath);
    assert.equal(
      products[0]?.image_url,
      'https://cdn.example/a.png,https://cdn.example/b.png'
    );
  });

  it('drops leading zeros when SKU is an Excel number (00123 → 123)', async () => {
    const filePath = path.join(tmpDir, 'leading-zero-sku.xlsx');
    writeAoa(filePath, [
      ['Name', 'Price', 'SKU'],
      ['Mug', 12, 123],
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.sku, 123);
    assert.notEqual(products[0]?.sku, '00123');
    assert.equal(products[0]?.metadata?.sku, 123);
  });
});

describe('syncProductsToStripe falsy identity and remaining currency isolation', () => {
  before(() => {
    mock.method(console, 'log', () => undefined);
    mock.method(console, 'error', () => undefined);
  });

  after(() => {
    mock.restoreAll();
  });

  it('syncs a numeric Name of 0 as Unnamed Product', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-zero-name-sync-'));
    try {
      const filePath = path.join(dir, 'zero-name.xlsx');
      writeAoa(filePath, [
        ['Name', 'Price'],
        [0, 12],
      ]);
      const products = await parseProductCatalog(filePath);
      const mockStripe = createMockStripe();
      await syncProductsToStripe(products, mockStripe.stripe);

      assert.equal(mockStripe.createdProducts[0]?.name, 'Unnamed Product');
      assert.equal(mockStripe.createdPrices[0]?.unit_amount, 1200);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('creates rather than retrieves when the parsed id is false (falsy)', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_live = { id: 'prod_live', name: 'Existing' };

    const result = await syncProductsToStripe(
      [{ id: false as unknown as string, name: 'Mug', price: 12, currency: 'usd' }],
      mockStripe.stripe
    );

    assert.deepEqual(mockStripe.retrieveCalls, []);
    assert.equal(result.updated.length, 0);
    assert.equal(result.created.length, 1);
    assert.equal(mockStripe.createdProducts[0]?.name, 'Mug');
    assert.equal(mockStripe.createdPrices[0]?.unit_amount, 1200);
  });

  it('forwards Currency 840 to prices.create, which Stripe will reject', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe(
      [{ name: 'Mug', price: 12, currency: '840' }],
      mockStripe.stripe
    );

    assert.equal(mockStripe.createdPrices[0]?.currency, '840');
  });

  it('forwards Currency usa to prices.create instead of usd', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe(
      [{ name: 'Mug', price: 12, currency: 'usa' }],
      mockStripe.stripe
    );

    assert.equal(mockStripe.createdPrices[0]?.currency, 'usa');
  });

  it('syncs a USD12.50 Price as unit_amount NaN', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-usd-prefix-sync-'));
    try {
      const filePath = path.join(dir, 'usd-prefix.xlsx');
      writeCatalog([{ Name: 'Tagged', Price: 'USD12.50' }], filePath);
      const products = await parseProductCatalog(filePath);
      const mockStripe = createMockStripe();
      await syncProductsToStripe(products, mockStripe.stripe);

      assert.equal(Number.isNaN(mockStripe.createdPrices[0]?.unit_amount), true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('uploads comma-separated Image URLs as a single images[0] value', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe(
      [
        {
          name: 'Gallery',
          price: 8,
          currency: 'usd',
          image_url: 'https://cdn.example/a.png,https://cdn.example/b.png',
        },
      ],
      mockStripe.stripe
    );

    assert.deepEqual(mockStripe.createdProducts[0]?.images, [
      'https://cdn.example/a.png,https://cdn.example/b.png',
    ]);
  });

  it('sends a numeric SKU that lost leading zeros to Stripe metadata', async () => {
    const mockStripe = createMockStripe();
    const products: ProductRow[] = [
      {
        name: 'Mug',
        price: 12,
        currency: 'usd',
        sku: 123 as unknown as string,
        metadata: { category: '', sku: 123 as unknown as string },
      },
    ];

    await syncProductsToStripe(products, mockStripe.stripe);

    assert.deepEqual(mockStripe.createdProducts[0]?.metadata, {
      category: '',
      sku: 123,
    });
    const priceMetadata = mockStripe.createdPrices[0]?.metadata as
      | Record<string, unknown>
      | undefined;
    assert.equal(priceMetadata?.sku, 123);
  });
});

describe('getProductWithPrices deleted-product isolation', () => {
  it('returns a deleted product and still lists its prices, so a storefront detail URL can sell it', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_gone = {
      id: 'prod_gone',
      deleted: true,
    };
    mockStripe.priceListByProduct.prod_gone = [
      { id: 'price_gone', unit_amount: 500, currency: 'usd', active: true },
    ];

    const result = await getProductWithPrices(mockStripe.stripe, 'prod_gone');

    assert.equal(
      (result.product as { deleted?: boolean }).deleted,
      true
    );
    assert.equal(result.prices.length, 1);
    assert.equal(result.prices[0]?.unit_amount, 500);
    assert.deepEqual(mockStripe.lastPriceListParams, {
      product: 'prod_gone',
      active: true,
    });
  });
});
