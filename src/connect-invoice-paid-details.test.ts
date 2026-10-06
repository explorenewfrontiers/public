import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  productionInvoiceHandlerReadsAmountPaid,
  productionInvoiceHandlerReadsBillingReason,
  shouldGrantAccessFromInvoice,
} from './connect-invoice-paid-details.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('invoice.payment_succeeded ignores amount and billing reason', () => {
  it('would not grant access for $0 or unpaid invoices', () => {
    assert.equal(
      shouldGrantAccessFromInvoice({
        id: 'in_paid',
        paid: true,
        amount_paid: 1500,
        billing_reason: 'subscription_cycle',
        status: 'paid',
      }),
      true
    );
    assert.equal(
      shouldGrantAccessFromInvoice({
        id: 'in_zero',
        paid: true,
        amount_paid: 0,
        billing_reason: 'subscription_create',
        status: 'paid',
      }),
      false
    );
    assert.equal(
      shouldGrantAccessFromInvoice({
        id: 'in_open',
        paid: false,
        amount_paid: 0,
        status: 'open',
      }),
      false
    );
    assert.equal(productionInvoiceHandlerReadsAmountPaid(), false);
    assert.equal(productionInvoiceHandlerReadsBillingReason(), false);
  });
});

describe('invoice.payment_succeeded source stays aligned', () => {
  it('logs invoice.id only and never reads amount_paid or billing_reason', () => {
    const connect = readRepo('stripe-connect-sample/server.ts');
    const start = connect.indexOf("case 'invoice.payment_succeeded'");
    assert.notEqual(start, -1);
    const end = connect.indexOf('default:', start);
    const handler = connect.slice(start, end);

    assert.match(handler, /console\.log\('Invoice paid:', invoice\.id\)/);
    assert.equal(handler.includes('amount_paid'), false);
    assert.equal(handler.includes('billing_reason'), false);
    assert.equal(handler.includes('invoice.paid'), false);
    assert.equal(handler.includes('invoice.status'), false);
  });
});
