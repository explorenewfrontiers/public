import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  CATALOG_STOREFRONT_PRODUCT_LIMIT,
  catalogPageLoadExceedsTypicalReadBudget,
  extractProductListCall,
  getProductWithPricesStripeCalls,
  getStripeProductsExpandsPrices,
  storefrontFetchesPricePerProduct,
  storefrontListLimit,
  stripeApiCallsForCatalogPageLoad,
} from './catalog-nplusone-prices.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Catalog storefront N+1s Stripe price reads on every shop load', () => {
  it('an unexpanded list plus per-product retrieve/prices.list is 1 + 2N calls', () => {
    assert.equal(CATALOG_STOREFRONT_PRODUCT_LIMIT, 50);
    assert.equal(getProductWithPricesStripeCalls(), 2);

    assert.equal(
      stripeApiCallsForCatalogPageLoad({
        productCount: 50,
        listExpandsPrices: false,
        detailStripeCallsPerProduct: 2,
      }),
      101
    );
    assert.equal(
      stripeApiCallsForCatalogPageLoad({
        productCount: 50,
        listExpandsPrices: true,
        detailStripeCallsPerProduct: 2,
      }),
      1
    );
    assert.equal(
      catalogPageLoadExceedsTypicalReadBudget({
        stripeCalls: 101,
        readBudgetPerSecond: 100,
      }),
      true
    );
    assert.equal(
      catalogPageLoadExceedsTypicalReadBudget({
        stripeCalls: 1,
        readBudgetPerSecond: 100,
      }),
      false
    );
  });

  it('getStripeProducts lists without expand; getProductWithPrices does retrieve + prices.list', () => {
    const catalog = readRepo('src/catalog.ts');
    const listCall = extractProductListCall(catalog);

    assert.match(listCall, /products\.list/);
    assert.match(listCall, /active:\s*true/);
    assert.doesNotMatch(listCall, /expand\s*:/);
    assert.equal(getStripeProductsExpandsPrices(catalog), false);
    assert.match(catalog, /products\.retrieve\s*\(\s*productId\s*\)/);
    assert.match(catalog, /prices\.list\s*\(\s*\{\s*product:\s*productId/);
    assert.equal(getProductWithPricesStripeCalls(), 2);
  });

  it('public/app.js fetches limit=50 then loadProductPrice for every card (101 Stripe calls)', () => {
    const appJs = readRepo('public/app.js');
    const web = readRepo('src/web-server.ts');
    const catalog = readRepo('src/catalog.ts');

    assert.equal(storefrontListLimit(appJs), CATALOG_STOREFRONT_PRODUCT_LIMIT);
    assert.equal(storefrontFetchesPricePerProduct(appJs), true);
    assert.match(web, /app\.get\(\s*['"]\/api\/products['"]/);
    assert.match(web, /app\.get\(\s*['"]\/api\/products\/:productId['"]/);
    assert.match(web, /getStripeProducts/);
    assert.match(web, /getProductWithPrices/);

    const calls = stripeApiCallsForCatalogPageLoad({
      productCount: storefrontListLimit(appJs) ?? 0,
      listExpandsPrices: getStripeProductsExpandsPrices(catalog),
      detailStripeCallsPerProduct: getProductWithPricesStripeCalls(),
    });
    assert.equal(calls, 101);
    assert.equal(
      catalogPageLoadExceedsTypicalReadBudget({
        stripeCalls: calls,
        readBudgetPerSecond: 100,
      }),
      true
    );
  });
});
