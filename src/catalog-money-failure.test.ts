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
  const retrieveById: Record<string, Record<string, unknown>> = {};
  const retrieveCalls: string[] = [];
  let lastProductListParams: Record<string, unknown> | undefined;
  let lastPriceListParams: Record<string, unknown> | undefined;
  let productSeq = 0;
  let priceCreateError: Error | undefined;
  let createErrorAfter = Number.POSITIVE_INFINITY;
  let listHasMore = false;
  let priceListError: Error | undefined;

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
        const updated = { id, ...data };
        retrieveById[id] = updated;
        return updated;
      },
      create: async (data: Record<string, unknown>) => {
        if (createdProducts.length >= createErrorAfter) {
          throw new Error('product create rejected');
        }
        const product = { id: `prod_${++productSeq}`, ...data };
        createdProducts.push(product);
        retrieveById[product.id] = product;
        return product;
      },
      list: async (params: Record<string, unknown>) => {
        lastProductListParams = params;
        return {
          data: Object.values(retrieveById),
          has_more: listHasMore,
        };
      },
    },
    prices: {
      create: async (data: Record<string, unknown>) => {
        if (priceCreateError) {
          const error = priceCreateError;
          priceCreateError = undefined;
          throw error;
        }
        const price = { id: `price_${createdPrices.length + 1}`, ...data };
        createdPrices.push(price);
        return price;
      },
      list: async (params: Record<string, unknown>) => {
        lastPriceListParams = params;
        if (priceListError) {
          throw priceListError;
        }
        return { data: [] };
      },
    },
  };

  return {
    stripe: stripe as unknown as Stripe,
    createdProducts,
    createdPrices,
    retrieveById,
    retrieveCalls,
    get lastProductListParams() {
      return lastProductListParams;
    },
    get lastPriceListParams() {
      return lastPriceListParams;
    },
    failNextPriceCreate(error: Error) {
      priceCreateError = error;
    },
    failProductCreateAfter(count: number) {
      createErrorAfter = count;
    },
    setListHasMore(value: boolean) {
      listHasMore = value;
    },
    failPriceList(error: Error) {
      priceListError = error;
    },
  };
}

