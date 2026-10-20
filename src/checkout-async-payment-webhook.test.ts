import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  CONNECT_WEBHOOK_ASYNC_CHECKOUT_EVENTS,
  delayedCheckoutNeverFulfillsOrRevokes,
  extractPaymentCheckoutCreates,
  extractWebhookSwitch,
  sourceOffersUnrestrictedPaymentMethods,
  webhookHandlesAsyncCheckoutEvent,
} from './checkout-async-payment-webhook.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect Checkout can offer delayed methods; webhook ignores async payment events', () => {
  it('missing async succeeded/failed handlers leave delayed Checkout unfulfilled', () => {
    assert.equal(
      delayedCheckoutNeverFulfillsOrRevokes({
        handlesAsyncSucceeded: false,
        handlesAsyncFailed: false,
      }),
      true
    );
    assert.equal(
      delayedCheckoutNeverFulfillsOrRevokes({
        handlesAsyncSucceeded: true,
        handlesAsyncFailed: false,
      }),
      false
    );
    assert.equal(
      delayedCheckoutNeverFulfillsOrRevokes({
        handlesAsyncSucceeded: false,
        handlesAsyncFailed: true,
      }),
      false
    );

    assert.equal(
      webhookHandlesAsyncCheckoutEvent(
        "case 'checkout.session.async_payment_succeeded':",
        'checkout.session.async_payment_succeeded'
      ),
      true
    );
    assert.equal(
      webhookHandlesAsyncCheckoutEvent(
        "case 'checkout.session.async_payment_failed':",
        'checkout.session.async_payment_failed'
      ),
      true
    );
    assert.equal(
      webhookHandlesAsyncCheckoutEvent(
        "case 'checkout.session.completed':",
        'checkout.session.async_payment_succeeded'
      ),
      false
    );
    assert.equal(
      webhookHandlesAsyncCheckoutEvent(
        "case 'checkout.session.expired':",
        'checkout.session.async_payment_failed'
      ),
      false
    );
    assert.deepEqual(CONNECT_WEBHOOK_ASYNC_CHECKOUT_EVENTS, [
      'checkout.session.async_payment_succeeded',
      'checkout.session.async_payment_failed',
    ]);
  });

  it('Connect payment Checkout omits payment_method_types so delayed methods stay eligible', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const checkout = extractPaymentCheckoutCreates(source);

    assert.match(checkout, /checkout\.sessions\.create/);
    assert.match(checkout, /mode:\s*['"]payment['"]/);
    assert.doesNotMatch(checkout, /mode:\s*['"]subscription['"]/);
    assert.equal(/payment_method_types\s*:/.test(checkout), false);
    assert.equal(sourceOffersUnrestrictedPaymentMethods(source), true);
  });

  it('Connect /webhook switch never handles async_payment_succeeded or async_payment_failed', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const webhook = extractWebhookSwitch(source);

    assert.match(webhook, /switch\s*\(\s*event\.type\s*\)/);
    assert.match(webhook, /customer\.subscription\.updated/);
    assert.match(webhook, /invoice\.payment_succeeded/);
    assert.equal(
      webhookHandlesAsyncCheckoutEvent(source, 'checkout.session.async_payment_succeeded'),
      false
    );
    assert.equal(
      webhookHandlesAsyncCheckoutEvent(source, 'checkout.session.async_payment_failed'),
      false
    );
    assert.equal(
      delayedCheckoutNeverFulfillsOrRevokes({
        handlesAsyncSucceeded: webhookHandlesAsyncCheckoutEvent(
          source,
          'checkout.session.async_payment_succeeded'
        ),
        handlesAsyncFailed: webhookHandlesAsyncCheckoutEvent(
          source,
          'checkout.session.async_payment_failed'
        ),
      }),
      true
    );
  });
});
