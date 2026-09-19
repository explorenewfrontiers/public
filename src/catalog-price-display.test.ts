import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  catalogListPriceLabel,
  catalogModalAmount,
  formatCatalogUnitAmount,
  parseCatalogProductLimit,
} from './catalog-price-display.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('catalog unit_amount display', () => {
  it('formats a present amount in dollars', () => {
    assert.equal(formatCatalogUnitAmount(1999), '19.99');
    assert.equal(catalogListPriceLabel([{ unit_amount: 1999 }]), '$19.99');
    assert.equal(catalogModalAmount([{ unit_amount: 1999 }]), '19.99');
  });

  it('treats null unit_amount as $0.00 because null / 100 is 0', () => {
    assert.equal(formatCatalogUnitAmount(null), '0.00');
    assert.equal(catalogListPriceLabel([{ unit_amount: null }]), '$0.00');
    assert.equal(catalogModalAmount([{ unit_amount: null }]), '0.00');
  });

  it('leaves the list price unset (Loading...) when no prices exist', () => {
    assert.equal(catalogListPriceLabel([]), null);
    assert.equal(catalogListPriceLabel(undefined), null);
    assert.equal(catalogModalAmount([]), 'N/A');
  });
});

describe('catalog product list limit', () => {
  it('defaults to 20 for missing, zero, or non-numeric values', () => {
    assert.equal(parseCatalogProductLimit(undefined), 20);
    assert.equal(parseCatalogProductLimit(''), 20);
    assert.equal(parseCatalogProductLimit('abc'), 20);
    assert.equal(parseCatalogProductLimit('0'), 20);
  });

  it('forwards a negative limit to Stripe', () => {
    assert.equal(parseCatalogProductLimit('-5'), -5);
  });

  it('forwards a positive numeric limit', () => {
    assert.equal(parseCatalogProductLimit('5'), 5);
  });
});

describe('catalog price display source stays aligned', () => {
  it('list cards use unit_amount / 100 and leave Loading... when prices[0] is missing', () => {
    const appJs = readRepo('public/app.js');
    const webServer = readRepo('src/web-server.ts');

    assert.match(appJs, /const price = data\.prices\[0\];/);
    assert.match(appJs, /const amount = \(price\.unit_amount \/ 100\)\.toFixed\(2\);/);
    assert.match(appJs, /textContent = `\$\$\{amount\}`/);
    assert.match(appJs, /id="price-\$\{product\.id\}">Loading\.\.\./);
    assert.match(
      appJs,
      /const amount = price \? \(price\.unit_amount \/ 100\)\.toFixed\(2\) : 'N\/A'/
    );
    assert.match(webServer, /const limit = parseInt\(req\.query\.limit as string\) \|\| 20;/);
  });
});
