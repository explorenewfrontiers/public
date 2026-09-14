import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildSubscriptionCheckoutSession,
  isRecurringPrice,
} from './subscription-helpers.js';

describe('buildSubscriptionCheckoutSession', () => {
  it('creates a direct-charge subscription session on the connected account', () => {
    const spec = buildSubscriptionCheckoutSession(
      'acct_123',
      'price_recurring',
      'https://platform.example'
    );

    assert.equal(spec.sessionParams.mode, 'subscription');
    assert.deepEqual(spec.sessionParams.line_items, [
      { price: 'price_recurring', quantity: 1 },
    ]);
    assert.equal(spec.requestOptions.stripeAccount, 'acct_123');
    assert.equal(
      'customer_account' in spec.sessionParams,
      false,
      'seller account must not be the Checkout customer'
    );
    assert.equal(
      spec.sessionParams.success_url,
      'https://platform.example/?session_id={CHECKOUT_SESSION_ID}&accountId=acct_123'
    );
    assert.equal(
      spec.sessionParams.cancel_url,
      'https://platform.example/?accountId=acct_123'
    );
  });

  it('strips a trailing slash from the base URL and encodes the account id', () => {
    const spec = buildSubscriptionCheckoutSession(
      'acct_a b',
      'price_1',
      'http://localhost:3000/'
    );

    assert.match(spec.sessionParams.success_url, /^http:\/\/localhost:3000\/\?/);
    assert.match(spec.sessionParams.cancel_url, /accountId=acct_a%20b$/);
  });

  it('rejects missing identifiers', () => {
    assert.throws(
      () => buildSubscriptionCheckoutSession('', 'price_1', 'http://localhost'),
      /accountId/
    );
    assert.throws(
      () => buildSubscriptionCheckoutSession('acct_1', '', 'http://localhost'),
      /priceId/
    );
  });
});

describe('isRecurringPrice', () => {
  it('accepts a Stripe recurring price object', () => {
    assert.equal(
      isRecurringPrice({ recurring: { interval: 'month', interval_count: 1 } }),
      true
    );
  });

  it('rejects one-time prices so subscription Checkout is not created', () => {
    assert.equal(isRecurringPrice({ recurring: null }), false);
    assert.equal(isRecurringPrice({}), false);
  });
});
