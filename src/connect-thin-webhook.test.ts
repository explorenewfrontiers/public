import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  THIN_WEBHOOK_DOCUMENTED_CUSTOMER_CAPABILITY_EVENT,
  THIN_WEBHOOK_HANDLED_EVENT_TYPES,
  classifyThinWebhookEvent,
  resolveWebhookSigningSecret,
} from './connect-thin-webhook.js';

const sampleServerPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../stripe-connect-sample/server.ts'
);

describe('resolveWebhookSigningSecret', () => {
  it('forwards an empty string when WEBHOOK_SECRET is missing', () => {
    assert.equal(resolveWebhookSigningSecret(undefined), '');
    assert.equal(resolveWebhookSigningSecret(''), '');
  });

  it('keeps a configured signing secret', () => {
    assert.equal(resolveWebhookSigningSecret('whsec_test'), 'whsec_test');
  });
});

describe('thin webhook event handling', () => {
  it('handles requirements and merchant capability updates only', () => {
    assert.equal(
      classifyThinWebhookEvent('v2.core.account[requirements].updated'),
      'handled'
    );
    assert.equal(
      classifyThinWebhookEvent(
        'v2.core.account[configuration.merchant].capability_status_updated'
      ),
      'handled'
    );
    assert.equal(
      classifyThinWebhookEvent(THIN_WEBHOOK_DOCUMENTED_CUSTOMER_CAPABILITY_EVENT),
      'unhandled'
    );
    assert.equal(
      classifyThinWebhookEvent(
        'v2.core.account[configuration.customer].capability_status_updated'
      ),
      'unhandled'
    );
    assert.deepEqual(THIN_WEBHOOK_HANDLED_EVENT_TYPES, [
      'v2.core.account[requirements].updated',
      'v2.core.account[configuration.merchant].capability_status_updated',
    ]);
  });
});

describe('Connect thin webhook source stays aligned', () => {
  it('verifies with WEBHOOK_SECRET || "" then retrieves the full event outside that try', () => {
    const source = fs.readFileSync(sampleServerPath, 'utf8');
    const thinRoute = source.indexOf("app.post(\n  '/webhook/thin'");
    const parseCall = source.indexOf('stripeClient.parseThinEvent(', thinRoute);
    const parseCatch = source.indexOf('} catch (err) {', parseCall);
    const retrieveCall = source.indexOf(
      'stripeClient.v2.core.events.retrieve(thinEvent.id)',
      parseCatch
    );
    const ack = source.indexOf("res.json({ received: true })", retrieveCall);

    assert.ok(thinRoute >= 0);
    assert.ok(parseCall > thinRoute);
    assert.ok(parseCatch > parseCall);
    assert.ok(retrieveCall > parseCatch);
    assert.ok(ack > retrieveCall);
    assert.match(source, /WEBHOOK_SECRET \|\| ''/);
    assert.match(
      source,
      /v2\.account\[configuration\.customer\]\.capability_status_updated/
    );
    assert.equal(
      source.includes('v2.core.account[configuration.customer].capability_status_updated'),
      false
    );
  });
});
