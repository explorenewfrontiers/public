import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  CATALOG_CHECKOUT_PATH,
  CATALOG_WEBHOOK_PATHS,
  catalogCheckoutRequiresAuth,
  catalogCorsIsDefaultWideOpen,
  catalogWebsiteRegistersPaymentWebhook,
} from './catalog-fulfillment-cors.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('catalog website checkout fulfillment and CORS', () => {
  it('creates checkout sessions but never registers a payment webhook', () => {
    assert.equal(CATALOG_CHECKOUT_PATH, '/api/checkout');
    assert.deepEqual(CATALOG_WEBHOOK_PATHS, ['/webhook', '/webhook/thin']);
    assert.equal(catalogWebsiteRegistersPaymentWebhook(), false);
    assert.equal(catalogCheckoutRequiresAuth(), false);
  });

  it('enables default cors() with no origin allowlist', () => {
    assert.equal(catalogCorsIsDefaultWideOpen(), true);
  });
});

describe('catalog fulfillment/CORS source stays aligned', () => {
  it('posts checkout, uses cors() with no options, and has no webhook route', () => {
    const webServer = readRepo('src/web-server.ts');

    assert.match(webServer, /app\.use\(cors\(\)\);/);
    assert.equal(webServer.includes('origin:'), false);
    assert.match(webServer, /app\.post\('\/api\/checkout'/);
    assert.match(webServer, /mode: 'payment'/);
    assert.equal(webServer.includes("app.post('/webhook'"), false);
    assert.equal(webServer.includes('constructEvent'), false);
    assert.equal(webServer.includes('stripe-signature'), false);
    assert.equal(webServer.includes('authorization'), false);
    assert.equal(webServer.includes('MCP_API_KEY'), false);
  });
});
