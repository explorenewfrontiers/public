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
  const retrieveCalls: Array<string | number> = [];
  const priceListByProduct: Record<string, Array<Record<string, unknown>>> = {};
  let lastPriceListParams: Record<string, unknown> | undefined;
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
        const prices = priceListByProduct[productId] ?? [];
        if (params.active === true) {
          return { data: prices.filter((price) => price.active !== false) };
        }
        return { data: prices };
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

describe('parseProductCatalog identity and remaining currency isolation', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-catalog-identity-currency-'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('ignores an Id header (Excel title-case), so the Stripe id is dropped', async () => {
    const filePath = path.join(tmpDir, 'id-header.xlsx');
    writeAoa(filePath, [
      ['Id', 'Name', 'Price'],
      ['prod_existing', 'Mug', 12.5],
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.id, '');
    assert.equal(products[0]?.name, 'Mug');
    assert.equal(products[0]?.price, 12.5);
  });

  it('keeps numeric Name/SKU/Category cells as numbers instead of strings', async () => {
    const filePath = path.join(tmpDir, 'numeric-identity.xlsx');
    writeAoa(filePath, [
      ['Name', 'Price', 'SKU', 'Category'],
      [12345, 9.99, 1001, 42],
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.name, 12345);
    assert.equal(products[0]?.sku, 1001);
    assert.equal(products[0]?.category, 42);
    assert.equal(products[0]?.metadata?.sku, 1001);
    assert.equal(products[0]?.metadata?.category, 42);
  });

  it('treats an Excel time-serial Price 0.5 as fifty cents, not a clock value', async () => {
    const filePath = path.join(tmpDir, 'time-serial-price.xlsx');
    writeCatalog([{ Name: 'Noon special', Price: 0.5 }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.price, 0.5);
  });

  it('parses European 1.234,56 as $1.234 instead of $1234.56', async () => {
    const filePath = path.join(tmpDir, 'eu-thousands-dot.xlsx');
    writeCatalog([{ Name: 'Lamp', Price: '1.234,56' }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.price, 1.234);
  });

  it('ignores an Amount header so the row is priced at $0', async () => {
    const filePath = path.join(tmpDir, 'amount-header.xlsx');
    writeAoa(filePath, [
      ['Name', 'Amount'],
      ['Ceramic Mug', 19.99],
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.name, 'Ceramic Mug');
    assert.equal(products[0]?.price, 0);
  });

  it('treats a blank first row as the header, so Name/Price rows become Unnamed $0', async () => {
    const filePath = path.join(tmpDir, 'blank-first-row.xlsx');
    writeAoa(filePath, [[''], ['Name', 'Price'], ['Trail Tent', 89.99]]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 2);
    assert.equal(products[0]?.name, 'Unnamed Product');
    assert.equal(products[0]?.price, 0);
    assert.equal(products[1]?.name, 'Unnamed Product');
    assert.equal(products[1]?.price, 0);
  });

  it('keeps a zero-width space inside a Stripe ID so retrieve will miss', async () => {
    const filePath = path.join(tmpDir, 'zwsp-id.xlsx');
    writeAoa(filePath, [
      ['ID', 'Name', 'Price'],
      ['prod_\u200b1', 'Mug', 12],
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.id, 'prod_\u200b1');
    assert.notEqual(products[0]?.id, 'prod_1');
  });

  it('lowercases a written-out Currency like US Dollar instead of mapping it to usd', async () => {
    const filePath = path.join(tmpDir, 'us-dollar.xlsx');
    writeCatalog([{ Name: 'Mug', Price: 12, Currency: 'US Dollar' }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.currency, 'us dollar');
  });

  it('forwards a javascript: Image URL unchanged', async () => {
    const filePath = path.join(tmpDir, 'javascript-image.xlsx');
    writeCatalog(
      [{ Name: 'Mug', Price: 12, 'Image URL': 'javascript:alert(1)' }],
      filePath
    );

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.image_url, 'javascript:alert(1)');
  });
});

describe('syncProductsToStripe identity and remaining currency isolation', () => {
  before(() => {
    mock.method(console, 'log', () => undefined);
    mock.method(console, 'error', () => undefined);
  });

  after(() => {
    mock.restoreAll();
  });

  it('creates a duplicate when Excel used Id instead of ID, even if the product exists', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_existing = { id: 'prod_existing', name: 'Mug' };

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-id-header-sync-'));
    try {
      const filePath = path.join(dir, 'id-header.xlsx');
      writeAoa(filePath, [
        ['Id', 'Name', 'Price'],
        ['prod_existing', 'Mug', 12.5],
      ]);
      const products = await parseProductCatalog(filePath);
      const result = await syncProductsToStripe(products, mockStripe.stripe);

      assert.deepEqual(mockStripe.retrieveCalls, []);
      assert.equal(result.updated.length, 0);
      assert.equal(result.created.length, 1);
      assert.equal(mockStripe.createdPrices[0]?.unit_amount, 1250);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('sends numeric Name and metadata to Stripe instead of stringifying them', async () => {
    const mockStripe = createMockStripe();
    const products: ProductRow[] = [
      {
        name: 12345 as unknown as string,
        price: 9.99,
        currency: 'usd',
        sku: 1001 as unknown as string,
        metadata: { sku: 1001 as unknown as string, category: 42 as unknown as string },
      },
    ];

    await syncProductsToStripe(products, mockStripe.stripe);

    assert.equal(mockStripe.createdProducts[0]?.name, 12345);
    assert.deepEqual(mockStripe.createdProducts[0]?.metadata, {
      sku: 1001,
      category: 42,
    });
    const priceMetadata = mockStripe.createdPrices[0]?.metadata as
      | Record<string, unknown>
      | undefined;
    assert.equal(priceMetadata?.sku, 1001);
  });

  it('syncs an Excel time-serial Price 0.5 as unit_amount 50', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe(
      [{ name: 'Noon special', price: 0.5, currency: 'usd' }],
      mockStripe.stripe
    );

    assert.equal(mockStripe.createdPrices[0]?.unit_amount, 50);
  });

  it('syncs European 1.234,56 as 123 cents (1000x undercharge vs $1234.56)', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe(
      [{ name: 'Lamp', price: 1.234, currency: 'usd' }],
      mockStripe.stripe
    );

    assert.equal(mockStripe.createdPrices[0]?.unit_amount, 123);
  });

  it('syncs an Amount-header row as a free product', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe(
      [{ name: 'Ceramic Mug', price: 0, currency: 'usd' }],
      mockStripe.stripe
    );

    assert.equal(mockStripe.createdPrices[0]?.unit_amount, 0);
  });

  it('forwards a whitespace-padded currency to prices.create instead of usd', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe(
      [{ name: 'Padded Fx', price: 4, currency: ' eur ' }],
      mockStripe.stripe
    );

    assert.equal(mockStripe.createdPrices[0]?.currency, ' eur ');
  });

  it('forwards Currency US Dollar as us dollar, which Stripe will reject', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe(
      [{ name: 'Mug', price: 12, currency: 'us dollar' }],
      mockStripe.stripe
    );

    assert.equal(mockStripe.createdPrices[0]?.currency, 'us dollar');
  });

  it('duplicates a product when the Excel ID contains a zero-width space', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_1 = { id: 'prod_1', name: 'Mug' };

    const result = await syncProductsToStripe(
      [{ id: 'prod_\u200b1', name: 'Mug', price: 12, currency: 'usd' }],
      mockStripe.stripe
    );

    assert.deepEqual(mockStripe.retrieveCalls, ['prod_\u200b1']);
    assert.equal(result.updated.length, 0);
    assert.equal(result.created.length, 1);
    assert.equal(mockStripe.createdPrices[0]?.unit_amount, 1200);
  });

  it('uploads a javascript: image URL on the Stripe product', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe(
      [
        {
          name: 'Mug',
          price: 12,
          currency: 'usd',
          image_url: 'javascript:alert(1)',
        },
      ],
      mockStripe.stripe
    );

    assert.deepEqual(mockStripe.createdProducts[0]?.images, ['javascript:alert(1)']);
  });
});

describe('getProductWithPrices archived-product isolation', () => {
  it('returns an archived product and its prices instead of hiding it from the storefront', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_old = {
      id: 'prod_old',
      name: 'Retired Mug',
      active: false,
    };
    mockStripe.priceListByProduct.prod_old = [
      { id: 'price_old', unit_amount: 500, currency: 'usd', active: true },
    ];

    const result = await getProductWithPrices(mockStripe.stripe, 'prod_old');

    assert.equal(result.product.active, false);
    assert.equal(result.prices.length, 1);
    assert.equal(result.prices[0]?.unit_amount, 500);
    assert.equal(mockStripe.lastPriceListParams?.active, true);
  });
});
