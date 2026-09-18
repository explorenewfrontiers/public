import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type Stripe from 'stripe';
import {
  matchExistingProduct,
  syncProductsToStripe,
  type ProductRow,
} from './catalog.js';

describe('matchExistingProduct', () => {
  const catalog = [
    { id: 'prod_map', name: 'Trail Map', metadata: { sku: 'MAP-1', category: '' } },
    { id: 'prod_mug', name: 'Enamel Mug', metadata: { sku: '', category: 'camp' } },
    { id: 'prod_blank', name: 'Sticker', metadata: { sku: '', category: '' } },
  ];

  it('matches a row to an existing product by SKU', () => {
    const match = matchExistingProduct(catalog, {
      name: 'Trail Map (2026)',
      price: 12,
      sku: 'MAP-1',
    });
    assert.equal(match?.id, 'prod_map');
  });

  it('falls back to an exact name when SKU is missing', () => {
    const match = matchExistingProduct(catalog, {
      name: 'Enamel Mug',
      price: 18,
    });
    assert.equal(match?.id, 'prod_mug');
  });

  it('does not treat empty SKUs as a match', () => {
    const match = matchExistingProduct(catalog, {
      name: 'New Patch',
      price: 5,
      sku: '',
    });
    assert.equal(match, undefined);
  });

  it('returns undefined when nothing matches', () => {
    const match = matchExistingProduct(catalog, {
      name: 'Lantern',
      price: 30,
      sku: 'LAN-9',
    });
    assert.equal(match, undefined);
  });
});

function createMockStripe(existingProducts: Array<Partial<Stripe.Product>> = []) {
  const createdProducts: Array<Record<string, unknown>> = [];
  const updatedProducts: Array<{ id: string; data: Record<string, unknown> }> = [];
  const createdPrices: Array<Record<string, unknown>> = [];
  const archivedPrices: string[] = [];
  let productSeq = 0;
  let priceSeq = 0;
  const pricesByProduct = new Map<string, Array<Partial<Stripe.Price>>>([
    ['prod_map', [{ id: 'price_old', unit_amount: 1000, currency: 'usd' }]],
  ]);

  const stripe = {
    products: {
      list: async () => ({
        data: existingProducts,
        has_more: false,
      }),
      retrieve: async (id: string) => ({ id, name: 'Existing' }),
      create: async (data: Record<string, unknown>) => {
        productSeq += 1;
        const product = { id: `prod_new_${productSeq}`, ...data };
        createdProducts.push(product);
        return product;
      },
      update: async (id: string, data: Record<string, unknown>) => {
        updatedProducts.push({ id, data });
        return { id, name: data.name, ...data };
      },
    },
    prices: {
      list: async (params: { product: string }) => ({
        data: pricesByProduct.get(params.product) ?? [],
      }),
      create: async (data: Record<string, unknown>) => {
        priceSeq += 1;
        const price = { id: `price_new_${priceSeq}`, ...data };
        createdPrices.push(price);
        return price;
      },
      update: async (id: string, data: { active?: boolean }) => {
        if (data.active === false) {
          archivedPrices.push(id);
        }
        return { id, ...data };
      },
    },
  };

  return {
    stripe: stripe as unknown as Stripe,
    createdProducts,
    updatedProducts,
    createdPrices,
    archivedPrices,
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

describe('syncProductsToStripe without a spreadsheet ID', () => {
  it('updates the existing SKU instead of creating a duplicate on re-sync', async () => {
    const mock = createMockStripe([
      { id: 'prod_map', name: 'Trail Map', metadata: { sku: 'MAP-1' } },
    ]);

    const result = await syncProductsToStripe(
      [sampleProduct({ price: 20 })],
      mock.stripe
    );

    assert.equal(result.created.length, 0);
    assert.equal(result.updated.length, 1);
    assert.equal(result.updated[0]?.id, 'prod_map');
    assert.equal(mock.createdProducts.length, 0);
    assert.equal(mock.createdPrices.length, 1);
    assert.equal(mock.createdPrices[0]?.unit_amount, 2000);
    assert.deepEqual(mock.archivedPrices, ['price_old']);
  });

  it('still creates a product when the catalog has no SKU or name match', async () => {
    const mock = createMockStripe([
      { id: 'prod_map', name: 'Trail Map', metadata: { sku: 'MAP-1' } },
    ]);

    const result = await syncProductsToStripe(
      [sampleProduct({ name: 'Lantern', sku: 'LAN-9', metadata: { sku: 'LAN-9', category: '' } })],
      mock.stripe
    );

    assert.equal(result.created.length, 1);
    assert.equal(result.updated.length, 0);
    assert.equal(mock.createdProducts.length, 1);
    assert.equal(mock.createdPrices.length, 1);
  });
});
