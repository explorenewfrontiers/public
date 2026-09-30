import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  CATALOG_CHECKOUT_PAYMENT_METHOD_TYPES,
  buildMcpPaymentIntentCreateParams,
  connectCheckoutSetsAutomaticPaymentMethods,
  connectCheckoutSetsPaymentMethodTypes,
  paymentIntentSpecifiesPaymentMethod,
} from './mcp-payment-method-params.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('MCP PaymentIntent payment-method params are omitted', () => {
  it('forwards amount/currency without payment_method_types or automatic_payment_methods', () => {
    const params = buildMcpPaymentIntentCreateParams({
      amount: 2500,
      currency: 'usd',
      customer: 'cus_1',
      description: 'Order',
    });

    assert.equal(params.amount, 2500);
    assert.equal(params.currency, 'usd');
    assert.equal('payment_method_types' in params, false);
    assert.equal('automatic_payment_methods' in params, false);
    assert.equal(paymentIntentSpecifiesPaymentMethod(params), false);
  });

  it('locks catalog Checkout to card-only and Connect Checkout to neither field', () => {
    assert.deepEqual(CATALOG_CHECKOUT_PAYMENT_METHOD_TYPES, ['card']);
    assert.equal(connectCheckoutSetsPaymentMethodTypes(), false);
    assert.equal(connectCheckoutSetsAutomaticPaymentMethods(), false);
  });
});

describe('payment-method source stays aligned', () => {
  it('MCP PI create, catalog Checkout, and Connect Checkout keep the current fields', () => {
    const index = readRepo('src/index.ts');
    const piStart = index.indexOf("case 'create_payment_intent':");
    const piEnd = index.indexOf('return intent;', piStart);
    const piBlock = index.slice(piStart, piEnd);
    assert.ok(piStart >= 0);
    assert.match(piBlock, /amount: input\.amount as number/);
    assert.match(piBlock, /currency: input\.currency as string/);
    assert.equal(piBlock.includes('payment_method_types'), false);
    assert.equal(piBlock.includes('automatic_payment_methods'), false);
    assert.match(index, /apiVersion: '2024-11-20'/);

    const web = readRepo('src/web-server.ts');
    assert.match(web, /payment_method_types: \['card'\]/);
    assert.equal(web.includes('automatic_payment_methods'), false);

    const connect = readRepo('stripe-connect-sample/server.ts');
    const checkoutAt = connect.indexOf("app.post('/api/checkout'");
    const checkout = connect.slice(checkoutAt, checkoutAt + 2200);
    assert.match(checkout, /mode: 'payment'/);
    assert.equal(checkout.includes('payment_method_types'), false);
    assert.equal(checkout.includes('automatic_payment_methods'), false);
  });
});
