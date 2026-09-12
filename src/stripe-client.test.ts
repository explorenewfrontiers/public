import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createStripeClientOptions } from './stripe-client.js';

describe('createStripeClientOptions', () => {
  it('sets the pinned API version and omits stripeAccount by default', () => {
    const options = createStripeClientOptions();
    assert.equal(options.apiVersion, '2024-11-20');
    assert.equal('stripeAccount' in options, false);
  });

  it('routes requests to a connected account when Stripe-Account is set', () => {
    const options = createStripeClientOptions('acct_connected');
    assert.equal(options.stripeAccount, 'acct_connected');
    assert.equal(options.apiVersion, '2024-11-20');
  });

  it('does not set stripeAccount for an empty header value', () => {
    const options = createStripeClientOptions('');
    assert.equal('stripeAccount' in options, false);
  });
});
