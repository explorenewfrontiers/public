import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  dashboardDocumentsWebhookEvent,
  disconnectedAccountKeepsStorefront,
  extractClassicWebhookHandler,
  extractDashboardWebhookDocs,
  failedTransferNeverNotifiesSeller,
  inspectDeauthTransferWebhookCases,
  sourceCallsTransfersCreate,
  webhookHandlesEventType,
} from './connect-deauth-transfer-webhooks.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect /webhook ignores account.application.deauthorized and transfer.failed', () => {
  it('missing deauth/transfer-failed handlers leave the storefront live and sellers unpaid', () => {
    assert.equal(disconnectedAccountKeepsStorefront(false), true);
    assert.equal(disconnectedAccountKeepsStorefront(true), false);
    assert.equal(failedTransferNeverNotifiesSeller(false), true);
    assert.equal(failedTransferNeverNotifiesSeller(true), false);

    assert.equal(
      webhookHandlesEventType(
        `case 'account.application.deauthorized':`,
        'account.application.deauthorized'
      ),
      true
    );
    assert.equal(
      webhookHandlesEventType(`case 'transfer.failed':`, 'transfer.failed'),
      true
    );
    assert.equal(
      webhookHandlesEventType(
        `case 'customer.subscription.deleted':`,
        'account.application.deauthorized'
      ),
      false
    );
    assert.equal(
      webhookHandlesEventType(`case 'payout.failed':`, 'transfer.failed'),
      false
    );
    assert.equal(
      webhookHandlesEventType(`case 'transfer.reversed':`, 'transfer.failed'),
      false
    );
    assert.equal(sourceCallsTransfersCreate(`await stripe.transfers.create({`), true);
    assert.equal(sourceCallsTransfersCreate(`await stripe.payouts.create({`), false);
    assert.equal(
      dashboardDocumentsWebhookEvent(
        '<li>account.application.deauthorized</li>',
        'account.application.deauthorized'
      ),
      true
    );
    assert.equal(
      dashboardDocumentsWebhookEvent(
        '<li>invoice.payment_succeeded</li>',
        'transfer.failed'
      ),
      false
    );
  });

  it('Connect /webhook handles subscription.deleted but not deauthorize or transfer.failed', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const webhook = extractClassicWebhookHandler(source);
    const cases = inspectDeauthTransferWebhookCases(webhook);

    assert.match(webhook, /constructEvent/);
    assert.doesNotMatch(webhook, /parseThinEvent/);
    assert.equal(cases.handlesSubscriptionDeleted, true);
    assert.equal(cases.handlesDeauthorized, false);
    assert.equal(cases.handlesTransferFailed, false);
    assert.equal(
      webhookHandlesEventType(webhook, 'customer.subscription.deleted'),
      true
    );
    assert.equal(
      webhookHandlesEventType(webhook, 'account.application.deauthorized'),
      false
    );
    assert.equal(webhookHandlesEventType(webhook, 'transfer.failed'), false);
    assert.equal(sourceCallsTransfersCreate(source), false);
    assert.equal(
      disconnectedAccountKeepsStorefront(cases.handlesDeauthorized),
      true
    );
    assert.equal(
      failedTransferNeverNotifiesSeller(cases.handlesTransferFailed),
      true
    );
  });

  it('Connect dashboard webhook docs omit deauthorize and transfer.failed', () => {
    const html = readRepo('stripe-connect-sample/public/index.html');
    const docs = extractDashboardWebhookDocs(html);

    assert.match(docs, /Webhook Setup/);
    assert.match(docs, /customer\.subscription\.deleted/);
    assert.equal(
      dashboardDocumentsWebhookEvent(docs, 'customer.subscription.deleted'),
      true
    );
    assert.equal(
      dashboardDocumentsWebhookEvent(docs, 'account.application.deauthorized'),
      false
    );
    assert.equal(dashboardDocumentsWebhookEvent(docs, 'transfer.failed'), false);
    assert.doesNotMatch(docs, /account\.application\.deauthorized/);
    assert.doesNotMatch(docs, /transfer\.failed/);
  });
});
