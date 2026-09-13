import assert from 'node:assert/strict';
import { after, afterEach, before, describe, it } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import XLSX from 'xlsx';
import type Stripe from 'stripe';
import { parseProductCatalog, syncProductsToStripe, type ProductRow } from './catalog.js';

const tempDirs: string[] = [];
const originalLog = console.log;
const originalError = console.error;

before(() => {
  console.log = () => undefined;
  console.error = () => undefined;
});

after(() => {
  console.log = originalLog;
  console.error = originalError;
});

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function writeWorkbook(sheets: Array<{ name: string; rows: Record<string, unknown>[] }>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-edge-'));
  tempDirs.push(dir);
  const file = path.join(dir, 'catalog.xlsx');
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sheet.rows), sheet.name);
  }
  XLSX.writeFile(workbook, file);
  return file;
}

function productRow(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    name: 'Widget',
    price: 10,
    ...overrides,
  };
}

function createMockStripe(options: {
  existing?: Record<string, { id: string; name: string }>;
  failCreate?: boolean;
} = {}) {
  const createdProducts: Record<string, unknown>[] = [];
  const updatedProducts: Record<string, unknown>[] = [];
  const createdPrices: Record<string, unknown>[] = [];
  let productSeq = 0;

  const stripe = {
    products: {
      retrieve: async (id: string) => {
        const existing = options.existing?.[id];
        if (!existing) {
          throw new Error(`No such product: ${id}`);
        }
        return existing;
      },
      update: async (id: string, data: Record<string, unknown>) => {
        const updated = { id, ...data };
        updatedProducts.push(updated);
        return updated;
      },
      create: async (data: Record<string, unknown>) => {
        if (options.failCreate) {
          throw new Error('create failed');
        }
        productSeq += 1;
        const created = { id: `prod_${productSeq}`, ...data };
        createdProducts.push(created);
        return created;
      },
    },
    prices: {
      create: async (data: Record<string, unknown>) => {
        createdPrices.push(data);
        return { id: 'price_1', ...data };
      },
    },
  };

  return {
    stripe: stripe as unknown as Stripe,
    createdProducts,
    updatedProducts,
    createdPrices,
  };
}

describe('parseProductCatalog edge cases', () => {
  it('parses a non-numeric price as NaN (would become NaN cents on sync)', async () => {
    const file = writeWorkbook([{ name: 'Products', rows: [{ Name: 'Broken', Price: 'not-a-price' }] }]);
    const [product] = await parseProductCatalog(file);

    assert.equal(product?.name, 'Broken');
    assert.equal(Number.isNaN(product?.price), true);
  });

  it('reads only the first worksheet', async () => {
    const file = writeWorkbook([
      { name: 'Live', rows: [{ Name: 'On first sheet', Price: 5 }] },
      { name: 'Draft', rows: [{ Name: 'On second sheet', Price: 99 }] },
    ]);

    const products = await parseProductCatalog(file);
    assert.equal(products.length, 1);
    assert.equal(products[0]?.name, 'On first sheet');
    assert.equal(products[0]?.price, 5);
  });
});

describe('syncProductsToStripe edge cases', () => {
  it('creates and updates in the same batch', async () => {
    const { stripe, createdProducts, updatedProducts, createdPrices } = createMockStripe({
      existing: { prod_keep: { id: 'prod_keep', name: 'Old' } },
    });

    const result = await syncProductsToStripe(
      [
        productRow({ id: 'prod_keep', name: 'Renamed' }),
        productRow({ name: 'Brand new', price: 2.5, sku: 'NEW-1' }),
      ],
      stripe
    );

    assert.equal(result.updated.length, 1);
    assert.equal(result.created.length, 1);
    assert.equal(updatedProducts[0]?.name, 'Renamed');
    assert.equal(createdProducts[0]?.name, 'Brand new');
    assert.equal(createdPrices.length, 1);
    assert.equal(createdPrices[0]?.unit_amount, 250);
  });

  it('propagates a fallback create failure instead of skipping the product', async () => {
    const { stripe } = createMockStripe({ failCreate: true });

    await assert.rejects(
      () => syncProductsToStripe([productRow({ id: 'prod_missing', name: 'Unrecoverable' })], stripe),
      /create failed/
    );
  });

  it('sends NaN unit_amount when the catalog price is not a number', async () => {
    const { stripe, createdPrices } = createMockStripe();
    await syncProductsToStripe([productRow({ name: 'Bad price', price: Number.NaN })], stripe);
    assert.equal(Number.isNaN(createdPrices[0]?.unit_amount), true);
  });
});
