import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import XLSX from 'xlsx';
import type Stripe from 'stripe';
import {
  defaultProductName,
  defaultProductPrice,
  parseCurrencyCell,
  updateFailureCreatesDuplicateProduct,
} from './catalog-row-integrity.js';
import { parseProductCatalog, syncProductsToStripe } from './catalog.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function writeTempWorkbook(rows: Record<string, unknown>[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-row-'));
  const filePath = path.join(dir, 'catalog.xlsx');
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Products');
  XLSX.writeFile(workbook, filePath);
  return filePath;
}

describe('catalog currency and empty-row defaults', () => {
  it('throws when Currency is a number (Excel numeric ISO code)', () => {
    assert.throws(() => parseCurrencyCell(840), TypeError);
    assert.equal(parseCurrencyCell(undefined), 'usd');
    assert.equal(parseCurrencyCell('EUR'), 'eur');
  });

  it('turns a missing name/price into Unnamed Product at $0', () => {
    assert.equal(defaultProductName(''), 'Unnamed Product');
    assert.equal(defaultProductName(undefined), 'Unnamed Product');
    assert.equal(defaultProductPrice(undefined), 0);
    assert.equal(defaultProductPrice(''), 0);
    assert.equal(updateFailureCreatesDuplicateProduct(), true);
  });

  it('parseProductCatalog throws on a numeric Currency column', async () => {
    const filePath = writeTempWorkbook([
      { Name: 'Coffee', Price: 10, Currency: 840 },
    ]);
    await assert.rejects(() => parseProductCatalog(filePath), TypeError);
  });

  it('parseProductCatalog creates an Unnamed $0 row from category-only data', async () => {
    const filePath = writeTempWorkbook([{ Category: 'Misc', SKU: 'x' }]);
    const rows = await parseProductCatalog(filePath);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.name, 'Unnamed Product');
    assert.equal(rows[0]?.price, 0);
    assert.equal(rows[0]?.currency, 'usd');
    assert.equal(rows[0]?.metadata?.category, 'Misc');
  });
});

describe('catalog sync update failure creates a duplicate', () => {
  it('creates a new product when retrieve succeeds and update rejects', async () => {
    const created: Array<{ id: string; name: string }> = [];
    const stripe = {
      products: {
        retrieve: async () => ({ id: 'prod_existing', name: 'Old' }),
        update: async () => {
          throw new Error('invalid image');
        },
        create: async (params: { name: string }) => {
          const product = { id: 'prod_duplicate', name: params.name };
          created.push(product);
          return product;
        },
      },
      prices: {
        create: async () => ({ id: 'price_duplicate' }),
      },
    };

    const originalError = console.error;
    console.error = () => {};
    let result: Awaited<ReturnType<typeof syncProductsToStripe>>;
    try {
      result = await syncProductsToStripe(
        [
          {
            id: 'prod_existing',
            name: 'Coffee',
            price: 12.5,
            currency: 'usd',
            image_url: 'https://example.test/broken.png',
          },
        ],
        stripe as unknown as Stripe
      );
    } finally {
      console.error = originalError;
    }

    assert.equal(result.updated.length, 0);
    assert.equal(result.created.length, 1);
    assert.equal(result.created[0]?.id, 'prod_duplicate');
    assert.equal(created.length, 1);
  });
});

describe('catalog row-integrity source stays aligned', () => {
  it('lowercases Currency without a type guard and always creates on catch', () => {
    const catalog = readRepo('src/catalog.ts');

    assert.match(
      catalog,
      /currency: \(\(row\['Currency'\] \|\| row\['currency'\] \|\| 'usd'\) as string\)\.toLowerCase\(\)/
    );
    assert.match(catalog, /name: \(row\['Name'\] \|\| row\['name'\] \|\| 'Unnamed Product'\) as string/);
    assert.match(
      catalog,
      /price: parseFloat\(\(row\['Price'\] \|\| row\['price'\] \|\| '0'\) as string\)/
    );
    assert.match(catalog, /\/\/ Create new product if update failed/);
    assert.match(catalog, /created\.push\(stripeProduct\)/);
  });
});
