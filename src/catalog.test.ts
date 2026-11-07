import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import XLSX from 'xlsx';
import Stripe from 'stripe';
import {
  parseProductCatalog,
  syncProductsToStripe,
  getStripeProducts,
  getProductWithPrices,
  ProductRow,
} from './catalog.js';

function writeCatalog(rows: Record<string, unknown>[], filePath: string): void {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
  XLSX.writeFile(workbook, filePath);
}

interface MockStripe {
  stripe: Stripe;
  createdProducts: Array<Record<string, unknown>>;
  createdPrices: Array<Record<string, unknown>>;
  updatedProducts: Array<Record<string, unknown>>;
  retrieveById: Record<string, Record<string, unknown>>;
  lastProductListParams: Record<string, unknown> | undefined;
  lastPriceListParams: Record<string, unknown> | undefined;
}

function createMockStripe(): MockStripe {
  const createdProducts: Array<Record<string, unknown>> = [];
  const createdPrices: Array<Record<string, unknown>> = [];
  const updatedProducts: Array<Record<string, unknown>> = [];
  const retrieveById: Record<string, Record<string, unknown>> = {};
  let productSeq = 0;
  let lastProductListParams: Record<string, unknown> | undefined;
  let lastPriceListParams: Record<string, unknown> | undefined;

  const stripe = {
    products: {
      retrieve: async (id: string) => {
        if (!retrieveById[id]) {
          throw new Error(`No such product: ${id}`);
        }
        return retrieveById[id];
      },
      update: async (id: string, data: Record<string, unknown>) => {
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
      list: async (params: Record<string, unknown>) => {
        lastPriceListParams = params;
        return { data: [{ id: 'price_active', product: params.product, active: true }] };
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
    get lastPriceListParams() {
      return lastPriceListParams;
    },
  };
}

describe('parseProductCatalog', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-catalog-'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('maps title-case Excel columns into product rows', async () => {
    const filePath = path.join(tmpDir, 'title-case.xlsx');
    writeCatalog(
      [
        {
          ID: 'prod_existing',
          Name: 'Pro Plan',
          Description: 'Full access',
          Price: 19.99,
          Currency: 'USD',
          'Image URL': 'https://example.com/pro.png',
          Category: 'plans',
          SKU: 'PRO-1',
        },
      ],
      filePath
    );

    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 1);
    assert.deepEqual(products[0], {
      id: 'prod_existing',
      name: 'Pro Plan',
      description: 'Full access',
      price: 19.99,
      currency: 'usd',
      image_url: 'https://example.com/pro.png',
      category: 'plans',
      sku: 'PRO-1',
      metadata: { category: 'plans', sku: 'PRO-1' },
    });
  });

  it('accepts lowercase column names and applies defaults', async () => {
    const filePath = path.join(tmpDir, 'lowercase.xlsx');
    writeCatalog([{ name: 'Bare Product' }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products.length, 1);
    assert.equal(products[0].id, '');
    assert.equal(products[0].name, 'Bare Product');
    assert.equal(products[0].description, '');
    assert.equal(products[0].price, 0);
    assert.equal(products[0].currency, 'usd');
    assert.equal(products[0].image_url, '');
    assert.equal(products[0].category, '');
    assert.equal(products[0].sku, '');
    assert.deepEqual(products[0].metadata, { category: '', sku: '' });
  });

  it('uses Unnamed Product when name is missing', async () => {
    const filePath = path.join(tmpDir, 'unnamed.xlsx');
    writeCatalog([{ Price: 5 }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0].name, 'Unnamed Product');
    assert.equal(products[0].price, 5);
  });

  it('returns an empty list for a header-only spreadsheet', async () => {
    const filePath = path.join(tmpDir, 'empty.xlsx');
    writeCatalog([], filePath);

    const products = await parseProductCatalog(filePath);
    assert.deepEqual(products, []);
  });
});

