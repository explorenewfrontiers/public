import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  connectedAccountCannotReceiveTransfers,
  extractAccountCreates,
  extractSubscriptionCheckoutCreates,
  inspectMerchantCapabilityRequests,
  inspectSubscriptionTrialFields,
  sourceRequestsCardPayments,
  sourceRequestsTransfers,
  sourceSetsSubscriptionData,
  sourceSetsTrialPeriodDays,
  sourceSetsTrialSettings,
  subscriptionBillsImmediately,
} from './connect-transfers-trial.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect account create omits transfers; subscriptions omit trials', () => {
  it('missing transfers and trial fields block payouts and bill on day one', () => {
    assert.equal(connectedAccountCannotReceiveTransfers({ hasTransfers: false }), true);
    assert.equal(connectedAccountCannotReceiveTransfers({ hasTransfers: true }), false);
    assert.equal(
      subscriptionBillsImmediately({ hasTrialPeriodDays: false, hasTrialSettings: false }),
      true
    );
    assert.equal(
      subscriptionBillsImmediately({ hasTrialPeriodDays: true, hasTrialSettings: false }),
      false
    );
    assert.equal(
      subscriptionBillsImmediately({ hasTrialPeriodDays: false, hasTrialSettings: true }),
      false
    );

    assert.equal(
      sourceRequestsCardPayments('card_payments: { requested: true }'),
      true
    );
    assert.equal(
      sourceRequestsTransfers('transfers: { requested: true }'),
      true
    );
    assert.equal(
      sourceRequestsTransfers('card_payments: { requested: true }'),
      false
    );
    assert.equal(sourceSetsSubscriptionData('subscription_data: { trial_period_days: 14 }'), true);
    assert.equal(sourceSetsTrialPeriodDays('trial_period_days: 14'), true);
    assert.equal(
      sourceSetsTrialSettings("trial_settings: { end_behavior: { missing_payment_method: 'cancel' } }"),
      true
    );
  });

  it('Connect account create requests card_payments but not transfers', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const creates = extractAccountCreates(source);
    const caps = inspectMerchantCapabilityRequests(source);

    assert.match(creates, /v2\.core\.accounts\.create/);
    assert.match(creates, /card_payments/);
    assert.match(creates, /requested:\s*true/);
    assert.equal(sourceRequestsCardPayments(source), true);
    assert.equal(sourceRequestsTransfers(source), false);
    assert.equal(caps.hasCardPayments, true);
    assert.equal(caps.hasTransfers, false);
    assert.equal(
      connectedAccountCannotReceiveTransfers({ hasTransfers: caps.hasTransfers }),
      true
    );
  });

  it('Connect subscription Checkout omits trial_period_days and trial_settings', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const checkout = extractSubscriptionCheckoutCreates(source);
    const trials = inspectSubscriptionTrialFields(source);

    assert.match(checkout, /checkout\.sessions\.create/);
    assert.match(checkout, /mode:\s*['"]subscription['"]/);
    assert.doesNotMatch(checkout, /mode:\s*['"]payment['"]/);
    assert.equal(sourceSetsSubscriptionData(source), false);
    assert.equal(sourceSetsTrialPeriodDays(source), false);
    assert.equal(sourceSetsTrialSettings(source), false);
    assert.equal(trials.hasSubscriptionData, false);
    assert.equal(trials.hasTrialPeriodDays, false);
    assert.equal(trials.hasTrialSettings, false);
    assert.equal(
      subscriptionBillsImmediately({
        hasTrialPeriodDays: trials.hasTrialPeriodDays,
        hasTrialSettings: trials.hasTrialSettings,
      }),
      true
    );
  });
});
