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

function writeCatalog(rows: Record<string, unknown>[], filePath: string): void {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
  XLSX.writeFile(workbook, filePath);
}

function createMockStripe() {
  const createdProducts: Array<Record<string, unknown>> = [];
  const createdPrices: Array<Record<string, unknown>> = [];
  const updatedProducts: Array<Record<string, unknown>> = [];
  const retrieveById: Record<string, Record<string, unknown>> = {};
  const retrieveCalls: string[] = [];
  let lastProductListParams: Record<string, unknown> | undefined;
  let productSeq = 0;

  const stripe = {
    products: {
      retrieve: async (id: string) => {
        retrieveCalls.push(id);
        if (!retrieveById[id]) {
          throw new Error(`No such product: ${id}`);
        }
        return retrieveById[id];
      },
      update: async (id: string, data: Record<string, unknown>) => {
        if (retrieveById[id]?.deleted === true) {
          throw new Error(`No such product: ${id}`);
        }
        const updated = { id, ...data };
        updatedProducts.push(updated);
        retrieveById[id] = updated;
        return updated;
      },
      create: async (data: Record<string, unknown>) => {
        const product = { id: `prod_${++productSeq}`, ...data };
        createdProducts.push(product);
        retrieveById[product.id] = product;
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
    retrieveCalls,
    get lastProductListParams() {
      return lastProductListParams;
    },
  };
}

describe('parseProductCatalog header and remaining money edges', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-catalog-headers-deleted-'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('matches ALL-CAPS ID but treats NAME/PRICE/CURRENCY as missing', async () => {
    const filePath = path.join(tmpDir, 'all-caps-headers.xlsx');
    writeCatalog(
      [{ NAME: 'Trail Tent', PRICE: 89.99, ID: 'prod_caps', CURRENCY: 'EUR' }],
      filePath
    );

    const products = await parseProductCatalog(filePath);
    // 'ID' is the lookup key, so it still matches; 'NAME'/'PRICE'/'CURRENCY' do not.
    assert.equal(products[0]?.id, 'prod_caps');
    assert.equal(products[0]?.name, 'Unnamed Product');
    assert.equal(products[0]?.price, 0);
    assert.equal(products[0]?.currency, 'usd');
  });

  it('treats padded Name/Price headers as missing', async () => {
    const filePath = path.join(tmpDir, 'padded-headers.xlsx');
    writeCatalog([{ ' Name': 'Padded Tent', 'Price ': 40 }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.name, 'Unnamed Product');
    assert.equal(products[0]?.price, 0);
  });

  it('lets a falsy numeric Price 0 fall through to the lowercase price column', async () => {
    const filePath = path.join(tmpDir, 'zero-price-fallthrough.xlsx');
    writeCatalog([{ Name: 'Free vs Paid', Price: 0, price: 99 }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.price, 99);
  });

  it('truncates a European decimal-comma price at the comma', async () => {
    const filePath = path.join(tmpDir, 'european-comma.xlsx');
    writeCatalog([{ Name: 'Cafe Mug', Price: '12,50' }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.price, 12);
  });

  it('reads an Excel percent-formatted Price as a fraction of a dollar', async () => {
    const filePath = path.join(tmpDir, 'percent-price.xlsx');
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Name', 'Price'],
      ['Discounted', null],
    ]);
    worksheet.B2 = { t: 'n', v: 0.15, z: '0%' };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    XLSX.writeFile(workbook, filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.price, 0.15);
  });

  it('ignores Image Url (wrong case) so images are dropped', async () => {
    const filePath = path.join(tmpDir, 'image-url-case.xlsx');
    writeCatalog(
      [{ Name: 'Photo', Price: 5, 'Image Url': 'https://cdn.example/p.png' }],
      filePath
    );

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.image_url, '');
  });

  it('parses a CSV catalog through the same Excel header contract', async () => {
    const filePath = path.join(tmpDir, 'catalog.csv');
    fs.writeFileSync(filePath, 'Name,Price,Currency\nCSV Mug,7.25,EUR\n');

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.name, 'CSV Mug');
    assert.equal(products[0]?.price, 7.25);
    assert.equal(products[0]?.currency, 'eur');
  });

  it('yields Infinity for an Infinity Price cell', async () => {
    const filePath = path.join(tmpDir, 'infinity-price.xlsx');
    writeCatalog([{ Name: 'Unbounded', Price: Infinity }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.price, Infinity);
  });
});

