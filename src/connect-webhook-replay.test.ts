import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  STRIPE_DEFAULT_TOLERANCE_SECONDS,
  livemodeMatches,
  productionAcknowledgesAfterSwitch,
  productionChecksLivemode,
  productionPassesToleranceToConstructEvent,
  productionRecordsEventId,
  shouldReplay,
} from './connect-webhook-replay.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect webhook replay and livemode', () => {
  it('treats a repeated event.id as a replay that production would still ack', () => {
    const seen = new Set(['evt_paid_1']);
    assert.equal(shouldReplay('evt_paid_1', seen), true);
    assert.equal(shouldReplay('evt_paid_2', seen), false);

    assert.equal(productionRecordsEventId(), false);
    assert.equal(
      productionAcknowledgesAfterSwitch({
        id: 'evt_paid_1',
        type: 'invoice.payment_succeeded',
        livemode: true,
      }),
      true
    );
  });

  it('does not compare livemode and uses the 300s default tolerance', () => {
    assert.equal(
      livemodeMatches(
        { id: 'evt_test', type: 'invoice.payment_succeeded', livemode: false },
        true
      ),
      false
    );
    assert.equal(productionChecksLivemode(), false);
    assert.equal(productionPassesToleranceToConstructEvent(), false);
    assert.equal(STRIPE_DEFAULT_TOLERANCE_SECONDS, 300);
  });
});

describe('Connect webhook replay source stays aligned', () => {
  it('acks /webhook without event.id, livemode, or constructEvent tolerance', () => {
    const connect = readRepo('stripe-connect-sample/server.ts');
    const webhookStart = connect.indexOf("app.post(\n  '/webhook'");
    const webhookEnd = connect.indexOf('// V2 WEBHOOK HANDLING', webhookStart);
    const webhook = connect.slice(webhookStart, webhookEnd);

    assert.match(webhook, /webhooks\.constructEvent\(/);
    assert.match(webhook, /res\.json\(\{ received: true \}\)/);
    assert.equal(webhook.includes('event.id'), false);
    assert.equal(webhook.includes('livemode'), false);
    assert.equal(webhook.includes('tolerance'), false);
    assert.equal(webhook.includes('seenEvents'), false);
    assert.equal(webhook.includes('idempotenc'), false);
    assert.match(
      webhook,
      /constructEvent\(\s*req\.body,\s*sig,\s*WEBHOOK_SECRET \|\| ''\s*\)/
    );
  });
});
