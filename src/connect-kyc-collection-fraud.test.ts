import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  CONNECT_WEBHOOK_FRAUD_EVENTS,
  extractAccountLinkCreates,
  extractWebhookSwitch,
  inspectAccountLinkCollectionFields,
  onboardingDefersEventuallyDueKyc,
  sourceRequestsEventuallyDueFields,
  sourceSetsCollectionOptions,
  webhookHandlesFraudEvent,
  webhookIgnoresFraudOutcome,
} from './connect-kyc-collection-fraud.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect onboarding omits collection_options; webhook ignores Radar and dispute.closed', () => {
  it('missing eventually_due collection and fraud handlers leave KYC deferred and fraud silent', () => {
    assert.equal(onboardingDefersEventuallyDueKyc({ hasEventuallyDueFields: false }), true);
    assert.equal(onboardingDefersEventuallyDueKyc({ hasEventuallyDueFields: true }), false);
    assert.equal(
      webhookIgnoresFraudOutcome({
        handlesEarlyFraudWarning: false,
        handlesDisputeClosed: false,
      }),
      true
    );
    assert.equal(
      webhookIgnoresFraudOutcome({
        handlesEarlyFraudWarning: true,
        handlesDisputeClosed: false,
      }),
      false
    );
    assert.equal(
      webhookIgnoresFraudOutcome({
        handlesEarlyFraudWarning: false,
        handlesDisputeClosed: true,
      }),
      false
    );

    assert.equal(
      sourceSetsCollectionOptions(`collection_options: { fields: 'currently_due' }`),
      true
    );
    assert.equal(sourceRequestsEventuallyDueFields(`fields: 'eventually_due'`), true);
    assert.equal(sourceRequestsEventuallyDueFields(`fields: 'currently_due'`), false);
    assert.equal(
      webhookHandlesFraudEvent(
        "case 'radar.early_fraud_warning.created':",
        'radar.early_fraud_warning.created'
      ),
      true
    );
    assert.equal(
      webhookHandlesFraudEvent("case 'charge.dispute.closed':", 'charge.dispute.closed'),
      true
    );
    assert.equal(
      webhookHandlesFraudEvent("case 'charge.dispute.created':", 'charge.dispute.closed'),
      false
    );
    assert.deepEqual(CONNECT_WEBHOOK_FRAUD_EVENTS, [
      'radar.early_fraud_warning.created',
      'charge.dispute.closed',
    ]);
  });

  it('Connect account link create omits collection_options.fields', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const links = extractAccountLinkCreates(source);
    const fields = inspectAccountLinkCollectionFields(source);

    assert.match(links, /accountLinks\.create/);
    assert.match(links, /account_onboarding/);
    assert.match(links, /configurations:\s*\['merchant',\s*'customer'\]/);
    assert.equal(sourceSetsCollectionOptions(source), false);
    assert.equal(sourceRequestsEventuallyDueFields(source), false);
    assert.equal(fields.hasCollectionOptions, false);
    assert.equal(fields.hasEventuallyDueFields, false);
    assert.equal(
      onboardingDefersEventuallyDueKyc({
        hasEventuallyDueFields: fields.hasEventuallyDueFields,
      }),
      true
    );
  });

  it('Connect /webhook switch never handles Radar warnings or dispute.closed', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const webhook = extractWebhookSwitch(source);

    assert.match(webhook, /switch\s*\(\s*event\.type\s*\)/);
    assert.match(webhook, /customer\.subscription\.updated/);
    assert.match(webhook, /invoice\.payment_succeeded/);
    assert.equal(
      webhookHandlesFraudEvent(source, 'radar.early_fraud_warning.created'),
      false
    );
    assert.equal(webhookHandlesFraudEvent(source, 'charge.dispute.closed'), false);
    assert.equal(
      webhookIgnoresFraudOutcome({
        handlesEarlyFraudWarning: webhookHandlesFraudEvent(
          source,
          'radar.early_fraud_warning.created'
        ),
        handlesDisputeClosed: webhookHandlesFraudEvent(source, 'charge.dispute.closed'),
      }),
      true
    );
  });
});
