import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  catalogCheckoutCustomerFields,
  connectCheckoutCustomerFields,
  hasPayerIdentity,
  mcpAbortsStripeOnClientClose,
  mcpSetsStripeTimeout,
  productionHasQuantityCap,
  productionQuantityOrDefault,
} from './checkout-customer-identity.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Checkout payer identity and quantity bounds', () => {
  it('catalog and Connect Checkout omit customer_email and receipt_email', () => {
    assert.equal(hasPayerIdentity(catalogCheckoutCustomerFields()), false);
    assert.equal(hasPayerIdentity(connectCheckoutCustomerFields()), false);
    assert.equal(catalogCheckoutCustomerFields().customer_email, undefined);
    assert.equal(connectCheckoutCustomerFields().receipt_email, undefined);
  });

  it('does not cap quantity; MCP money tools do not abort on disconnect', () => {
    assert.equal(productionQuantityOrDefault(undefined), 1);
    assert.equal(productionQuantityOrDefault(0), 1);
    assert.equal(productionQuantityOrDefault(1_000_000), 1_000_000);
    assert.equal(productionHasQuantityCap(), false);
    assert.equal(mcpAbortsStripeOnClientClose(), false);
    assert.equal(mcpSetsStripeTimeout(), false);
  });
});

describe('Checkout customer identity source stays aligned', () => {
  it('Checkout creates omit payer email; MCP has no req close or Stripe timeout', () => {
    const web = readRepo('src/web-server.ts');
    const connect = readRepo('stripe-connect-sample/server.ts');
    const index = readRepo('src/index.ts');

    const catalogCheckout = web.slice(web.indexOf("app.post('/api/checkout'"));
    assert.equal(catalogCheckout.includes('customer_email'), false);
    assert.equal(catalogCheckout.includes('receipt_email'), false);
    assert.equal(catalogCheckout.includes('customer:'), false);

    const paymentCheckoutStart = connect.indexOf('// Endpoint: POST /api/checkout');
    const paymentCheckoutEnd = connect.indexOf(
      '// 5. SUBSCRIPTIONS',
      paymentCheckoutStart
    );
    const connectCheckout = connect.slice(paymentCheckoutStart, paymentCheckoutEnd);
    assert.equal(connectCheckout.includes('customer_email'), false);
    assert.equal(connectCheckout.includes('receipt_email'), false);
    assert.match(connectCheckout, /quantity: quantity \|\| 1/);

    const piCreate = index.slice(index.indexOf("case 'create_payment_intent'"));
    assert.equal(index.includes("req.on('close'"), false);
    assert.equal(index.includes('timeout'), false);
    assert.equal(index.includes('maxNetworkRetries'), false);
    assert.match(piCreate, /paymentIntents\.create/);
  });
});
