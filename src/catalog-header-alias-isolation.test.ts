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
  const productListCalls: Array<Record<string, unknown>> = [];
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
      list: async (params: Record<string, unknown>) => {
        productListCalls.push(params);
        return { data: Object.values(retrieveById), has_more: false };
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
    productListCalls,
  };
}

describe('parseProductCatalog header-alias and remaining money isolation', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-catalog-header-alias-'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('ignores a Sku header (Excel title-case), so SKU metadata is dropped', async () => {
    const filePath = path.join(tmpDir, 'sku-header.xlsx');
    writeAoa(filePath, [
      ['Sku', 'Name', 'Price'],
      ['MUG-1', 'Mug', 12],
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.name, 'Mug');
    assert.equal(products[0]?.sku, '');
    assert.equal(products[0]?.metadata?.sku, '');
  });

  it('ignores a Product ID header, so the Stripe id is dropped', async () => {
    const filePath = path.join(tmpDir, 'product-id-header.xlsx');
    writeAoa(filePath, [
      ['Product ID', 'Name', 'Price'],
      ['prod_existing', 'Mug', 12.5],
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.id, '');
    assert.equal(products[0]?.name, 'Mug');
    assert.equal(products[0]?.price, 12.5);
  });

  it('ignores a List Price header so the row is priced at $0', async () => {
    const filePath = path.join(tmpDir, 'list-price-header.xlsx');
    writeAoa(filePath, [
      ['Name', 'List Price'],
      ['Ceramic Mug', 19.99],
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.name, 'Ceramic Mug');
    assert.equal(products[0]?.price, 0);
  });

  it('ignores an Item Name header so the row becomes Unnamed Product', async () => {
    const filePath = path.join(tmpDir, 'item-name-header.xlsx');
    writeAoa(filePath, [
      ['Item Name', 'Price'],
      ['Trail Tent', 89.99],
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.name, 'Unnamed Product');
    assert.equal(products[0]?.price, 89.99);
  });

  it('ignores a Shopify Title header so the row becomes Unnamed Product', async () => {
    const filePath = path.join(tmpDir, 'title-header.xlsx');
    writeAoa(filePath, [
      ['Title', 'Price'],
      ['Sticker Pack', 4],
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.name, 'Unnamed Product');
    assert.equal(products[0]?.price, 4);
  });

  it('ignores an Image Src header so the Shopify CDN URL is dropped', async () => {
    const filePath = path.join(tmpDir, 'image-src-header.xlsx');
    writeAoa(filePath, [
      ['Name', 'Price', 'Image Src'],
      ['Mug', 12, 'https://cdn.shopify.com/mug.png'],
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.name, 'Mug');
    assert.equal(products[0]?.image_url, '');
  });

  it('treats a BOM-prefixed Name header as missing, so the row is Unnamed Product', async () => {
    const filePath = path.join(tmpDir, 'bom-name-header.xlsx');
    writeAoa(filePath, [
      ['\uFEFFName', 'Price'],
      ['Mug', 12],
    ]);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.name, 'Unnamed Product');
    assert.equal(products[0]?.price, 12);
  });

  it('lowercases Currency EURO instead of mapping it to eur', async () => {
    const filePath = path.join(tmpDir, 'euro-word.xlsx');
    writeCatalog([{ Name: 'Mug', Price: 12, Currency: 'EURO' }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.currency, 'euro');
  });

  it('parses a 10k Price as $10 instead of $10000', async () => {
    const filePath = path.join(tmpDir, 'ten-k-price.xlsx');
    writeCatalog([{ Name: 'Bulk pack', Price: '10k' }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.price, 10);
  });

  it('forwards a data: Image URL unchanged', async () => {
    const filePath = path.join(tmpDir, 'data-image.xlsx');
    writeCatalog(
      [{ Name: 'Mug', Price: 12, 'Image URL': 'data:image/png;base64,abc' }],
      filePath
    );

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.image_url, 'data:image/png;base64,abc');
  });
});

describe('syncProductsToStripe header-alias and remaining money isolation', () => {
  before(() => {
    mock.method(console, 'log', () => undefined);
    mock.method(console, 'error', () => undefined);
  });

  after(() => {
    mock.restoreAll();
  });

  it('creates a duplicate when Excel used Product ID instead of ID, even if the product exists', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_existing = { id: 'prod_existing', name: 'Mug' };

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-product-id-sync-'));
    try {
      const filePath = path.join(dir, 'product-id.xlsx');
      writeAoa(filePath, [
        ['Product ID', 'Name', 'Price'],
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

  it('syncs a List Price row as a free product', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe(
      [{ name: 'Ceramic Mug', price: 0, currency: 'usd' }],
      mockStripe.stripe
    );

    assert.equal(mockStripe.createdPrices[0]?.unit_amount, 0);
  });

  it('omits the Excel Sku value from Stripe product and price metadata', async () => {
    const mockStripe = createMockStripe();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-sku-sync-'));
    try {
      const filePath = path.join(dir, 'sku.xlsx');
      writeAoa(filePath, [
        ['Sku', 'Name', 'Price'],
        ['MUG-1', 'Mug', 12],
      ]);
      const products = await parseProductCatalog(filePath);
      await syncProductsToStripe(products, mockStripe.stripe);

      assert.deepEqual(mockStripe.createdProducts[0]?.metadata, {
        category: '',
        sku: '',
      });
      const priceMetadata = mockStripe.createdPrices[0]?.metadata as
        | Record<string, unknown>
        | undefined;
      assert.equal(priceMetadata?.sku, '');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('forwards Currency EURO as euro, which Stripe will reject', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe(
      [{ name: 'Mug', price: 12, currency: 'euro' }],
      mockStripe.stripe
    );

    assert.equal(mockStripe.createdPrices[0]?.currency, 'euro');
  });

  it('syncs a 10k Price as unit_amount 1000 (10x undercharge vs $10000)', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe(
      [{ name: 'Bulk pack', price: 10, currency: 'usd' }],
      mockStripe.stripe
    );

    assert.equal(mockStripe.createdPrices[0]?.unit_amount, 1000);
  });

  it('uploads a data: image URL on the Stripe product', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe(
      [
        {
          name: 'Mug',
          price: 12,
          currency: 'usd',
          image_url: 'data:image/png;base64,abc',
        },
      ],
      mockStripe.stripe
    );

    assert.deepEqual(mockStripe.createdProducts[0]?.images, [
      'data:image/png;base64,abc',
    ]);
  });

  it('uploads a file:// image URL on the Stripe product', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe(
      [
        {
          name: 'Mug',
          price: 12,
          currency: 'usd',
          image_url: 'file:///tmp/mug.png',
        },
      ],
      mockStripe.stripe
    );

    assert.deepEqual(mockStripe.createdProducts[0]?.images, ['file:///tmp/mug.png']);
  });

  it('uploads a whitespace-only Image URL instead of omitting images', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe(
      [{ name: 'Mug', price: 12, currency: 'usd', image_url: '   ' }],
      mockStripe.stripe
    );

    assert.deepEqual(mockStripe.createdProducts[0]?.images, ['   ']);
  });

  it('sends HTML in the product name to Stripe unchanged', async () => {
    const mockStripe = createMockStripe();
    const products: ProductRow[] = [
      { name: '<script>x</script>Mug', price: 12, currency: 'usd' },
    ];

    await syncProductsToStripe(products, mockStripe.stripe);

    assert.equal(mockStripe.createdProducts[0]?.name, '<script>x</script>Mug');
  });
});

describe('getStripeProducts expand isolation', () => {
  it('lists products without expanding default_price, so the storefront has no unit_amount', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_1 = {
      id: 'prod_1',
      name: 'Mug',
      default_price: 'price_1',
    };

    const products = await getStripeProducts(mockStripe.stripe, 20);

    assert.equal(products.length, 1);
    assert.equal(products[0]?.id, 'prod_1');
    assert.deepEqual(mockStripe.productListCalls, [{ limit: 20, active: true }]);
    assert.equal(
      (products[0] as { default_price?: unknown }).default_price,
      'price_1'
    );
  });
});
