import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  dashboardDocumentsWebhookEvent,
  extractClassicWebhookHandler,
  extractDashboardWebhookDocs,
  inspectInvoiceCollectionsCases,
  overdueInvoiceNeverStartsDunning,
  uncollectibleInvoiceNeverRevokesAccess,
  webhookHandlesEventType,
} from './invoice-uncollectible-overdue.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect /webhook ignores invoice.marked_uncollectible and invoice.overdue', () => {
  it('missing uncollectible/overdue handlers leave access granted and skip dunning', () => {
    assert.equal(uncollectibleInvoiceNeverRevokesAccess(false), true);
    assert.equal(uncollectibleInvoiceNeverRevokesAccess(true), false);
    assert.equal(overdueInvoiceNeverStartsDunning(false), true);
    assert.equal(overdueInvoiceNeverStartsDunning(true), false);

    assert.equal(
      webhookHandlesEventType(
        `case 'invoice.marked_uncollectible':`,
        'invoice.marked_uncollectible'
      ),
      true
    );
    assert.equal(
      webhookHandlesEventType(`case 'invoice.overdue':`, 'invoice.overdue'),
      true
    );
    assert.equal(
      webhookHandlesEventType(
        `case 'invoice.payment_succeeded':`,
        'invoice.marked_uncollectible'
      ),
      false
    );
    assert.equal(
      webhookHandlesEventType(`case 'invoice.voided':`, 'invoice.overdue'),
      false
    );
    assert.equal(
      dashboardDocumentsWebhookEvent(
        '<li>invoice.marked_uncollectible</li>',
        'invoice.marked_uncollectible'
      ),
      true
    );
    assert.equal(
      dashboardDocumentsWebhookEvent(
        '<li>invoice.payment_succeeded</li>',
        'invoice.overdue'
      ),
      false
    );
  });

  it('Connect /webhook handles payment_succeeded but not marked_uncollectible or overdue', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const webhook = extractClassicWebhookHandler(source);
    const cases = inspectInvoiceCollectionsCases(webhook);

    assert.match(webhook, /constructEvent/);
    assert.doesNotMatch(webhook, /parseThinEvent/);
    assert.equal(cases.handlesPaymentSucceeded, true);
    assert.equal(cases.handlesMarkedUncollectible, false);
    assert.equal(cases.handlesOverdue, false);
    assert.equal(
      webhookHandlesEventType(webhook, 'invoice.payment_succeeded'),
      true
    );
    assert.equal(
      webhookHandlesEventType(webhook, 'invoice.marked_uncollectible'),
      false
    );
    assert.equal(webhookHandlesEventType(webhook, 'invoice.overdue'), false);
    assert.equal(
      uncollectibleInvoiceNeverRevokesAccess(cases.handlesMarkedUncollectible),
      true
    );
    assert.equal(overdueInvoiceNeverStartsDunning(cases.handlesOverdue), true);
  });

  it('Connect dashboard webhook docs omit uncollectible and overdue events', () => {
    const html = readRepo('stripe-connect-sample/public/index.html');
    const docs = extractDashboardWebhookDocs(html);

    assert.match(docs, /Webhook Setup/);
    assert.match(docs, /invoice\.payment_succeeded/);
    assert.equal(dashboardDocumentsWebhookEvent(docs, 'invoice.payment_succeeded'), true);
    assert.equal(
      dashboardDocumentsWebhookEvent(docs, 'invoice.marked_uncollectible'),
      false
    );
    assert.equal(dashboardDocumentsWebhookEvent(docs, 'invoice.overdue'), false);
    assert.doesNotMatch(docs, /invoice\.marked_uncollectible/);
    assert.doesNotMatch(docs, /invoice\.overdue/);
  });
});
