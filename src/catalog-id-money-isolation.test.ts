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
  getProductWithPrices,
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
  const retrieveCalls: Array<string | number | boolean> = [];
  const priceListByProduct: Record<string, Array<Record<string, unknown>>> = {};
  let lastProductListParams: Record<string, unknown> | undefined;
  let lastPriceListParams: Record<string, unknown> | undefined;
  let priceListHasMore = false;
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
      list: async (params: Record<string, unknown>) => {
        lastPriceListParams = params;
        const productId = String(params.product);
        return {
          data: priceListByProduct[productId] ?? [],
          has_more: priceListHasMore,
        };
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
    get lastProductListParams() {
      return lastProductListParams;
    },
    get lastPriceListParams() {
      return lastPriceListParams;
    },
    setPriceListHasMore(value: boolean) {
      priceListHasMore = value;
    },
  };
}

describe('parseProductCatalog remaining identity and money isolation', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-catalog-id-money-'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('keeps a row that has only an ID as an Unnamed Product at $0', async () => {
    const filePath = path.join(tmpDir, 'id-only.xlsx');
    writeCatalog([{ ID: 'prod_live', Name: '', Price: '' }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.id, 'prod_live');
    assert.equal(products[0]?.name, 'Unnamed Product');
    assert.equal(products[0]?.price, 0);
  });

  it('treats a hex-looking Price as $0 because parseFloat stops at x', async () => {
    const filePath = path.join(tmpDir, 'hex-price.xlsx');
    writeCatalog([{ Name: 'Hexed', Price: '0x10' }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.price, 0);
  });

  it('parses a unit-suffixed Price by truncating at the first space', async () => {
    const filePath = path.join(tmpDir, 'unit-suffix-price.xlsx');
    writeCatalog([{ Name: 'Tagged', Price: '29.99 USD' }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.price, 29.99);
  });

  it('truncates a fraction-string Price at the slash', async () => {
    const filePath = path.join(tmpDir, 'fraction-price.xlsx');
    writeCatalog([{ Name: 'Half', Price: '1/2' }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.price, 1);
  });

  it('yields NaN for a unicode-minus Price', async () => {
    const filePath = path.join(tmpDir, 'unicode-minus.xlsx');
    writeCatalog([{ Name: 'Credit', Price: '−29.99' }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(Number.isNaN(products[0]?.price), true);
  });

  it('falls through an empty title-case Currency to the lowercase currency column', async () => {
    const filePath = path.join(tmpDir, 'currency-fallthrough.xlsx');
    writeCatalog([{ Name: 'Cafe', Price: 5, Currency: '', currency: 'eur' }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.currency, 'eur');
  });

  it('keeps a boolean Excel ID as the retrieve key instead of dropping it', async () => {
    const filePath = path.join(tmpDir, 'boolean-id.xlsx');
    writeCatalog([{ ID: true, Name: 'Flagged', Price: 4 }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.id, true);
  });

  it('keeps a date-serial Name cell instead of substituting Unnamed Product', async () => {
    const filePath = path.join(tmpDir, 'date-name.xlsx');
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Name', 'Price'],
      [null, 8],
    ]);
    worksheet.A2 = { t: 'n', v: 45488, z: 'm/d/yy' };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    XLSX.writeFile(workbook, filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.name, 45488);
    assert.notEqual(products[0]?.name, 'Unnamed Product');
  });

  it('keeps surrounding whitespace on a Stripe ID so retrieve will miss', async () => {
    const filePath = path.join(tmpDir, 'padded-id.xlsx');
    writeCatalog([{ ID: ' prod_live ', Name: 'Padded', Price: 9 }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.id, ' prod_live ');
  });

  it('parses a semicolon-delimited European CSV through the same header contract', async () => {
    const filePath = path.join(tmpDir, 'semicolon.csv');
    fs.writeFileSync(filePath, 'Name;Price;Currency\nCafe Mug;7.25;EUR\n');

    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 1);
    assert.equal(products[0]?.name, 'Cafe Mug');
    assert.equal(products[0]?.price, 7.25);
    assert.equal(products[0]?.currency, 'eur');
  });
});

describe('syncProductsToStripe id isolation and remaining money', () => {
  before(() => {
    mock.method(console, 'log', () => undefined);
    mock.method(console, 'error', () => undefined);
  });

  after(() => {
    mock.restoreAll();
  });

  it('renames an existing product to Unnamed Product when Excel had only an ID', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-catalog-id-only-sync-'));
    try {
      const filePath = path.join(tmpDir, 'id-only.xlsx');
      writeCatalog([{ ID: 'prod_live', Name: '', Price: '' }], filePath);
      const products = await parseProductCatalog(filePath);

      const mockStripe = createMockStripe();
      mockStripe.retrieveById.prod_live = {
        id: 'prod_live',
        name: 'Trail Tent',
        description: 'Keep me',
      };
      const result = await syncProductsToStripe(products, mockStripe.stripe);

      assert.equal(result.updated.length, 1);
      assert.equal(result.created.length, 0);
      assert.equal(mockStripe.updatedProducts[0]?.name, 'Unnamed Product');
      assert.equal(mockStripe.createdPrices.length, 0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('updates the same Stripe ID twice and keeps the last Excel name, without minting prices', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_dup = { id: 'prod_dup', name: 'Original' };

    const products: ProductRow[] = [
      { id: 'prod_dup', name: 'First', price: 10, currency: 'usd' },
      { id: 'prod_dup', name: 'Second', price: 20, currency: 'usd' },
    ];
    const result = await syncProductsToStripe(products, mockStripe.stripe);

    assert.equal(result.updated.length, 2);
    assert.equal(result.created.length, 0);
    assert.equal(mockStripe.createdPrices.length, 0);
    assert.deepEqual(
      mockStripe.updatedProducts.map((product) => product.name),
      ['First', 'Second']
    );
    assert.equal(mockStripe.retrieveById.prod_dup?.name, 'Second');
  });

  it('duplicates a product when the Excel ID has surrounding whitespace', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_live = { id: 'prod_live', name: 'Trail Tent' };

    const result = await syncProductsToStripe(
      [{ id: ' prod_live ', name: 'Padded', price: 9, currency: 'usd' }],
      mockStripe.stripe
    );

    assert.deepEqual(mockStripe.retrieveCalls, [' prod_live ']);
    assert.equal(result.updated.length, 0);
    assert.equal(result.created.length, 1);
    assert.equal(mockStripe.createdProducts[0]?.name, 'Padded');
    assert.equal(mockStripe.createdPrices[0]?.unit_amount, 900);
    assert.notEqual(mockStripe.createdProducts[0]?.id, 'prod_live');
  });

  it('syncs a hex-looking Price as unit_amount 0 (free)', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-catalog-hex-sync-'));
    try {
      const filePath = path.join(tmpDir, 'hex.xlsx');
      writeCatalog([{ Name: 'Hexed', Price: '0x10' }], filePath);
      const products = await parseProductCatalog(filePath);
      const mockStripe = createMockStripe();
      await syncProductsToStripe(products, mockStripe.stripe);

      assert.equal(mockStripe.createdPrices[0]?.unit_amount, 0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('syncs a unit-suffixed Price using only the leading number', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-catalog-suffix-sync-'));
    try {
      const filePath = path.join(tmpDir, 'suffix.xlsx');
      writeCatalog([{ Name: 'Tagged', Price: '29.99 USD' }], filePath);
      const products = await parseProductCatalog(filePath);
      const mockStripe = createMockStripe();
      await syncProductsToStripe(products, mockStripe.stripe);

      assert.equal(mockStripe.createdPrices[0]?.unit_amount, 2999);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('syncs a fraction-string Price as $1 instead of 50 cents', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-catalog-fraction-sync-'));
    try {
      const filePath = path.join(tmpDir, 'fraction.xlsx');
      writeCatalog([{ Name: 'Half', Price: '1/2' }], filePath);
      const products = await parseProductCatalog(filePath);
      const mockStripe = createMockStripe();
      await syncProductsToStripe(products, mockStripe.stripe);

      assert.equal(mockStripe.createdPrices[0]?.unit_amount, 100);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('uses a boolean ID as the Stripe retrieve key', async () => {
    const mockStripe = createMockStripe();
    const result = await syncProductsToStripe(
      [{ id: true as unknown as string, name: 'Flagged', price: 4, currency: 'usd' }],
      mockStripe.stripe
    );

    assert.deepEqual(mockStripe.retrieveCalls, [true]);
    assert.equal(result.updated.length, 0);
    assert.equal(result.created.length, 1);
    assert.equal(mockStripe.createdPrices[0]?.unit_amount, 400);
  });
});

describe('catalog read remaining isolation', () => {
  it('passes a negative limit through to Stripe instead of substituting 100', async () => {
    const mockStripe = createMockStripe();
    await getStripeProducts(mockStripe.stripe, -5);
    assert.deepEqual(mockStripe.lastProductListParams, { limit: -5, active: true });
  });

  it('returns only the first prices page and omits Stripe default limit', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_multi = { id: 'prod_multi', name: 'Many prices' };
    mockStripe.priceListByProduct.prod_multi = [
      { id: 'price_old', unit_amount: 1000, currency: 'usd' },
    ];
    mockStripe.setPriceListHasMore(true);

    const result = await getProductWithPrices(mockStripe.stripe, 'prod_multi');

    assert.equal(result.prices.length, 1);
    assert.equal(result.prices[0]?.id, 'price_old');
    assert.deepEqual(mockStripe.lastPriceListParams, { product: 'prod_multi', active: true });
    assert.equal('limit' in (mockStripe.lastPriceListParams ?? {}), false);
  });
});
