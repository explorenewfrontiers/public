import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import XLSX from 'xlsx';
import type Stripe from 'stripe';
import {
  getProductWithPrices,
  isResourceMissing,
  parsePriceValue,
  parseProductCatalog,
  priceToUnitAmount,
  syncProductsToStripe,
  type ProductRow,
} from './catalog.js';

describe('parsePriceValue', () => {
  it('keeps numeric Excel values', () => {
    assert.equal(parsePriceValue(29.99), 29.99);
  });

  it('strips currency formatting so $10.00 does not become NaN', () => {
    assert.equal(parsePriceValue('$10.00'), 10);
    assert.equal(parsePriceValue('1,234.50'), 1234.5);
  });

  it('returns NaN for missing or unusable values', () => {
    assert.equal(Number.isNaN(parsePriceValue(undefined)), true);
    assert.equal(Number.isNaN(parsePriceValue('')), true);
    assert.equal(Number.isNaN(parsePriceValue('n/a')), true);
  });
});

describe('priceToUnitAmount', () => {
  it('converts dollars to cents with rounding', () => {
    assert.equal(priceToUnitAmount(10), 1000);
    assert.equal(priceToUnitAmount(19.99), 1999);
    assert.equal(priceToUnitAmount(0.1), 10);
  });

  it('rejects NaN and negative prices', () => {
    assert.throws(() => priceToUnitAmount(Number.NaN), /Invalid price/);
    assert.throws(() => priceToUnitAmount(-1), /Invalid price/);
  });
});

describe('isResourceMissing', () => {
  it('detects Stripe resource_missing errors', () => {
    assert.equal(isResourceMissing({ code: 'resource_missing' }), true);
    assert.equal(isResourceMissing(new Error('network')), false);
  });
});

describe('parseProductCatalog', () => {
  it('reads column aliases and currency-formatted prices', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-'));
    const filePath = path.join(dir, 'catalog.xlsx');
    const sheet = XLSX.utils.json_to_sheet([
      { Name: "Traveler's Pass", Price: '$49.00', Currency: 'USD', SKU: 'PASS-1' },
      { name: 'Camp', price: 12.5 },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Products');
    XLSX.writeFile(workbook, filePath);

    const rows = await parseProductCatalog(filePath);
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.name, "Traveler's Pass");
    assert.equal(rows[0]?.price, 49);
    assert.equal(rows[0]?.currency, 'usd');
    assert.equal(rows[1]?.price, 12.5);

    fs.rmSync(dir, { recursive: true, force: true });
  });
});

