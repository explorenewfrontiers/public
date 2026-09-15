import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyConnectWebhookType,
  classifyThinWebhookType,
  didSubscriptionPriceChange,
  isSubscriptionScheduledForCancellation,
  type SubscriptionWebhookEvent,
} from './webhook-events.js';

function updatedEvent(
  overrides: Partial<SubscriptionWebhookEvent['data']> & {
    object?: SubscriptionWebhookEvent['data']['object'];
  } = {}
): SubscriptionWebhookEvent {
  return {
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: 'sub_1',
        cancel_at_period_end: false,
        items: { data: [{ price: { id: 'price_new' } }] },
        ...overrides.object,
      },
      previous_attributes: overrides.previous_attributes,
    },
  };
}

describe('subscription webhook classification', () => {
  it('detects a price change when previous_attributes include items', () => {
    const event = updatedEvent({
      previous_attributes: {
        items: { data: [{ price: 'price_old' }] },
      },
    });

    assert.equal(didSubscriptionPriceChange(event), true);
  });

  it('does not treat an unchanged price id as a modification', () => {
    const event = updatedEvent({
      object: { items: { data: [{ price: { id: 'price_same' } }] } },
      previous_attributes: {
        items: { data: [{ price: 'price_same' }] },
      },
    });

    assert.equal(didSubscriptionPriceChange(event), false);
  });

  it('compares the raw previous price value to the new price id', () => {
    const event = updatedEvent({
      object: { items: { data: [{ price: { id: 'price_1' } }] } },
      previous_attributes: {
        items: { data: [{ price: { id: 'price_1' } }] },
      },
    });

    assert.equal(didSubscriptionPriceChange(event), true);
  });

  it('ignores updates that do not include previous item data', () => {
    assert.equal(didSubscriptionPriceChange(updatedEvent()), false);
    assert.equal(
      didSubscriptionPriceChange(
        updatedEvent({ previous_attributes: { cancel_at_period_end: false } })
      ),
      false
    );
  });

  it('detects cancel_at_period_end flipping from false to true only', () => {
    assert.equal(
      isSubscriptionScheduledForCancellation(
        updatedEvent({
          object: { cancel_at_period_end: true },
          previous_attributes: { cancel_at_period_end: false },
        })
      ),
      true
    );
    assert.equal(
      isSubscriptionScheduledForCancellation(
        updatedEvent({
          object: { cancel_at_period_end: true },
          previous_attributes: { cancel_at_period_end: true },
        })
      ),
      false
    );
    assert.equal(
      isSubscriptionScheduledForCancellation(
        updatedEvent({
          object: { cancel_at_period_end: false },
          previous_attributes: { cancel_at_period_end: false },
        })
      ),
      false
    );
    assert.equal(isSubscriptionScheduledForCancellation(updatedEvent()), false);
  });
});

describe('webhook event routing', () => {
  it('routes known Connect events and treats others as unhandled', () => {
    assert.equal(classifyConnectWebhookType('customer.subscription.updated'), 'customer.subscription.updated');
    assert.equal(classifyConnectWebhookType('customer.subscription.deleted'), 'customer.subscription.deleted');
    assert.equal(classifyConnectWebhookType('invoice.payment_succeeded'), 'invoice.payment_succeeded');
    assert.equal(classifyConnectWebhookType('checkout.session.completed'), 'unhandled');
  });

  it('routes known thin V2 account events', () => {
    assert.equal(
      classifyThinWebhookType('v2.core.account[requirements].updated'),
      'v2.core.account[requirements].updated'
    );
    assert.equal(
      classifyThinWebhookType('v2.core.account[configuration.merchant].capability_status_updated'),
      'v2.core.account[configuration.merchant].capability_status_updated'
    );
    assert.equal(
      classifyThinWebhookType('v2.core.account[configuration.customer].capability_status_updated'),
      'unhandled'
    );
  });
});

describe('Connect webhook source stays aligned', () => {
  it('still uses previous_attributes price/cancel checks in server.ts', () => {
    const sourcePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../server.ts');
    const source = fs.readFileSync(sourcePath, 'utf8');

    assert.match(source, /didSubscriptionPriceChange/);
    assert.match(source, /isSubscriptionScheduledForCancellation/);
    assert.match(source, /classifyConnectWebhookType/);
    assert.match(source, /classifyThinWebhookType/);
  });
});