describe('parseProductCatalog money and cell coercion', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-catalog-money-failure-'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('treats an Excel date-serial Price cell as dollars (current ~$45k contract)', async () => {
    const filePath = path.join(tmpDir, 'date-serial-price.xlsx');
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Name', 'Price'],
      ['Dated Product', null],
    ]);
    worksheet.B2 = { t: 'n', v: 45488, z: 'm/d/yy' };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    XLSX.writeFile(workbook, filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.price, 45488);
  });

  it('truncates a thousands-separated price at the comma (1000x undercharge)', async () => {
    const filePath = path.join(tmpDir, 'thousands-price.xlsx');
    writeCatalog([{ Name: 'Bulk Pack', Price: '1,000.00' }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.price, 1);
  });

  it('yields NaN for a currency-prefixed price so sync would send unit_amount NaN', async () => {
    const filePath = path.join(tmpDir, 'dollar-prefixed.xlsx');
    writeCatalog([{ Name: 'Tagged Price', Price: '$29.99' }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(Number.isNaN(products[0]?.price), true);
  });

  it('throws when Currency is a numeric Excel cell (toLowerCase is not guarded)', async () => {
    const filePath = path.join(tmpDir, 'numeric-currency.xlsx');
    writeCatalog([{ Name: 'Iso Code', Price: 10, Currency: 840 }], filePath);

    await assert.rejects(
      () => parseProductCatalog(filePath),
      (error: unknown) => {
        assert.equal(error instanceof TypeError, true);
        assert.match(String(error), /toLowerCase/);
        return true;
      }
    );
  });

  it('keeps a boolean Name cell as a non-string instead of Unnamed Product', async () => {
    const filePath = path.join(tmpDir, 'boolean-name.xlsx');
    writeCatalog([{ Name: true, Price: 5 }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.name, true);
    assert.notEqual(products[0]?.name, 'Unnamed Product');
  });

  it('yields NaN when Price is a boolean Excel cell', async () => {
    const filePath = path.join(tmpDir, 'boolean-price.xlsx');
    writeCatalog([{ Name: 'Flagged', Price: true }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(Number.isNaN(products[0]?.price), true);
  });

  it('keeps whitespace-only Name instead of substituting Unnamed Product', async () => {
    const filePath = path.join(tmpDir, 'whitespace-name.xlsx');
    writeCatalog([{ Name: '   ', Price: 4 }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.name, '   ');
  });

  it('keeps whitespace-only ID as a retrieve key instead of treating the row as new', async () => {
    const filePath = path.join(tmpDir, 'whitespace-id.xlsx');
    writeCatalog([{ ID: '  ', Name: 'Padded Id', Price: 6 }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.id, '  ');
  });
});

describe('syncProductsToStripe zero-decimal money and failure isolation', () => {
  before(() => {
    mock.method(console, 'log', () => undefined);
    mock.method(console, 'error', () => undefined);
  });

  after(() => {
    mock.restoreAll();
  });

  it('still multiplies JPY catalog amounts by 100 (100x overcharge for zero-decimal currency)', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe(
      [{ name: 'Tokyo widget', price: 500, currency: 'jpy' }],
      mockStripe.stripe
    );

    assert.equal(mockStripe.createdPrices[0]?.currency, 'jpy');
    assert.equal(mockStripe.createdPrices[0]?.unit_amount, 50000);
  });

  it('still multiplies KRW catalog amounts by 100', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe(
      [{ name: 'Seoul widget', price: 1000, currency: 'krw' }],
      mockStripe.stripe
    );

    assert.equal(mockStripe.createdPrices[0]?.unit_amount, 100000);
  });

  it('duplicates the product when price create fails after a successful product create', async () => {
    const mockStripe = createMockStripe();
    mockStripe.failNextPriceCreate(new Error('price create rejected'));

    const result = await syncProductsToStripe(
      [{ name: 'Partial', price: 7, currency: 'usd', sku: 'P-1' }],
      mockStripe.stripe
    );

    assert.equal(result.created.length, 2);
    assert.equal(mockStripe.createdProducts.length, 2);
    assert.equal(mockStripe.createdProducts[0]?.name, 'Partial');
    assert.equal(mockStripe.createdProducts[1]?.name, 'Partial');
    assert.equal(mockStripe.createdPrices.length, 1);
    assert.equal(mockStripe.createdPrices[0]?.unit_amount, 700);
  });

  it('aborts remaining rows when the fallback product create also fails', async () => {
    const mockStripe = createMockStripe();
    mockStripe.failNextPriceCreate(new Error('price create rejected'));
    mockStripe.failProductCreateAfter(1);

    const products: ProductRow[] = [
      { name: 'First', price: 2, currency: 'usd' },
      { name: 'Second', price: 3, currency: 'usd' },
    ];

    await assert.rejects(
      () => syncProductsToStripe(products, mockStripe.stripe),
      /product create rejected/
    );
    assert.equal(mockStripe.createdProducts.length, 1);
    assert.equal(mockStripe.createdProducts[0]?.name, 'First');
  });

  it('uses a whitespace-only id as the Stripe retrieve key', async () => {
    const mockStripe = createMockStripe();
    const result = await syncProductsToStripe(
      [{ id: '  ', name: 'Padded Id', price: 8, currency: 'usd' }],
      mockStripe.stripe
    );

    assert.deepEqual(mockStripe.retrieveCalls, ['  ']);
    assert.equal(result.updated.length, 0);
    assert.equal(result.created.length, 1);
  });
});

describe('catalog read pagination and price-list failures', () => {
  it('returns only the first Stripe page even when has_more is true', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_one = { id: 'prod_one', name: 'Only Page' };
    mockStripe.setListHasMore(true);

    const products = await getStripeProducts(mockStripe.stripe, 20);

    assert.equal(products.length, 1);
    assert.equal(products[0]?.id, 'prod_one');
    assert.deepEqual(mockStripe.lastProductListParams, { limit: 20, active: true });
  });

  it('propagates prices.list failures after the product retrieve succeeded', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_ok = { id: 'prod_ok', name: 'Has Product' };
    mockStripe.failPriceList(new Error('prices list failed'));

    await assert.rejects(
      () => getProductWithPrices(mockStripe.stripe, 'prod_ok'),
      /prices list failed/
    );
    assert.deepEqual(mockStripe.lastPriceListParams, { product: 'prod_ok', active: true });
  });
});
