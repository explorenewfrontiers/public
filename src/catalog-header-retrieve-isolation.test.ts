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
  const deletedProductIds: string[] = [];
  const retrieveById: Record<string, Record<string, unknown>> = {};
  const retrieveCalls: Array<string | number> = [];
  const priceListByProduct: Record<string, Array<Record<string, unknown>>> = {};
  let lastPriceListParams: Record<string, unknown> | undefined;
  let productSeq = 0;
  let retrieveError: Error | undefined;

  const stripe = {
    products: {
      retrieve: async (id: string) => {
        retrieveCalls.push(id);
        if (retrieveError) {
          throw retrieveError;
        }
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
      del: async (id: string) => {
        deletedProductIds.push(id);
        return { id, deleted: true };
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
    deletedProductIds,
    retrieveById,
    retrieveCalls,
    priceListByProduct,
    get lastPriceListParams() {
      return lastPriceListParams;
    },
    failRetrieve(error: Error) {
      retrieveError = error;
    },
  };
}

describe('parseProductCatalog header layout and remaining money isolation', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-catalog-header-retrieve-'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('treats a title row above headers as the header, so every product becomes Unnamed $0', async () => {
    const filePath = path.join(tmpDir, 'title-row.xlsx');
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Product Catalog Fall 2026'],
      ['Name', 'Price'],
      ['Trail Tent', 89.99],
      ['Cafe Mug', 12.5],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    XLSX.writeFile(workbook, filePath);

    const products = await parseProductCatalog(filePath);
    // Title becomes the header, so Name/Price and both product rows are ingested as data.
    assert.equal(products.length, 3);
    assert.equal(
      products.every((product) => product.name === 'Unnamed Product' && product.price === 0),
      true
    );
  });

  it('ignores a Unit Price header so the row syncs as $0', async () => {
    const filePath = path.join(tmpDir, 'unit-price-header.xlsx');
    writeCatalog([{ Name: 'Mug', 'Unit Price': 12.5 }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.name, 'Mug');
    assert.equal(products[0]?.price, 0);
  });

  it('ignores a Product Name header so the row becomes Unnamed Product', async () => {
    const filePath = path.join(tmpDir, 'product-name-header.xlsx');
    writeCatalog([{ 'Product Name': 'Mug', Price: 12.5 }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.name, 'Unnamed Product');
    assert.equal(products[0]?.price, 12.5);
  });

  it('reads only the first worksheet, so an empty Notes sheet hides the Products sheet', async () => {
    const filePath = path.join(tmpDir, 'empty-first-sheet.xlsx');
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), 'Notes');
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet([{ Name: 'Live Product', Price: 10 }]),
      'Products'
    );
    XLSX.writeFile(workbook, filePath);

    const products = await parseProductCatalog(filePath);
    assert.deepEqual(products, []);
  });

  it('parses a euro-suffixed Price but yields NaN for a euro-prefixed Price', async () => {
    const suffixPath = path.join(tmpDir, 'euro-suffix.xlsx');
    const prefixPath = path.join(tmpDir, 'euro-prefix.xlsx');
    writeCatalog([{ Name: 'Cafe', Price: '29.99€' }], suffixPath);
    writeCatalog([{ Name: 'Cafe', Price: '€29.99' }], prefixPath);

    const suffix = await parseProductCatalog(suffixPath);
    const prefix = await parseProductCatalog(prefixPath);
    assert.equal(suffix[0]?.price, 29.99);
    assert.equal(Number.isNaN(prefix[0]?.price), true);
  });

  it('truncates an NBSP thousands-separated Price at the space (1000x undercharge)', async () => {
    const filePath = path.join(tmpDir, 'nbsp-thousands.xlsx');
    writeCatalog([{ Name: 'Bulk', Price: '1\u00a0234.50' }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.price, 1);
  });

  it('truncates a Swiss-apostrophe thousands Price at the apostrophe', async () => {
    const filePath = path.join(tmpDir, 'swiss-apostrophe.xlsx');
    writeCatalog([{ Name: 'Bulk', Price: "1'234.50" }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.price, 1);
  });

  it('uses an Image URL hyperlink display text instead of the Target URL', async () => {
    const filePath = path.join(tmpDir, 'hyperlink-image.xlsx');
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Name', 'Price', 'Image URL'],
      ['Photo', 5, null],
    ]);
    worksheet.C2 = { t: 's', v: 'photo.png', l: { Target: 'https://cdn.example/p.png' } };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    XLSX.writeFile(workbook, filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.image_url, 'photo.png');
    assert.notEqual(products[0]?.image_url, 'https://cdn.example/p.png');
  });

  it('drops an uncached formula ID so the row is treated as new', async () => {
    const filePath = path.join(tmpDir, 'uncached-formula-id.xlsx');
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['ID', 'Name', 'Price'],
      [null, 'Mug', 5],
    ]);
    worksheet.A2 = { t: 'str', f: '"prod_"&"live"' };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    XLSX.writeFile(workbook, filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.id, '');
    assert.equal(products[0]?.name, 'Mug');
  });

  it('keeps a trailing newline on a Stripe ID so retrieve will miss', async () => {
    const filePath = path.join(tmpDir, 'id-newline.xlsx');
    writeCatalog([{ ID: 'prod_live\n', Name: 'Mug', Price: 5 }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.id, 'prod_live\n');
  });
});

