import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  catalogCheckoutSession,
  connectCheckoutSession,
  hasFulfillmentIdentity,
} from './checkout-fulfillment.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Checkout sessions omit fulfillment identity', () => {
  it('catalog Checkout has no metadata or client_reference_id', () => {
    const session = catalogCheckoutSession({
      items: [{ priceId: 'price_1', quantity: 2 }],
      domain: 'http://localhost:3000',
    });

    assert.equal(session.metadata, undefined);
    assert.equal(session.client_reference_id, undefined);
    assert.equal(hasFulfillmentIdentity(session), false);
    assert.equal(session.mode, 'payment');
  });

  it('Connect Checkout has no metadata or client_reference_id', () => {
    const session = connectCheckoutSession({
      accountId: 'acct_1',
      priceId: 'price_1',
      quantity: 1,
      domain: 'http://localhost:3000',
    });

    assert.equal(session.metadata, undefined);
    assert.equal(session.client_reference_id, undefined);
    assert.equal(hasFulfillmentIdentity(session), false);
  });
});

describe('Checkout fulfillment source stays aligned', () => {
  it('catalog and Connect Checkout creates never set metadata or client_reference_id', () => {
    const webServer = readRepo('src/web-server.ts');
    const connect = readRepo('stripe-connect-sample/server.ts');
    const catalogApp = readRepo('public/app.js');

    const catalogCheckout = webServer.slice(webServer.indexOf("app.post('/api/checkout'"));
    assert.equal(catalogCheckout.includes('client_reference_id'), false);
    assert.equal(catalogCheckout.includes('metadata:'), false);
    assert.match(webServer, /app\.post\('\/api\/checkout'/);
    assert.equal(webServer.includes('/webhook'), false);

    assert.equal(connect.includes('client_reference_id'), false);
    const paymentCheckoutStart = connect.indexOf(
      '// Endpoint: POST /api/checkout'
    );
    const paymentCheckoutEnd = connect.indexOf(
      '// 5. SUBSCRIPTIONS',
      paymentCheckoutStart
    );
    const connectCheckoutCreate = connect.slice(
      paymentCheckoutStart,
      paymentCheckoutEnd
    );
    assert.match(connectCheckoutCreate, /checkout\.sessions\.create/);
    assert.equal(connectCheckoutCreate.includes('metadata:'), false);

    assert.equal(catalogApp.includes('client_reference_id'), false);
  });
});
