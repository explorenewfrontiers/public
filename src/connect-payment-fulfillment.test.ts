import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  CONNECT_CHECKOUT_MODE,
  CONNECT_HANDLED_WEBHOOK_TYPES,
  CONNECT_ONE_TIME_PAYMENT_EVENTS,
  DASHBOARD_ACCOUNT_FIELDS_NOT_AUTOFILLED,
  DASHBOARD_AUTOFILL_ACCOUNT_FIELDS,
  classifyConnectWebhookType,
  isUnhandledOneTimePaymentEvent,
} from './connect-payment-fulfillment.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect one-time payment webhook classification', () => {
  it('handles only subscription update/delete and invoice.payment_succeeded', () => {
    assert.deepEqual(CONNECT_HANDLED_WEBHOOK_TYPES, [
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
    ]);

    for (const eventType of CONNECT_HANDLED_WEBHOOK_TYPES) {
      assert.equal(classifyConnectWebhookType(eventType), eventType);
    }
  });

  it('leaves checkout.session.completed and payment_intent.succeeded unhandled', () => {
    assert.deepEqual(CONNECT_ONE_TIME_PAYMENT_EVENTS, [
      'checkout.session.completed',
      'payment_intent.succeeded',
    ]);

    for (const eventType of CONNECT_ONE_TIME_PAYMENT_EVENTS) {
      assert.equal(classifyConnectWebhookType(eventType), 'unhandled');
      assert.equal(isUnhandledOneTimePaymentEvent(eventType), true);
    }

    assert.equal(isUnhandledOneTimePaymentEvent('invoice.payment_succeeded'), false);
    assert.equal(classifyConnectWebhookType('charge.succeeded'), 'unhandled');
  });
});

describe('Connect payment fulfillment source stays aligned', () => {
  it('creates payment-mode Checkout Sessions but does not switch on those events', () => {
    const server = readRepo('stripe-connect-sample/server.ts');
    const dashboard = readRepo('stripe-connect-sample/public/index.html');

    assert.match(server, /mode: 'payment'/);
    assert.equal(CONNECT_CHECKOUT_MODE, 'payment');
    assert.match(server, /case 'customer\.subscription\.updated':/);
    assert.match(server, /case 'customer\.subscription\.deleted':/);
    assert.match(server, /case 'invoice\.payment_succeeded':/);
    assert.equal(server.includes("case 'checkout.session.completed'"), false);
    assert.equal(server.includes("case 'payment_intent.succeeded'"), false);
    assert.match(server, /console\.log\(`Unhandled event type: \$\{event\.type\}`\)/);

    assert.match(dashboard, /customer\.subscription\.updated/);
    assert.match(dashboard, /invoice\.payment_succeeded/);
    assert.equal(dashboard.includes('checkout.session.completed'), false);
    assert.equal(dashboard.includes('payment_intent.succeeded'), false);
  });

  it('copies a new account id into onboarding/product/storefront, not subscription or billing', () => {
    const dashboard = readRepo('stripe-connect-sample/public/index.html');

    for (const fieldId of DASHBOARD_AUTOFILL_ACCOUNT_FIELDS) {
      assert.match(
        dashboard,
        new RegExp(`getElementById\\('${fieldId}'\\)\\.value\\s*=\\s*result\\.accountId`)
      );
    }

    for (const fieldId of DASHBOARD_ACCOUNT_FIELDS_NOT_AUTOFILLED) {
      assert.equal(
        new RegExp(
          `getElementById\\('${fieldId}'\\)\\.value\\s*=\\s*result\\.accountId`
        ).test(dashboard),
        false,
        `${fieldId} should not be auto-populated after account creation`
      );
      assert.match(dashboard, new RegExp(`id="${fieldId}"`));
    }
  });
});