describe('syncProductsToStripe retrieve isolation and remaining money', () => {
  before(() => {
    mock.method(console, 'log', () => undefined);
    mock.method(console, 'error', () => undefined);
  });

  after(() => {
    mock.restoreAll();
  });

  it('duplicates an existing product when retrieve fails with a rate-limit error', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_live = { id: 'prod_live', name: 'Trail Tent' };
    mockStripe.failRetrieve(new Error('Rate limit exceeded'));

    const result = await syncProductsToStripe(
      [{ id: 'prod_live', name: 'Trail Tent', price: 40, currency: 'usd' }],
      mockStripe.stripe
    );

    assert.deepEqual(mockStripe.retrieveCalls, ['prod_live']);
    assert.equal(result.updated.length, 0);
    assert.equal(result.created.length, 1);
    assert.equal(mockStripe.createdProducts[0]?.name, 'Trail Tent');
    assert.notEqual(mockStripe.createdProducts[0]?.id, 'prod_live');
    assert.equal(mockStripe.createdPrices[0]?.unit_amount, 4000);
  });

  it('leaves Stripe products that are absent from Excel active (no deactivate or delete)', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_orphan = { id: 'prod_orphan', name: 'Old Catalog Item', active: true };

    const result = await syncProductsToStripe(
      [{ name: 'Only In Excel', price: 8, currency: 'usd' }],
      mockStripe.stripe
    );

    assert.equal(result.created.length, 1);
    assert.equal(result.updated.length, 0);
    assert.deepEqual(mockStripe.deletedProductIds, []);
    assert.equal(
      mockStripe.updatedProducts.some((product) => product.active === false),
      false
    );
    assert.equal(mockStripe.retrieveById.prod_orphan?.active, true);
  });

  it('still multiplies BHD catalog amounts by 100 (10x undercharge for a 3-decimal currency)', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe(
      [{ name: 'Dinar widget', price: 1.25, currency: 'bhd' }],
      mockStripe.stripe
    );

    assert.equal(mockStripe.createdPrices[0]?.currency, 'bhd');
    assert.equal(mockStripe.createdPrices[0]?.unit_amount, 125);
  });

  it('duplicates a product when the Excel ID has a trailing newline', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_live = { id: 'prod_live', name: 'Trail Tent' };

    const result = await syncProductsToStripe(
      [{ id: 'prod_live\n', name: 'Mug', price: 5, currency: 'usd' }],
      mockStripe.stripe
    );

    assert.deepEqual(mockStripe.retrieveCalls, ['prod_live\n']);
    assert.equal(result.updated.length, 0);
    assert.equal(result.created.length, 1);
    assert.notEqual(mockStripe.createdProducts[0]?.id, 'prod_live');
    assert.equal(mockStripe.createdPrices[0]?.unit_amount, 500);
  });

  it('syncs a title-row catalog as free Unnamed Products', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-catalog-title-sync-'));
    try {
      const filePath = path.join(tmpDir, 'title.xlsx');
      const worksheet = XLSX.utils.aoa_to_sheet([
        ['Product Catalog Fall 2026'],
        ['Name', 'Price'],
        ['Trail Tent', 89.99],
      ]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
      XLSX.writeFile(workbook, filePath);

      const products = await parseProductCatalog(filePath);
      const mockStripe = createMockStripe();
      await syncProductsToStripe(products, mockStripe.stripe);

      // Title header turns the Name/Price row and the product row into two free Unnamed Products.
      assert.equal(mockStripe.createdProducts.length, 2);
      assert.equal(
        mockStripe.createdProducts.every((product) => product.name === 'Unnamed Product'),
        true
      );
      assert.deepEqual(
        mockStripe.createdPrices.map((price) => price.unit_amount),
        [0, 0]
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('syncs a Unit Price header row as unit_amount 0 (free)', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-catalog-unit-price-sync-'));
    try {
      const filePath = path.join(tmpDir, 'unit-price.xlsx');
      writeCatalog([{ Name: 'Mug', 'Unit Price': 12.5 }], filePath);
      const products = await parseProductCatalog(filePath);
      const mockStripe = createMockStripe();
      await syncProductsToStripe(products, mockStripe.stripe);

      assert.equal(mockStripe.createdProducts[0]?.name, 'Mug');
      assert.equal(mockStripe.createdPrices[0]?.unit_amount, 0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('sends the hyperlink display text as the product image, not the Target URL', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-catalog-hyperlink-sync-'));
    try {
      const filePath = path.join(tmpDir, 'hyperlink.xlsx');
      const worksheet = XLSX.utils.aoa_to_sheet([
        ['Name', 'Price', 'Image URL'],
        ['Photo', 5, null],
      ]);
      worksheet.C2 = { t: 's', v: 'photo.png', l: { Target: 'https://cdn.example/p.png' } };
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
      XLSX.writeFile(workbook, filePath);

      const products = await parseProductCatalog(filePath);
      const mockStripe = createMockStripe();
      await syncProductsToStripe(products, mockStripe.stripe);

      assert.deepEqual(mockStripe.createdProducts[0]?.images, ['photo.png']);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('creates rather than retrieves when an uncached formula ID parsed as empty', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_live = { id: 'prod_live', name: 'Existing' };

    const products: ProductRow[] = [{ id: '', name: 'Mug', price: 5, currency: 'usd' }];
    const result = await syncProductsToStripe(products, mockStripe.stripe);

    assert.deepEqual(mockStripe.retrieveCalls, []);
    assert.equal(result.updated.length, 0);
    assert.equal(result.created.length, 1);
    assert.notEqual(result.created[0]?.id, 'prod_live');
    assert.equal(mockStripe.createdPrices[0]?.unit_amount, 500);
  });
});

describe('getProductWithPrices active-price isolation', () => {
  it('requests only active prices and omits inactive ones from the storefront payload', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_mixed = { id: 'prod_mixed', name: 'Mixed' };
    mockStripe.priceListByProduct.prod_mixed = [
      { id: 'price_old', unit_amount: 1000, currency: 'usd', active: false },
      { id: 'price_live', unit_amount: 2500, currency: 'usd', active: true },
    ];

    const result = await getProductWithPrices(mockStripe.stripe, 'prod_mixed');

    assert.deepEqual(mockStripe.lastPriceListParams, { product: 'prod_mixed', active: true });
    assert.deepEqual(
      result.prices.map((price) => price.id),
      ['price_live']
    );
  });
});