describe('syncProductsToStripe deleted products and remaining money', () => {
  before(() => {
    mock.method(console, 'log', () => undefined);
    mock.method(console, 'error', () => undefined);
  });

  after(() => {
    mock.restoreAll();
  });

  it('duplicates a product when retrieve returns a deleted object (no throw)', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_gone = { id: 'prod_gone', deleted: true };

    const result = await syncProductsToStripe(
      [{ id: 'prod_gone', name: 'Revived', price: 11, currency: 'usd', sku: 'REV-1' }],
      mockStripe.stripe
    );

    assert.deepEqual(mockStripe.retrieveCalls, ['prod_gone']);
    assert.equal(result.updated.length, 0);
    assert.equal(result.created.length, 1);
    assert.equal(mockStripe.createdProducts[0]?.name, 'Revived');
    assert.equal(mockStripe.createdPrices[0]?.unit_amount, 1100);
    assert.notEqual(mockStripe.createdProducts[0]?.id, 'prod_gone');
  });

  it('still processes later rows after a deleted-product duplicate', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_gone = { id: 'prod_gone', deleted: true };

    const products: ProductRow[] = [
      { id: 'prod_gone', name: 'Revived', price: 4, currency: 'usd' },
      { name: 'Next', price: 6, currency: 'usd' },
    ];
    const result = await syncProductsToStripe(products, mockStripe.stripe);

    assert.equal(result.created.length, 2);
    assert.deepEqual(
      result.created.map((product) => product.name),
      ['Revived', 'Next']
    );
    assert.equal(mockStripe.createdPrices[1]?.unit_amount, 600);
  });

  it('rounds a sub-cent catalog price to unit_amount 0 (free)', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe(
      [{ name: 'Dust', price: 0.004, currency: 'usd' }],
      mockStripe.stripe
    );

    assert.equal(mockStripe.createdPrices[0]?.unit_amount, 0);
  });

  it('sends Infinity cents when the catalog price is Infinity', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe(
      [{ name: 'Unbounded', price: Number.POSITIVE_INFINITY, currency: 'usd' }],
      mockStripe.stripe
    );

    assert.equal(mockStripe.createdPrices[0]?.unit_amount, Infinity);
  });

  it('syncs an ALL-CAPS NAME/PRICE row as a free Unnamed Product', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-catalog-caps-sync-'));
    try {
      const filePath = path.join(tmpDir, 'caps.xlsx');
      writeCatalog([{ NAME: 'Trail Tent', PRICE: 89.99 }], filePath);
      const products = await parseProductCatalog(filePath);
      const mockStripe = createMockStripe();
      await syncProductsToStripe(products, mockStripe.stripe);

      assert.equal(mockStripe.createdProducts[0]?.name, 'Unnamed Product');
      assert.equal(mockStripe.createdPrices[0]?.unit_amount, 0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('renames an existing product to Unnamed Product when NAME/PRICE are ALL-CAPS', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-catalog-caps-id-sync-'));
    try {
      const filePath = path.join(tmpDir, 'caps-id.xlsx');
      writeCatalog([{ ID: 'prod_existing', NAME: 'Trail Tent', PRICE: 89.99 }], filePath);
      const products = await parseProductCatalog(filePath);

      const mockStripe = createMockStripe();
      mockStripe.retrieveById.prod_existing = { id: 'prod_existing', name: 'Trail Tent' };
      const result = await syncProductsToStripe(products, mockStripe.stripe);

      assert.equal(result.updated.length, 1);
      assert.equal(mockStripe.updatedProducts[0]?.name, 'Unnamed Product');
      assert.equal(mockStripe.createdPrices.length, 0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('getStripeProducts falsy limit', () => {
  it('passes limit 0 through instead of substituting the default 100', async () => {
    const mockStripe = createMockStripe();
    await getStripeProducts(mockStripe.stripe, 0);
    assert.deepEqual(mockStripe.lastProductListParams, { limit: 0, active: true });
  });
});
