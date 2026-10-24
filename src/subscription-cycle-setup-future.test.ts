import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  extractPaymentCheckoutCreates,
  extractPaymentIntentCreates,
  extractSubscriptionCheckoutCreates,
  inspectSetupFutureUsage,
  inspectSubscriptionCycleFields,
  paymentIntentDoesNotSaveCard,
  planChangeHasNoProrationPolicy,
  sourceSetsBillingCycleAnchor,
  sourceSetsProrationBehavior,
  sourceSetsSetupFutureUsage,
  sourceSetsSetupFutureUsageOffSession,
  subscriptionStartsAtSessionComplete,
} from './subscription-cycle-setup-future.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Subscriptions omit billing cycle/proration; money creates omit setup_future_usage', () => {
  it('missing cycle/proration/reuse fields start billing now and drop the card', () => {
    assert.equal(subscriptionStartsAtSessionComplete(false), true);
    assert.equal(subscriptionStartsAtSessionComplete(true), false);
    assert.equal(planChangeHasNoProrationPolicy(false), true);
    assert.equal(planChangeHasNoProrationPolicy(true), false);
    assert.equal(paymentIntentDoesNotSaveCard(false), true);
    assert.equal(paymentIntentDoesNotSaveCard(true), false);

    assert.equal(
      sourceSetsBillingCycleAnchor('billing_cycle_anchor: Math.floor(Date.now() / 1000)'),
      true
    );
    assert.equal(sourceSetsProrationBehavior(`proration_behavior: 'none'`), true);
    assert.equal(sourceSetsSetupFutureUsage(`setup_future_usage: 'off_session'`), true);
    assert.equal(
      sourceSetsSetupFutureUsageOffSession(`setup_future_usage: 'off_session'`),
      true
    );
    assert.equal(
      sourceSetsSetupFutureUsageOffSession(`setup_future_usage: 'on_session'`),
      false
    );
  });

  it('Connect subscription Checkout omits billing_cycle_anchor and proration_behavior', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const subscription = extractSubscriptionCheckoutCreates(source);
    const fields = inspectSubscriptionCycleFields(source);

    assert.match(subscription, /mode:\s*['"]subscription['"]/);
    assert.match(subscription, /customer_account/);
    assert.equal(sourceSetsBillingCycleAnchor(source), false);
    assert.equal(sourceSetsProrationBehavior(source), false);
    assert.equal(fields.hasBillingCycleAnchor, false);
    assert.equal(fields.hasProrationBehavior, false);
    assert.equal(
      subscriptionStartsAtSessionComplete(fields.hasBillingCycleAnchor),
      true
    );
    assert.equal(
      planChangeHasNoProrationPolicy(fields.hasProrationBehavior),
      true
    );
  });

  it('MCP PaymentIntents and Connect payment Checkout omit setup_future_usage', () => {
    const mcp = readRepo('src/index.ts');
    const connect = readRepo('stripe-connect-sample/server.ts');
    const catalog = readRepo('src/web-server.ts');
    const mcpIntent = extractPaymentIntentCreates(mcp);
    const connectPayment = extractPaymentCheckoutCreates(connect);
    const catalogPayment = extractPaymentCheckoutCreates(catalog);
    const mcpFields = inspectSetupFutureUsage(mcp);
    const connectFields = inspectSetupFutureUsage(connect);
    const catalogFields = inspectSetupFutureUsage(catalog);

    assert.match(mcpIntent, /paymentIntents\.create/);
    assert.match(mcpIntent, /amount:\s*input\.amount/);
    assert.match(connectPayment, /payment_intent_data\s*:/);
    assert.match(connectPayment, /application_fee_amount/);
    assert.match(catalogPayment, /mode:\s*['"]payment['"]/);

    assert.equal(sourceSetsSetupFutureUsage(mcp), false);
    assert.equal(sourceSetsSetupFutureUsage(connect), false);
    assert.equal(sourceSetsSetupFutureUsage(catalog), false);
    assert.equal(mcpFields.hasSetupFutureUsage, false);
    assert.equal(connectFields.hasSetupFutureUsage, false);
    assert.equal(catalogFields.hasSetupFutureUsage, false);
    assert.equal(paymentIntentDoesNotSaveCard(mcpFields.hasSetupFutureUsage), true);
    assert.equal(
      paymentIntentDoesNotSaveCard(connectFields.hasSetupFutureUsage),
      true
    );
    assert.equal(
      paymentIntentDoesNotSaveCard(catalogFields.hasSetupFutureUsage),
      true
    );
  });
});
