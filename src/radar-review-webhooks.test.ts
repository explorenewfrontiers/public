import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  dashboardDocumentsWebhookEvent,
  extractClassicWebhookHandler,
  extractDashboardWebhookDocs,
  inspectRadarReviewWebhookCases,
  reviewClosedNeverReleasesOrRevokes,
  reviewOpenedNeverHoldsFulfillment,
  webhookHandlesEventType,
} from './radar-review-webhooks.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect /webhook ignores review.opened and review.closed', () => {
  it('missing review handlers ship during Radar hold and never release or revoke', () => {
    assert.equal(reviewOpenedNeverHoldsFulfillment(false), true);
    assert.equal(reviewOpenedNeverHoldsFulfillment(true), false);
    assert.equal(reviewClosedNeverReleasesOrRevokes(false), true);
    assert.equal(reviewClosedNeverReleasesOrRevokes(true), false);

    assert.equal(
      webhookHandlesEventType(`case 'review.opened':`, 'review.opened'),
      true
    );
    assert.equal(
      webhookHandlesEventType(`case 'review.closed':`, 'review.closed'),
      true
    );
    assert.equal(
      webhookHandlesEventType(
        `case 'radar.early_fraud_warning.created':`,
        'review.opened'
      ),
      false
    );
    assert.equal(
      webhookHandlesEventType(`case 'charge.dispute.closed':`, 'review.closed'),
      false
    );
    assert.equal(
      dashboardDocumentsWebhookEvent('<li>review.opened</li>', 'review.opened'),
      true
    );
    assert.equal(
      dashboardDocumentsWebhookEvent(
        '<li>invoice.payment_succeeded</li>',
        'review.closed'
      ),
      false
    );
  });

  it('Connect /webhook handles payment_succeeded but not review.opened or review.closed', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const webhook = extractClassicWebhookHandler(source);
    const cases = inspectRadarReviewWebhookCases(webhook);

    assert.match(webhook, /constructEvent/);
    assert.doesNotMatch(webhook, /parseThinEvent/);
    assert.equal(cases.handlesPaymentSucceeded, true);
    assert.equal(cases.handlesReviewOpened, false);
    assert.equal(cases.handlesReviewClosed, false);
    assert.equal(
      webhookHandlesEventType(webhook, 'invoice.payment_succeeded'),
      true
    );
    assert.equal(webhookHandlesEventType(webhook, 'review.opened'), false);
    assert.equal(webhookHandlesEventType(webhook, 'review.closed'), false);
    assert.equal(
      reviewOpenedNeverHoldsFulfillment(cases.handlesReviewOpened),
      true
    );
    assert.equal(
      reviewClosedNeverReleasesOrRevokes(cases.handlesReviewClosed),
      true
    );
  });

  it('Connect dashboard webhook docs omit Radar review events', () => {
    const html = readRepo('stripe-connect-sample/public/index.html');
    const docs = extractDashboardWebhookDocs(html);

    assert.match(docs, /Webhook Setup/);
    assert.match(docs, /invoice\.payment_succeeded/);
    assert.equal(
      dashboardDocumentsWebhookEvent(docs, 'invoice.payment_succeeded'),
      true
    );
    assert.equal(dashboardDocumentsWebhookEvent(docs, 'review.opened'), false);
    assert.equal(dashboardDocumentsWebhookEvent(docs, 'review.closed'), false);
    assert.doesNotMatch(docs, /review\.opened/);
    assert.doesNotMatch(docs, /review\.closed/);
  });
});
