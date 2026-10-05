import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  PRODUCTION_WEBHOOK_TYPES,
  UNHANDLED_PAYMENT_FAILURE_TYPES,
  productionAcknowledgesUnhandledType,
  productionHandlesWebhookType,
  shouldRecordPaymentFailure,
} from './connect-payment-failure-webhooks.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect webhook ignores one-time payment failures', () => {
  it('does not handle payment_intent.payment_failed or checkout.session.expired', () => {
    for (const type of UNHANDLED_PAYMENT_FAILURE_TYPES) {
      assert.equal(productionHandlesWebhookType(type), false);
      assert.equal(shouldRecordPaymentFailure(type), true);
    }
    assert.equal(productionAcknowledgesUnhandledType(), true);
    assert.deepEqual(PRODUCTION_WEBHOOK_TYPES, [
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
    ]);
  });

  it('still handles the documented subscription invoice success events', () => {
    for (const type of PRODUCTION_WEBHOOK_TYPES) {
      assert.equal(productionHandlesWebhookType(type), true);
      assert.equal(shouldRecordPaymentFailure(type), false);
    }
  });
});

describe('Connect payment-failure webhook source stays aligned', () => {
  it('/webhook switch omits payment_failed and session.expired then acks', () => {
    const connect = readRepo('stripe-connect-sample/server.ts');
    const start = connect.indexOf("app.post(\n  '/webhook'");
    const end = connect.indexOf('// V2 WEBHOOK HANDLING', start);
    const webhook = connect.slice(start, end);

    assert.match(webhook, /case 'customer\.subscription\.updated'/);
    assert.match(webhook, /case 'customer\.subscription\.deleted'/);
    assert.match(webhook, /case 'invoice\.payment_succeeded'/);
    assert.equal(webhook.includes('payment_intent.payment_failed'), false);
    assert.equal(webhook.includes('checkout.session.expired'), false);
    assert.equal(webhook.includes('payment_intent.canceled'), false);
    assert.match(webhook, /res\.json\(\{ received: true \}\)/);

    const dashboard = readRepo('stripe-connect-sample/public/index.html');
    const events = dashboard.slice(
      dashboard.indexOf('Set up these event listeners'),
      dashboard.indexOf('Webhook URL:')
    );
    assert.equal(events.includes('payment_intent.payment_failed'), false);
    assert.equal(events.includes('checkout.session.expired'), false);
  });
});
