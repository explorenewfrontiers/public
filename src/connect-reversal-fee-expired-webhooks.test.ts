import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  dashboardDocumentsWebhookEvent,
  expiredChargeNeverCancelsFulfillment,
  extractClassicWebhookHandler,
  extractDashboardWebhookDocs,
  inspectReversalFeeExpiredWebhookCases,
  refundedApplicationFeeNeverUpdatesBooks,
  reversedTransferLeavesSellerPaid,
  sourceCallsApplicationFeesRefund,
  webhookHandlesEventType,
} from './connect-reversal-fee-expired-webhooks.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect /webhook ignores transfer.reversed, application_fee.refunded, and charge.expired', () => {
  it('missing reversal/fee-refund/expiry handlers leave sellers paid and books stale', () => {
    assert.equal(reversedTransferLeavesSellerPaid(false), true);
    assert.equal(reversedTransferLeavesSellerPaid(true), false);
    assert.equal(refundedApplicationFeeNeverUpdatesBooks(false), true);
    assert.equal(refundedApplicationFeeNeverUpdatesBooks(true), false);
    assert.equal(expiredChargeNeverCancelsFulfillment(false), true);
    assert.equal(expiredChargeNeverCancelsFulfillment(true), false);

    assert.equal(
      webhookHandlesEventType(`case 'transfer.reversed':`, 'transfer.reversed'),
      true
    );
    assert.equal(
      webhookHandlesEventType(
        `case 'application_fee.refunded':`,
        'application_fee.refunded'
      ),
      true
    );
    assert.equal(
      webhookHandlesEventType(`case 'charge.expired':`, 'charge.expired'),
      true
    );
    // transfer.failed (#72) is not a later reversal
    assert.equal(
      webhookHandlesEventType(`case 'transfer.failed':`, 'transfer.reversed'),
      false
    );
    // charge.refunded (#23) is not an application-fee refund
    assert.equal(
      webhookHandlesEventType(
        `case 'charge.refunded':`,
        'application_fee.refunded'
      ),
      false
    );
    // checkout.session.expired (#40) is not charge expiry
    assert.equal(
      webhookHandlesEventType(`case 'checkout.session.expired':`, 'charge.expired'),
      false
    );
    assert.equal(
      sourceCallsApplicationFeesRefund(`await stripe.applicationFees.refund(`),
      true
    );
    assert.equal(
      sourceCallsApplicationFeesRefund(`await stripe.refunds.create({`),
      false
    );
    assert.equal(
      dashboardDocumentsWebhookEvent(
        '<li>transfer.reversed</li>',
        'transfer.reversed'
      ),
      true
    );
    assert.equal(
      dashboardDocumentsWebhookEvent(
        '<li>invoice.payment_succeeded</li>',
        'application_fee.refunded'
      ),
      false
    );
  });

  it('Connect /webhook handles payment_succeeded but not reversal, fee refund, or charge expiry', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const webhook = extractClassicWebhookHandler(source);
    const cases = inspectReversalFeeExpiredWebhookCases(webhook);

    assert.match(webhook, /constructEvent/);
    assert.doesNotMatch(webhook, /parseThinEvent/);
    assert.equal(
      webhookHandlesEventType(webhook, 'invoice.payment_succeeded'),
      true
    );
    assert.equal(cases.handlesTransferFailed, false);
    assert.equal(cases.handlesTransferReversed, false);
    assert.equal(cases.handlesApplicationFeeRefunded, false);
    assert.equal(cases.handlesChargeExpired, false);
    assert.equal(webhookHandlesEventType(webhook, 'transfer.reversed'), false);
    assert.equal(
      webhookHandlesEventType(webhook, 'application_fee.refunded'),
      false
    );
    assert.equal(webhookHandlesEventType(webhook, 'charge.expired'), false);
    assert.equal(sourceCallsApplicationFeesRefund(source), false);
    assert.equal(
      reversedTransferLeavesSellerPaid(cases.handlesTransferReversed),
      true
    );
    assert.equal(
      refundedApplicationFeeNeverUpdatesBooks(cases.handlesApplicationFeeRefunded),
      true
    );
    assert.equal(
      expiredChargeNeverCancelsFulfillment(cases.handlesChargeExpired),
      true
    );
  });

  it('Connect dashboard webhook docs omit reversal, application-fee refund, and charge expiry', () => {
    const html = readRepo('stripe-connect-sample/public/index.html');
    const docs = extractDashboardWebhookDocs(html);

    assert.match(docs, /Webhook Setup/);
    assert.match(docs, /invoice\.payment_succeeded/);
    assert.equal(
      dashboardDocumentsWebhookEvent(docs, 'invoice.payment_succeeded'),
      true
    );
    assert.equal(dashboardDocumentsWebhookEvent(docs, 'transfer.reversed'), false);
    assert.equal(
      dashboardDocumentsWebhookEvent(docs, 'application_fee.refunded'),
      false
    );
    assert.equal(dashboardDocumentsWebhookEvent(docs, 'charge.expired'), false);
    assert.doesNotMatch(docs, /transfer\.reversed/);
    assert.doesNotMatch(docs, /application_fee\.refunded/);
    assert.doesNotMatch(docs, /charge\.expired/);
  });
});
