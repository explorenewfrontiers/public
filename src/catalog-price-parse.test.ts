import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import XLSX from 'xlsx';
import {
  catalogUnitAmountCents,
  mapCheckoutLineItem,
  normalizeCatalogCurrency,
  parseCatalogPrice,
} from './catalog-price-parse.js';
import { parseProductCatalog } from './catalog.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function writeWorkbook(rows: Record<string, unknown>[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-price-'));
  const filePath = path.join(dir, 'catalog.xlsx');
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Products');
  XLSX.writeFile(workbook, filePath);
  return filePath;
}

describe('catalog Excel money parse', () => {
  it('turns currency-formatted and thousands-separated prices into the wrong cents', () => {
    assert.ok(Number.isNaN(parseCatalogPrice('$10.00')));
    assert.equal(parseCatalogPrice('1,299.00'), 1);
    assert.equal(parseCatalogPrice('10,50'), 10);
    assert.equal(parseCatalogPrice(10.99), 10.99);
    assert.equal(parseCatalogPrice(''), 0);
    assert.equal(parseCatalogPrice(undefined), 0);

    assert.ok(Number.isNaN(catalogUnitAmountCents(parseCatalogPrice('$10.00'))));
    assert.equal(catalogUnitAmountCents(parseCatalogPrice('1,299.00')), 100);
    assert.equal(catalogUnitAmountCents(10.99), 1099);
  });

  it('lowercases currency but does not trim whitespace', () => {
    assert.equal(normalizeCatalogCurrency('USD'), 'usd');
    assert.equal(normalizeCatalogCurrency(' USD '), ' usd ');
    assert.equal(normalizeCatalogCurrency(''), 'usd');
    assert.equal(normalizeCatalogCurrency(undefined), 'usd');
  });

  it('forwards a missing or blank checkout priceId to Stripe', () => {
    assert.deepEqual(mapCheckoutLineItem({ quantity: 1 }), {
      price: undefined,
      quantity: 1,
    });
    assert.deepEqual(mapCheckoutLineItem({ priceId: '', quantity: 2 }), {
      price: '',
      quantity: 2,
    });
    assert.deepEqual(mapCheckoutLineItem({ priceId: 'price_1', quantity: 1 }), {
      price: 'price_1',
      quantity: 1,
    });
  });

  it('parseProductCatalog keeps a $ prefixed Price as NaN and padded currency as-is', async () => {
    const filePath = writeWorkbook([
      { Name: 'Mug', Price: '$10.00', Currency: ' USD ' },
      { Name: 'Bag', Price: '1,299.00', Currency: 'usd' },
    ]);
    const rows = await parseProductCatalog(filePath);
    assert.equal(rows.length, 2);
    assert.ok(Number.isNaN(rows[0]?.price));
    assert.equal(rows[0]?.currency, ' usd ');
    assert.equal(rows[1]?.price, 1);
    assert.equal(rows[1]?.currency, 'usd');
  });
});

describe('catalog money parse source stays aligned', () => {
  it('uses parseFloat + toLowerCase and maps priceId without a required check', () => {
    const catalog = readRepo('src/catalog.ts');
    const web = readRepo('src/web-server.ts');

    assert.match(
      catalog,
      /price: parseFloat\(\(row\['Price'\] \|\| row\['price'\] \|\| '0'\) as string\)/
    );
    assert.match(
      catalog,
      /currency: \(\(row\['Currency'\] \|\| row\['currency'\] \|\| 'usd'\) as string\)\.toLowerCase\(\)/
    );
    assert.match(catalog, /unit_amount: Math\.round\(product\.price \* 100\)/);
    assert.equal(catalog.includes('.trim()'), false);
    assert.equal(catalog.includes('replace(/[^0-9.]/g'), false);

    assert.match(web, /price: item\.priceId,/);
    assert.match(web, /quantity: item\.quantity,/);
    assert.equal(web.includes('item.priceId &&'), false);
  });
});
