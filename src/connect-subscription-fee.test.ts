import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  currentSubscriptionCheckoutParams,
  subscriptionCheckoutTakesPlatformFee,
} from './connect-subscription-fee.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function subscriptionRouteSource(): string {
  const server = readRepo('stripe-connect-sample/server.ts');
  const start = server.indexOf("app.post('/api/subscriptions'");
  const end = server.indexOf("app.post('/api/billing-portal'");
  assert.ok(start >= 0, 'subscription route missing');
  assert.ok(end > start, 'billing-portal route missing after subscriptions');
  return server.slice(start, end);
}

describe('Connect subscriptions take no platform fee', () => {
  it('reports no application fee on the current subscription session shape', () => {
    assert.equal(
      subscriptionCheckoutTakesPlatformFee(currentSubscriptionCheckoutParams()),
      false
    );
    assert.equal(
      subscriptionCheckoutTakesPlatformFee({
        mode: 'subscription',
        subscription_data: { application_fee_percent: 10 },
      }),
      true
    );
  });
});

describe('Connect subscription fee source stays aligned', () => {
  it('creates subscription checkouts without application_fee_percent', () => {
    const route = subscriptionRouteSource();
    const checkout = readRepo('stripe-connect-sample/server.ts');

    assert.match(route, /mode: 'subscription'/);
    assert.match(route, /customer_account: accountId/);
    assert.equal(route.includes('application_fee_percent'), false);
    assert.equal(route.includes('application_fee_amount'), false);
    assert.equal(route.includes('subscription_data'), false);

    // One-time checkout still has a (quantity-based) application fee;
    // subscriptions do not share that block.
    assert.match(checkout, /application_fee_amount: Math\.round\(/);
    assert.match(checkout, /mode: 'payment'/);
  });
});
