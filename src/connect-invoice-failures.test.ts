import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  CONNECT_HANDLED_INVOICE_EVENTS,
  CONNECT_UNHANDLED_SUBSCRIPTION_INVOICE_EVENTS,
  classifyConnectInvoiceEvent,
  failedInvoiceRevokesAccess,
} from './connect-invoice-failures.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect subscription invoice failure routing', () => {
  it('handles only invoice.payment_succeeded', () => {
    assert.deepEqual(CONNECT_HANDLED_INVOICE_EVENTS, ['invoice.payment_succeeded']);
    assert.equal(classifyConnectInvoiceEvent('invoice.payment_succeeded'), 'invoice.payment_succeeded');
  });

  it('leaves payment_failed and payment_action_required unhandled', () => {
    assert.deepEqual(CONNECT_UNHANDLED_SUBSCRIPTION_INVOICE_EVENTS, [
      'invoice.payment_failed',
      'invoice.payment_action_required',
    ]);

    for (const eventType of CONNECT_UNHANDLED_SUBSCRIPTION_INVOICE_EVENTS) {
      assert.equal(classifyConnectInvoiceEvent(eventType), 'unhandled');
      assert.equal(failedInvoiceRevokesAccess(eventType), false);
    }

    assert.equal(failedInvoiceRevokesAccess('invoice.payment_succeeded'), false);
    assert.equal(classifyConnectInvoiceEvent('invoice.overdue'), 'unhandled');
  });
});

describe('Connect invoice failure source stays aligned', () => {
  it('switches on payment_succeeded and does not handle failed invoices', () => {
    const server = readRepo('stripe-connect-sample/server.ts');
    const dashboard = readRepo('stripe-connect-sample/public/index.html');

    assert.match(server, /case 'invoice\.payment_succeeded':/);
    assert.equal(server.includes("case 'invoice.payment_failed'"), false);
    assert.equal(server.includes("case 'invoice.payment_action_required'"), false);
    assert.match(server, /console\.log\(`Unhandled event type: \$\{event\.type\}`\)/);

    assert.match(dashboard, /invoice\.payment_succeeded/);
    assert.equal(dashboard.includes('invoice.payment_failed'), false);
    assert.equal(dashboard.includes('invoice.payment_action_required'), false);
  });
});