function createMockStripe(options?: {
  retrieveError?: Error & { code?: string };
  updateError?: Error;
  existingPrices?: Array<Partial<Stripe.Price>>;
}) {
  const createdProducts: Array<Record<string, unknown>> = [];
  const updatedProducts: Array<{ id: string; data: Record<string, unknown> }> = [];
  const createdPrices: Array<Record<string, unknown>> = [];
  let productSeq = 0;
  let priceSeq = 0;

  const stripe = {
    products: {
      retrieve: async (id: string) => {
        if (options?.retrieveError) {
          throw options.retrieveError;
        }
        return { id, name: 'Existing', default_price: 'price_old' };
      },
      create: async (data: Record<string, unknown>) => {
        productSeq += 1;
        const product = { id: `prod_new_${productSeq}`, ...data };
        createdProducts.push(product);
        return product;
      },
      update: async (id: string, data: Record<string, unknown>) => {
        if (options?.updateError && id === 'prod_existing') {
          throw options.updateError;
        }
        updatedProducts.push({ id, data });
        const previous = createdProducts.find((product) => product.id === id);
        return { id, name: previous?.name, ...data };
      },
    },
    prices: {
      list: async () => ({ data: options?.existingPrices ?? [] }),
      create: async (data: Record<string, unknown>) => {
        priceSeq += 1;
        const price = { id: `price_new_${priceSeq}`, ...data };
        createdPrices.push(price);
        return price;
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

const sampleProduct = (overrides: Partial<ProductRow> = {}): ProductRow => ({
  name: 'Trail Map',
  price: 10,
  currency: 'usd',
  sku: 'MAP-1',
  metadata: { sku: 'MAP-1', category: '' },
  ...overrides,
});

describe('syncProductsToStripe', () => {
  it('creates a product and price when no Stripe ID is present', async () => {
    const mock = createMockStripe();
    const result = await syncProductsToStripe([sampleProduct()], mock.stripe);

    assert.equal(result.created.length, 1);
    assert.equal(result.updated.length, 0);
    assert.equal(result.errors.length, 0);
    assert.equal(mock.createdProducts.length, 1);
    assert.equal(mock.createdPrices.length, 1);
    assert.equal(mock.createdPrices[0]?.unit_amount, 1000);
    assert.equal(mock.updatedProducts.at(-1)?.data.default_price, 'price_new_1');
  });

  it('updates an existing product and creates a price when the amount changed', async () => {
    const mock = createMockStripe({
      existingPrices: [{ id: 'price_old', unit_amount: 500, currency: 'usd' }],
    });
    const result = await syncProductsToStripe(
      [sampleProduct({ id: 'prod_existing', price: 20 })],
      mock.stripe
    );

    assert.equal(result.updated.length, 1);
    assert.equal(result.created.length, 0);
    assert.equal(mock.createdProducts.length, 0);
    assert.equal(mock.createdPrices.length, 1);
    assert.equal(mock.createdPrices[0]?.unit_amount, 2000);
    assert.equal(
      mock.updatedProducts.some((update) => update.data.default_price === 'price_new_1'),
      true
    );
  });

  it('reuses a matching active price instead of creating another', async () => {
    const mock = createMockStripe({
      existingPrices: [{ id: 'price_match', unit_amount: 1000, currency: 'usd' }],
    });
    const result = await syncProductsToStripe(
      [sampleProduct({ id: 'prod_existing' })],
      mock.stripe
    );

    assert.equal(result.updated.length, 1);
    assert.equal(mock.createdPrices.length, 0);
    assert.equal(
      mock.updatedProducts.some((update) => update.data.default_price === 'price_match'),
      true
    );
  });

  it('creates only when retrieve reports resource_missing', async () => {
    const missing = Object.assign(new Error('No such product'), { code: 'resource_missing' });
    const mock = createMockStripe({ retrieveError: missing });
    const result = await syncProductsToStripe(
      [sampleProduct({ id: 'prod_gone' })],
      mock.stripe
    );

    assert.equal(result.created.length, 1);
    assert.equal(result.updated.length, 0);
    assert.equal(mock.createdProducts.length, 1);
  });

  it('does not create a duplicate product when update of an existing product fails', async () => {
    const mock = createMockStripe({ updateError: new Error('invalid image') });
    const result = await syncProductsToStripe(
      [sampleProduct({ id: 'prod_existing', image_url: 'not-a-url' })],
      mock.stripe
    );

    assert.equal(result.created.length, 0);
    assert.equal(result.updated.length, 0);
    assert.equal(result.errors.length, 1);
    assert.equal(mock.createdProducts.length, 0);
    assert.match(result.errors[0]?.message ?? '', /invalid image/);
  });

  it('does not create a product when the price is invalid', async () => {
    const mock = createMockStripe();
    const result = await syncProductsToStripe(
      [sampleProduct({ price: Number.NaN })],
      mock.stripe
    );

    assert.equal(result.created.length, 0);
    assert.equal(result.errors.length, 1);
    assert.equal(mock.createdProducts.length, 0);
    assert.match(result.errors[0]?.message ?? '', /Invalid price/);
  });

  it('does not create a second product when price creation fails after product create', async () => {
    const mock = createMockStripe();
    mock.stripe.prices.create = (async () => {
      throw new Error('invalid unit_amount');
    }) as typeof mock.stripe.prices.create;

    const result = await syncProductsToStripe([sampleProduct()], mock.stripe);

    assert.equal(result.created.length, 0);
    assert.equal(result.errors.length, 1);
    assert.equal(mock.createdProducts.length, 1);
    assert.match(result.errors[0]?.message ?? '', /invalid unit_amount/);
  });

  it('records an error and continues when a later product is valid', async () => {
    const mock = createMockStripe({ updateError: new Error('rate limited') });
    const result = await syncProductsToStripe(
      [sampleProduct({ id: 'prod_existing', name: 'Broken' }), sampleProduct({ name: 'Ok' })],
      mock.stripe
    );

    assert.equal(result.errors.length, 1);
    assert.equal(result.created.length, 1);
    assert.equal(result.created[0]?.name, 'Ok');
  });
});

describe('getProductWithPrices', () => {
  it('puts the default price first so the storefront shows the synced amount', async () => {
    const stripe = {
      products: {
        retrieve: async () => ({
          id: 'prod_1',
          default_price: 'price_new',
        }),
      },
      prices: {
        list: async () => ({
          data: [
            { id: 'price_old', unit_amount: 500, currency: 'usd' },
            { id: 'price_new', unit_amount: 1000, currency: 'usd' },
          ],
        }),
      },
    } as unknown as Stripe;

    const result = await getProductWithPrices(stripe, 'prod_1');
    assert.equal(result.prices[0]?.id, 'price_new');
    assert.equal(result.prices[0]?.unit_amount, 1000);
  });
});