describe('syncProductsToStripe', () => {
  before(() => {
    mock.method(console, 'log', () => undefined);
    mock.method(console, 'error', () => undefined);
  });

  after(() => {
    mock.restoreAll();
  });

  it('creates a product and price in cents for rows without an id', async () => {
    const mock = createMockStripe();
    const products: ProductRow[] = [
      {
        name: 'Starter',
        description: 'Entry plan',
        price: 19.99,
        currency: 'usd',
        image_url: 'https://example.com/starter.png',
        sku: 'START-1',
        metadata: { category: 'plans', sku: 'START-1' },
      },
    ];

    const result = await syncProductsToStripe(products, mock.stripe);

    assert.equal(result.created.length, 1);
    assert.equal(result.updated.length, 0);
    assert.equal(mock.createdProducts[0].name, 'Starter');
    assert.deepEqual(mock.createdProducts[0].images, ['https://example.com/starter.png']);
    assert.equal(mock.createdPrices.length, 1);
    assert.equal(mock.createdPrices[0].product, 'prod_1');
    assert.equal(mock.createdPrices[0].unit_amount, 1999);
    assert.equal(mock.createdPrices[0].currency, 'usd');
    assert.deepEqual(mock.createdPrices[0].metadata, { sku: 'START-1' });
  });

  it('rounds fractional dollars to integer cents', async () => {
    const mock = createMockStripe();
    await syncProductsToStripe([{ name: 'Penny', price: 10.5, currency: 'usd' }], mock.stripe);
    assert.equal(mock.createdPrices[0].unit_amount, 1050);
  });

  it('updates an existing product by id and does not create a price', async () => {
    const mock = createMockStripe();
    mock.retrieveById.prod_existing = { id: 'prod_existing', name: 'Old' };

    const result = await syncProductsToStripe(
      [
        {
          id: 'prod_existing',
          name: 'New Name',
          description: 'Updated',
          price: 40,
          image_url: '',
          metadata: { category: 'plans', sku: 'EXIST-1' },
        },
      ],
      mock.stripe
    );

    assert.equal(result.updated.length, 1);
    assert.equal(result.created.length, 0);
    assert.equal(mock.updatedProducts[0].id, 'prod_existing');
    assert.equal(mock.updatedProducts[0].name, 'New Name');
    assert.equal(mock.createdPrices.length, 0);
  });

  it('creates a product when retrieve of a given id fails', async () => {
    const mock = createMockStripe();

    const result = await syncProductsToStripe(
      [{ id: 'prod_missing', name: 'Recovered', price: 12, currency: 'eur', sku: 'REC-1' }],
      mock.stripe
    );

    assert.equal(result.created.length, 1);
    assert.equal(result.updated.length, 0);
    assert.equal(mock.createdProducts[0].name, 'Recovered');
    assert.equal(mock.createdPrices[0].unit_amount, 1200);
    assert.equal(mock.createdPrices[0].currency, 'eur');
  });

  it('continues syncing later rows after a missing-id recovery', async () => {
    const mock = createMockStripe();

    const result = await syncProductsToStripe(
      [
        { id: 'prod_missing', name: 'First', price: 1 },
        { name: 'Second', price: 2 },
      ],
      mock.stripe
    );

    assert.equal(result.created.length, 2);
    assert.deepEqual(
      result.created.map((p) => p.name),
      ['First', 'Second']
    );
  });
});

describe('catalog Stripe reads', () => {
  it('lists only active products with the requested limit', async () => {
    const mock = createMockStripe();
    mock.retrieveById.prod_a = { id: 'prod_a', name: 'A' };

    const products = await getStripeProducts(mock.stripe, 7);

    assert.equal(products.length, 1);
    assert.deepEqual(mock.lastProductListParams, { limit: 7, active: true });
  });

  it('loads a product together with its active prices', async () => {
    const mock = createMockStripe();
    mock.retrieveById.prod_a = { id: 'prod_a', name: 'A', description: 'Desc' };

    const result = await getProductWithPrices(mock.stripe, 'prod_a');

    assert.equal(result.product.id, 'prod_a');
    assert.equal(result.prices[0].id, 'price_active');
    assert.deepEqual(mock.lastPriceListParams, { product: 'prod_a', active: true });
  });
});
