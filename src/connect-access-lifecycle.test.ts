import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  CONNECT_HANDLED_ACCESS_EVENTS,
  CONNECT_UNHANDLED_ACCESS_GRANT_EVENTS,
  CONNECT_UNHANDLED_ACCESS_REVOKE_EVENTS,
  classifyConnectAccessEvent,
  newSubscriptionGrantsAccess,
  refundOrDisputeRevokesAccess,
} from './connect-access-lifecycle.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect subscription access grant/revoke routing', () => {
  it('handles only updated/deleted subscriptions and successful invoices', () => {
    assert.deepEqual(CONNECT_HANDLED_ACCESS_EVENTS, [
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
    ]);

    for (const eventType of CONNECT_HANDLED_ACCESS_EVENTS) {
      assert.equal(classifyConnectAccessEvent(eventType), eventType);
    }
  });

  it('never grants access on customer.subscription.created', () => {
    assert.deepEqual(CONNECT_UNHANDLED_ACCESS_GRANT_EVENTS, ['customer.subscription.created']);

    for (const eventType of CONNECT_UNHANDLED_ACCESS_GRANT_EVENTS) {
      assert.equal(classifyConnectAccessEvent(eventType), 'unhandled');
      assert.equal(newSubscriptionGrantsAccess(eventType), false);
    }

    assert.equal(newSubscriptionGrantsAccess('customer.subscription.updated'), false);
    assert.equal(classifyConnectAccessEvent('customer.subscription.paused'), 'unhandled');
  });

  it('never revokes access on refunds or disputes', () => {
    assert.deepEqual(CONNECT_UNHANDLED_ACCESS_REVOKE_EVENTS, [
      'charge.refunded',
      'charge.dispute.created',
    ]);

    for (const eventType of CONNECT_UNHANDLED_ACCESS_REVOKE_EVENTS) {
      assert.equal(classifyConnectAccessEvent(eventType), 'unhandled');
      assert.equal(refundOrDisputeRevokesAccess(eventType), false);
    }

    assert.equal(refundOrDisputeRevokesAccess('customer.subscription.deleted'), false);
  });
});

describe('Connect access lifecycle source stays aligned', () => {
  it('switches on updated/deleted/paid and omits created/refund/dispute', () => {
    const server = readRepo('stripe-connect-sample/server.ts');
    const dashboard = readRepo('stripe-connect-sample/public/index.html');

    assert.match(server, /case 'customer\.subscription\.updated':/);
    assert.match(server, /case 'customer\.subscription\.deleted':/);
    assert.match(server, /case 'invoice\.payment_succeeded':/);
    assert.equal(server.includes("case 'customer.subscription.created'"), false);
    assert.equal(server.includes("case 'charge.refunded'"), false);
    assert.equal(server.includes("case 'charge.dispute.created'"), false);
    assert.match(server, /console\.log\(`Unhandled event type: \$\{event\.type\}`\)/);

    assert.match(dashboard, /customer\.subscription\.updated/);
    assert.match(dashboard, /customer\.subscription\.deleted/);
    assert.match(dashboard, /invoice\.payment_succeeded/);
    assert.equal(dashboard.includes('customer.subscription.created'), false);
    assert.equal(dashboard.includes('charge.refunded'), false);
    assert.equal(dashboard.includes('charge.dispute.created'), false);
  });
});
