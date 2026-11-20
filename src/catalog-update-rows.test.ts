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

describe('parseProductCatalog remaining row and money contracts', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-catalog-update-rows-'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('turns a notes-only Category row into a free Unnamed Product', async () => {
    const filePath = path.join(tmpDir, 'notes-only.xlsx');
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Name', 'Price', 'Category'],
      ['Trail Tent', 89.99, 'gear'],
      [null, null, 'internal notes — do not sell'],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    XLSX.writeFile(workbook, filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 2);
    assert.equal(products[0]?.name, 'Trail Tent');
    assert.equal(products[0]?.price, 89.99);
    assert.equal(products[1]?.name, 'Unnamed Product');
    assert.equal(products[1]?.price, 0);
    assert.equal(products[1]?.category, 'internal notes — do not sell');
  });

  it('treats a blank Price as $0 but a whitespace-only Price as NaN', async () => {
    const filePath = path.join(tmpDir, 'blank-vs-whitespace-price.xlsx');
    writeCatalog(
      [
        { Name: 'Blank Price', Price: '' },
        { Name: 'Whitespace Price', Price: '   ' },
      ],
      filePath
    );

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.price, 0);
    assert.equal(Number.isNaN(products[1]?.price), true);
  });

  it('yields NaN for an accounting-format Price wrapped in parentheses', async () => {
    const filePath = path.join(tmpDir, 'accounting-parens.xlsx');
    writeCatalog([{ Name: 'Credit', Price: '(29.99)' }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(Number.isNaN(products[0]?.price), true);
  });

  it('parses a scientific-notation Price string as dollars', async () => {
    const filePath = path.join(tmpDir, 'scientific-price.xlsx');
    writeCatalog([{ Name: 'Bulk', Price: '1e2' }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.price, 100);
  });

  it('uses a cached formula value and treats an uncached formula as $0', async () => {
    const cachedPath = path.join(tmpDir, 'formula-cached.xlsx');
    const cachedSheet = XLSX.utils.aoa_to_sheet([
      ['Name', 'Price'],
      ['Cached', null],
    ]);
    cachedSheet.B2 = { t: 'n', f: '10+5', v: 15 };
    const cachedBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(cachedBook, cachedSheet, 'Products');
    XLSX.writeFile(cachedBook, cachedPath);

    const uncachedPath = path.join(tmpDir, 'formula-uncached.xlsx');
    const uncachedSheet = XLSX.utils.aoa_to_sheet([
      ['Name', 'Price'],
      ['Uncached', null],
    ]);
    uncachedSheet.B2 = { t: 'n', f: '10+5' };
    const uncachedBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(uncachedBook, uncachedSheet, 'Products');
    XLSX.writeFile(uncachedBook, uncachedPath);

    const cached = await parseProductCatalog(cachedPath);
    const uncached = await parseProductCatalog(uncachedPath);
    assert.equal(cached[0]?.price, 15);
    assert.equal(uncached[0]?.price, 0);
  });

  it('treats an Excel error Price cell as missing ($0)', async () => {
    const filePath = path.join(tmpDir, 'error-price.xlsx');
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Name', 'Price'],
      ['Broken', null],
    ]);
    worksheet.B2 = { t: 'e', v: 0x2a, w: '#N/A' };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    XLSX.writeFile(workbook, filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.name, 'Broken');
    assert.equal(products[0]?.price, 0);
  });

  it('falls through empty title-case Description/Image URL/Category/SKU to lowercase columns', async () => {
    const filePath = path.join(tmpDir, 'empty-title-fallthrough.xlsx');
    writeCatalog(
      [
        {
          Name: 'Dual Cols',
          Price: 4,
          Description: '',
          description: 'from lowercase',
          'Image URL': '',
          image_url: 'https://cdn.example/p.png',
          Category: '',
          category: 'lower-cat',
          SKU: '',
          sku: 'lower-sku',
        },
      ],
      filePath
    );

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.description, 'from lowercase');
    assert.equal(products[0]?.image_url, 'https://cdn.example/p.png');
    assert.equal(products[0]?.category, 'lower-cat');
    assert.equal(products[0]?.sku, 'lower-sku');
    assert.deepEqual(products[0]?.metadata, { category: 'lower-cat', sku: 'lower-sku' });
  });

  it('drops a numeric Excel ID of 0 because 0 is falsy in the ID fallback chain', async () => {
    const filePath = path.join(tmpDir, 'zero-id.xlsx');
    writeCatalog([{ ID: 0, Name: 'Zero Id', Price: 3 }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.id, '');
  });
});

