import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  HANDLED_THICK_WEBHOOK_EVENTS,
  UNHANDLED_ACCESS_EVENTS,
  accessActionForSubscriptionStatus,
  isThickWebhookEventHandled,
  subscriptionUpdatedReadsStatus,
  webhookRoutesByEventAccount,
} from './connect-subscription-status.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect subscription access ignores status and modern events', () => {
  it('never grants or revokes from subscription.status', () => {
    assert.equal(subscriptionUpdatedReadsStatus(), false);
    assert.equal(accessActionForSubscriptionStatus('active'), 'none');
    assert.equal(accessActionForSubscriptionStatus('past_due'), 'none');
    assert.equal(accessActionForSubscriptionStatus('unpaid'), 'none');
    assert.equal(accessActionForSubscriptionStatus('incomplete_expired'), 'none');
    assert.equal(accessActionForSubscriptionStatus('paused'), 'none');
    assert.equal(accessActionForSubscriptionStatus('canceled'), 'none');
  });

  it('does not handle invoice.paid, pause/resume, or trial_will_end', () => {
    assert.deepEqual(HANDLED_THICK_WEBHOOK_EVENTS, [
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
    ]);
    for (const eventType of UNHANDLED_ACCESS_EVENTS) {
      assert.equal(isThickWebhookEventHandled(eventType), false);
    }
    assert.equal(webhookRoutesByEventAccount(), false);
  });
});

describe('Connect subscription-status source stays aligned', () => {
  it('never reads subscription.status or event.account and omits paid/paused cases', () => {
    const server = readRepo('stripe-connect-sample/server.ts');
    const dashboard = readRepo('stripe-connect-sample/public/index.html');

    assert.match(server, /case 'customer\.subscription\.updated':/);
    assert.match(server, /case 'invoice\.payment_succeeded':/);
    assert.equal(server.includes('subscription.status'), false);
    assert.equal(server.includes("case 'invoice.paid'"), false);
    assert.equal(server.includes("case 'customer.subscription.paused'"), false);
    assert.equal(server.includes("case 'customer.subscription.resumed'"), false);
    assert.equal(server.includes("case 'customer.subscription.trial_will_end'"), false);
    assert.equal(server.includes('event.account'), false);

    assert.match(dashboard, /invoice\.payment_succeeded/);
    assert.equal(dashboard.includes('invoice.paid'), false);
    assert.equal(dashboard.includes('customer.subscription.paused'), false);
  });
});
