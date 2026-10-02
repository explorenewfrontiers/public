import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  catalogApiLimit,
  listProductsSchemaHasStartingAfter,
  mappedProductList,
  mcpListProductsLimit,
  stripeProductListParams,
} from './product-list-page.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('catalog and MCP product list pagination', () => {
  it('forwards unclamped limits and drops has_more', () => {
    assert.equal(catalogApiLimit('500'), 500);
    assert.equal(catalogApiLimit('0'), 20);
    assert.equal(catalogApiLimit(undefined), 20);
    assert.equal(mcpListProductsLimit(500), 500);
    assert.equal(mcpListProductsLimit(0), 10);
    assert.equal(mcpListProductsLimit(undefined), 10);

    const params = stripeProductListParams(500);
    assert.deepEqual(params, { limit: 500, active: true });
    assert.equal('starting_after' in params, false);

    const mapped = mappedProductList({
      data: [{ id: 'prod_1' }, { id: 'prod_2' }],
      has_more: true,
    });
    assert.deepEqual(mapped, [{ id: 'prod_1' }, { id: 'prod_2' }]);
    assert.equal('has_more' in (mapped as object), false);

    assert.equal(
      listProductsSchemaHasStartingAfter({
        properties: {
          limit: { type: 'number' },
        },
      }),
      false
    );
  });
});

describe('product list pagination source stays aligned', () => {
  it('single-page list, no starting_after on list_products, website limit 50', () => {
    const catalog = readRepo('src/catalog.ts');
    const index = readRepo('src/index.ts');
    const webServer = readRepo('src/web-server.ts');
    const appJs = readRepo('public/app.js');

    assert.match(
      catalog,
      /const products = await stripe\.products\.list\(\{ limit, active: true \}\);\s*return products\.data;/
    );
    assert.equal(catalog.includes('has_more'), false);
    assert.equal(catalog.includes('starting_after'), false);

    assert.match(
      index,
      /'list_products':[\s\S]*required: \[\],\s*\},\s*\},/
    );
    const listProductsBlock = index.slice(
      index.indexOf("'list_products'"),
      index.indexOf("'get_product'")
    );
    assert.equal(listProductsBlock.includes('starting_after'), false);
    assert.match(
      index,
      /getStripeProducts\(client, \(input\.limit as number\) \|\| 10\)/
    );

    assert.match(
      webServer,
      /parseInt\(req\.query\.limit as string\) \|\| 20/
    );
    assert.equal(appJs.includes('/api/products?limit=50'), true);
    assert.equal(appJs.includes('starting_after'), false);
    assert.equal(appJs.includes('has_more'), false);
  });
});
