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
        retrieveById[id] = updated;
        return updated;
      },
      create: async (data: Record<string, unknown>) => {
        const product = { id: `prod_${++productSeq}`, ...data };
        createdProducts.push(product);
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
    failRetrieve(error: Error) {
      retrieveError = error;
    },
  };
}

describe('parseProductCatalog identity and money cells', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-catalog-contract-'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('prefers title-case ID over lowercase id when both columns are present', async () => {
    const filePath = path.join(tmpDir, 'both-ids.xlsx');
    writeCatalog(
      [{ ID: 'prod_title', id: 'prod_lower', Name: 'Dual Id', Price: 1 }],
      filePath
    );

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.id, 'prod_title');
  });

  it('falls through an empty title-case ID to the lowercase id column', async () => {
    const filePath = path.join(tmpDir, 'empty-title-id.xlsx');
    writeCatalog(
      [{ ID: '', id: 'prod_from_lower', Name: 'Fallback Id', Price: 1 }],
      filePath
    );

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.id, 'prod_from_lower');
  });

  it('falls through an empty title-case Name to the lowercase name column', async () => {
    const filePath = path.join(tmpDir, 'empty-title-name.xlsx');
    writeCatalog([{ Name: '', name: 'Lowercase Name', Price: 2 }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.name, 'Lowercase Name');
  });

  it('keeps a numeric Excel ID cell as a number used later for retrieve', async () => {
    const filePath = path.join(tmpDir, 'numeric-id.xlsx');
    writeCatalog([{ ID: 1001, Name: 'Numeric Id', Price: 3 }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.id, 1001);
  });

  it('parses a numeric Excel price cell through parseFloat', async () => {
    const filePath = path.join(tmpDir, 'numeric-price.xlsx');
    writeCatalog([{ Name: 'Numeric Price', Price: 9.99 }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.price, 9.99);
  });

  it('lowercases currency but does not trim surrounding whitespace', async () => {
    const filePath = path.join(tmpDir, 'padded-currency.xlsx');
    writeCatalog([{ Name: 'Padded Fx', Price: 4, Currency: ' EUR ' }], filePath);

    const products = await parseProductCatalog(filePath);
    assert.equal(products[0]?.currency, ' eur ');
  });

  it('rejects a missing catalog file so sync_catalog cannot silently no-op', async () => {
    await assert.rejects(
      () => parseProductCatalog(path.join(tmpDir, 'does-not-exist.xlsx')),
      (error: NodeJS.ErrnoException) => {
        assert.equal(error.code, 'ENOENT');
        return true;
      }
    );
  });
});

describe('syncProductsToStripe identity and money contracts', () => {
  before(() => {
    mock.method(console, 'log', () => undefined);
    mock.method(console, 'error', () => undefined);
  });

  after(() => {
    mock.restoreAll();
  });

  it('updates an existing row and creates a new row in the same batch', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_existing = { id: 'prod_existing', name: 'Old' };

    const products: ProductRow[] = [
      { id: 'prod_existing', name: 'Updated', price: 8, currency: 'usd' },
      { name: 'Brand New', price: 3, currency: 'usd', sku: 'NEW-1' },
    ];
    const result = await syncProductsToStripe(products, mockStripe.stripe);

    assert.equal(result.updated.length, 1);
    assert.equal(result.created.length, 1);
    assert.equal(mockStripe.updatedProducts[0]?.name, 'Updated');
    assert.equal(mockStripe.createdProducts[0]?.name, 'Brand New');
    assert.equal(mockStripe.createdPrices.length, 1);
    assert.equal(mockStripe.createdPrices[0]?.unit_amount, 300);
    assert.deepEqual(mockStripe.retrieveCalls, ['prod_existing']);
  });

  it('treats a numeric Excel ID as the Stripe retrieve key', async () => {
    const mockStripe = createMockStripe();
    const products: ProductRow[] = [
      { id: 1001 as unknown as string, name: 'Numeric Id', price: 5, currency: 'usd' },
    ];

    await syncProductsToStripe(products, mockStripe.stripe);

    assert.deepEqual(mockStripe.retrieveCalls, [1001]);
    assert.equal(mockStripe.createdProducts.length, 1);
    assert.equal(mockStripe.createdPrices[0]?.unit_amount, 500);
  });

  it('syncs a $0 catalog row as unit_amount 0 instead of skipping it', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe([{ name: 'Free sample', price: 0, currency: 'usd' }], mockStripe.stripe);

    assert.equal(mockStripe.createdPrices[0]?.unit_amount, 0);
    assert.equal(mockStripe.createdProducts.length, 1);
  });

  it('uses IEEE Math.round so 1.005 dollars becomes 100 cents, not 101', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe([{ name: 'Half cent', price: 1.005, currency: 'usd' }], mockStripe.stripe);

    assert.equal(1.005 * 100, 100.49999999999999);
    assert.equal(mockStripe.createdPrices[0]?.unit_amount, 100);
  });

  it('writes an empty sku string on the price when sku is omitted', async () => {
    const mockStripe = createMockStripe();
    await syncProductsToStripe([{ name: 'No Sku', price: 2, currency: 'usd' }], mockStripe.stripe);

    assert.deepEqual(mockStripe.createdPrices[0]?.metadata, { sku: '' });
  });

  it('updates images to a single-url array when image_url is present', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_img = { id: 'prod_img', name: 'Old', images: [] };

    await syncProductsToStripe(
      [
        {
          id: 'prod_img',
          name: 'With Image',
          price: 9,
          image_url: 'https://cdn.example/p.png',
          metadata: { category: 'gear', sku: 'IMG-1' },
        },
      ],
      mockStripe.stripe
    );

    assert.deepEqual(mockStripe.updatedProducts[0]?.images, ['https://cdn.example/p.png']);
    assert.equal(mockStripe.createdPrices.length, 0);
  });
});

describe('getProductWithPrices empty and error contracts', () => {
  it('returns an empty prices array when Stripe has no active prices', async () => {
    const mockStripe = createMockStripe();
    mockStripe.retrieveById.prod_bare = { id: 'prod_bare', name: 'Bare' };

    const result = await getProductWithPrices(mockStripe.stripe, 'prod_bare');

    assert.equal(result.product.id, 'prod_bare');
    assert.deepEqual(result.prices, []);
    assert.deepEqual(mockStripe.lastPriceListParams, { product: 'prod_bare', active: true });
  });

  it('propagates a missing-product retrieve error', async () => {
    const mockStripe = createMockStripe();
    mockStripe.failRetrieve(new Error('No such product: prod_gone'));

    await assert.rejects(
      () => getProductWithPrices(mockStripe.stripe, 'prod_gone'),
      /No such product: prod_gone/
    );
  });
});