describe('syncProductsToStripe stale prices, name duplicates, and row isolation', () => {
  before(() => {
    mock.method(console, 'log', () => undefined);
    mock.method(console, 'error', () => undefined);
  });

  after(() => {
    mock.restoreAll();
  });

  it('creates a second product when the Excel row has no ID even if the name already exists', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_existing = { id: 'prod_existing', name: 'Trail Tent' };

    const result = await syncProductsToStripe(
      [{ name: 'Trail Tent', price: 40, currency: 'usd' }],
      mockStripe.stripe
    );

    assert.deepEqual(mockStripe.retrieveCalls, []);
    assert.equal(result.updated.length, 0);
    assert.equal(result.created.length, 1);
    assert.notEqual(result.created[0]?.id, 'prod_existing');
    assert.equal(mockStripe.createdPrices[0]?.unit_amount, 4000);
  });

  it('does not mint a new price when an existing product is updated with a different Excel price', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_stale = { id: 'prod_stale', name: 'Old Name' };

    const products: ProductRow[] = [
      { id: 'prod_stale', name: 'New Name', price: 25, currency: 'usd', sku: 'STALE-1' },
    ];
    const result = await syncProductsToStripe(products, mockStripe.stripe);

    assert.equal(result.updated.length, 1);
    assert.equal(mockStripe.updatedProducts[0]?.name, 'New Name');
    assert.equal(mockStripe.createdPrices.length, 0);
    assert.equal(result.created.length, 0);
  });

  it('updates an archived product in place without unarchiving it or creating a price', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_archived = {
      id: 'prod_archived',
      name: 'Hidden',
      active: false,
    };

    const result = await syncProductsToStripe(
      [{ id: 'prod_archived', name: 'Still Hidden', price: 50, currency: 'usd' }],
      mockStripe.stripe
    );

    assert.equal(result.updated.length, 1);
    assert.equal(result.created.length, 0);
    assert.equal('active' in mockStripe.updatedProducts[0]!, false);
    assert.equal(mockStripe.createdPrices.length, 0);
  });

  it('writes empty category/sku metadata on update when Excel omitted those columns', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-catalog-meta-sync-'));
    try {
      const filePath = path.join(tmpDir, 'meta.xlsx');
      writeCatalog([{ ID: 'prod_meta', Name: 'Meta', Price: 5 }], filePath);
      const products = await parseProductCatalog(filePath);

      const mockStripe = createMockStripe();
      mockStripe.retrieveById.prod_meta = {
        id: 'prod_meta',
        name: 'Meta',
        metadata: { color: 'red', sku: 'OLD', vendor: 'acme' },
      };
      await syncProductsToStripe(products, mockStripe.stripe);

      // Empty strings unset those Stripe metadata keys; other keys are not sent.
      assert.deepEqual(mockStripe.updatedProducts[0]?.metadata, { category: '', sku: '' });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('omits description and images on update when Excel left them blank, so Stripe fields are not cleared', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_keep = {
      id: 'prod_keep',
      name: 'Keep',
      description: 'Old copy',
      images: ['https://cdn.example/old.png'],
    };

    await syncProductsToStripe(
      [{ id: 'prod_keep', name: 'Keep', price: 9, description: '', image_url: '', currency: 'usd' }],
      mockStripe.stripe
    );

    assert.equal(mockStripe.updatedProducts[0]?.description, undefined);
    assert.equal(mockStripe.updatedProducts[0]?.images, undefined);
    assert.equal(mockStripe.createdPrices.length, 0);
  });

  it('syncs a notes-only parsed row as a free Unnamed Product', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-catalog-notes-sync-'));
    try {
      const filePath = path.join(tmpDir, 'notes.xlsx');
      const worksheet = XLSX.utils.aoa_to_sheet([
        ['Name', 'Price', 'Category'],
        [null, null, 'do not sell'],
      ]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
      XLSX.writeFile(workbook, filePath);

      const products = await parseProductCatalog(filePath);
      const mockStripe = createMockStripe();
      await syncProductsToStripe(products, mockStripe.stripe);

      assert.equal(mockStripe.createdProducts[0]?.name, 'Unnamed Product');
      assert.equal(mockStripe.createdPrices[0]?.unit_amount, 0);
      assert.deepEqual(mockStripe.createdProducts[0]?.metadata, {
        category: 'do not sell',
        sku: '',
      });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('syncs a whitespace-only Price as unit_amount NaN rather than $0', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-catalog-ws-price-sync-'));
    try {
      const filePath = path.join(tmpDir, 'ws-price.xlsx');
      writeCatalog([{ Name: 'Whitespace Price', Price: '   ' }], filePath);
      const products = await parseProductCatalog(filePath);
      const mockStripe = createMockStripe();
      await syncProductsToStripe(products, mockStripe.stripe);

      assert.equal(Number.isNaN(mockStripe.createdPrices[0]?.unit_amount), true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('creates rather than retrieves when the parsed id is the empty string from Excel ID 0', async () => {
    const mockStripe = createMockStripe();
    const result = await syncProductsToStripe(
      [{ id: '', name: 'Zero Id', price: 3, currency: 'usd' }],
      mockStripe.stripe
    );

    assert.deepEqual(mockStripe.retrieveCalls, []);
    assert.equal(result.created.length, 1);
    assert.equal(mockStripe.createdPrices[0]?.unit_amount, 300);
  });
});

describe('getProductWithPrices multi-price order', () => {
  it('returns prices.list order and ignores product.default_price', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_multi = {
      id: 'prod_multi',
      name: 'Multi',
      default_price: { id: 'price_default', unit_amount: 999, currency: 'usd' },
    };
    mockStripe.priceListByProduct.prod_multi = [
      { id: 'price_old', unit_amount: 1000, currency: 'usd', recurring: null },
      { id: 'price_new', unit_amount: 2500, currency: 'usd', recurring: null },
    ];

    const result = await getProductWithPrices(mockStripe.stripe, 'prod_multi');

    assert.equal(result.product.id, 'prod_multi');
    assert.deepEqual(
      result.prices.map((price) => price.id),
      ['price_old', 'price_new']
    );
    assert.equal(
      result.prices.some((price) => price.id === 'price_default'),
      false
    );
    assert.deepEqual(mockStripe.lastPriceListParams, { product: 'prod_multi', active: true });
  });
});
