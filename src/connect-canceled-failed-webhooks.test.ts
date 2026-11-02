import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  canceledPaymentIntentNeverCancelsFulfillment,
  dashboardDocumentsWebhookEvent,
  extractClassicWebhookHandler,
  extractDashboardWebhookDocs,
  failedChargeNeverUpdatesBooks,
  inspectCanceledFailedWebhookCases,
  sourceCallsPaymentIntentsCancel,
  webhookHandlesEventType,
} from './connect-canceled-failed-webhooks.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect /webhook ignores payment_intent.canceled and charge.failed', () => {
  it('a webhook without those cases leaves canceled auths and failed charges unhandled', () => {
    assert.equal(canceledPaymentIntentNeverCancelsFulfillment(false), true);
    assert.equal(canceledPaymentIntentNeverCancelsFulfillment(true), false);
    assert.equal(failedChargeNeverUpdatesBooks(false), true);
    assert.equal(failedChargeNeverUpdatesBooks(true), false);

    const handler = `
      switch (event.type) {
        case 'customer.subscription.updated': break;
        case 'payment_intent.canceled': break;
        case 'charge.failed': break;
      }
    `;
    assert.equal(webhookHandlesEventType(handler, 'payment_intent.canceled'), true);
    assert.equal(webhookHandlesEventType(handler, 'charge.failed'), true);
    // payment_intent.payment_failed is a declined attempt, not a cancel
    assert.equal(
      webhookHandlesEventType(handler, 'payment_intent.payment_failed'),
      false
    );
    // charge.expired / charge.refunded are other Charge events
    assert.equal(webhookHandlesEventType(handler, 'charge.expired'), false);
    assert.equal(webhookHandlesEventType(handler, 'charge.refunded'), false);
    assert.equal(
      webhookHandlesEventType(
        `case 'invoice.payment_failed':`,
        'charge.failed'
      ),
      false
    );
    assert.equal(
      sourceCallsPaymentIntentsCancel(`await stripe.paymentIntents.cancel(`),
      true
    );
    assert.equal(
      sourceCallsPaymentIntentsCancel(`await stripe.paymentIntents.create({`),
      false
    );
    assert.equal(
      sourceCallsPaymentIntentsCancel(`await stripe.paymentIntents.retrieve(`),
      false
    );
    assert.equal(
      dashboardDocumentsWebhookEvent(
        'Listen for payment_intent.canceled',
        'payment_intent.canceled'
      ),
      true
    );
    assert.equal(
      dashboardDocumentsWebhookEvent(
        'customer.subscription.updated',
        'payment_intent.canceled'
      ),
      false
    );
  });

  it('Connect /webhook handles subscription/invoice success but not PI cancel or charge.failed', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const webhook = extractClassicWebhookHandler(source);
    const cases = inspectCanceledFailedWebhookCases(webhook);

    assert.match(webhook, /['"]\/webhook['"]/);
    assert.match(webhook, /express\.raw/);
    assert.match(webhook, /webhooks\.constructEvent/);
    assert.equal(
      webhookHandlesEventType(webhook, 'customer.subscription.updated'),
      true
    );
    assert.equal(
      webhookHandlesEventType(webhook, 'customer.subscription.deleted'),
      true
    );
    assert.equal(
      webhookHandlesEventType(webhook, 'invoice.payment_succeeded'),
      true
    );
    assert.equal(cases.handlesPaymentIntentCanceled, false);
    assert.equal(cases.handlesPaymentIntentPaymentFailed, false);
    assert.equal(cases.handlesChargeFailed, false);
    assert.equal(cases.handlesChargeExpired, false);
    assert.equal(cases.handlesChargeRefunded, false);
    assert.equal(
      canceledPaymentIntentNeverCancelsFulfillment(
        cases.handlesPaymentIntentCanceled
      ),
      true
    );
    assert.equal(failedChargeNeverUpdatesBooks(cases.handlesChargeFailed), true);
    assert.equal(sourceCallsPaymentIntentsCancel(source), false);
  });

  it('dashboard webhook docs omit payment_intent.canceled and charge.failed', () => {
    const html = readRepo('stripe-connect-sample/public/index.html');
    const docs = extractDashboardWebhookDocs(html);

    assert.match(docs, /Webhook Setup/);
    assert.match(docs, /customer\.subscription\.updated/);
    assert.match(docs, /customer\.subscription\.deleted/);
    assert.match(docs, /invoice\.payment_succeeded/);
    assert.equal(
      dashboardDocumentsWebhookEvent(docs, 'payment_intent.canceled'),
      false
    );
    assert.equal(dashboardDocumentsWebhookEvent(docs, 'charge.failed'), false);
    assert.equal(
      dashboardDocumentsWebhookEvent(html, 'payment_intent.canceled'),
      false
    );
    assert.equal(dashboardDocumentsWebhookEvent(html, 'charge.failed'), false);
    assert.match(
      docs,
      /stripe listen --events customer\.subscription\.updated,customer\.subscription\.deleted,invoice\.payment_succeeded/
    );
  });
});
