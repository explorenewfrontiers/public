import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  MCP_STRIPE_API_VERSION,
  moneyCreatesUseIdempotencyKey,
  storefrontBuyDisablesButton,
} from './payment-idempotency.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('money creates have no idempotency or double-submit guard', () => {
  it('reports no idempotency keys and no buy-button disable', () => {
    assert.equal(moneyCreatesUseIdempotencyKey(), false);
    assert.equal(storefrontBuyDisablesButton(), false);
    assert.equal(MCP_STRIPE_API_VERSION, '2024-11-20');
  });
});

describe('payment idempotency source stays aligned', () => {
  it('creates payment intents, checkouts, and subscriptions without idempotencyKey', () => {
    const mcp = readRepo('src/index.ts');
    const server = readRepo('stripe-connect-sample/server.ts');
    const storefront = readRepo('stripe-connect-sample/public/storefront.html');
    const catalogApp = readRepo('public/app.js');
    const catalogServer = readRepo('src/web-server.ts');

    assert.match(mcp, /apiVersion: '2024-11-20'/);
    assert.match(mcp, /client\.paymentIntents\.create\(/);
    assert.match(mcp, /client\.customers\.create\(/);
    assert.equal(mcp.includes('idempotencyKey'), false);
    assert.equal(mcp.includes('idempotency_key'), false);

    assert.match(server, /stripeClient\.checkout\.sessions\.create\(/);
    assert.match(server, /stripeClient\.billingPortal\.sessions\.create\(/);
    assert.equal(server.includes('idempotencyKey'), false);
    assert.equal(server.includes('idempotency_key'), false);

    assert.match(catalogServer, /stripe\.checkout\.sessions\.create\(/);
    assert.equal(catalogServer.includes('idempotencyKey'), false);

    assert.match(storefront, /async function handlePurchase\(product\)/);
    assert.equal(storefront.includes('buyButton.disabled'), false);
    assert.equal(storefront.includes('disabled = true'), false);

    // Catalog checkout does disable its button; Connect storefront does not.
    assert.match(catalogApp, /checkoutBtn\.disabled = true;/);
  });
});
