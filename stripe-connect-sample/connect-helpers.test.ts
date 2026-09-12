import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeApplicationFeeCents,
  isWebhookPath,
  mapConnectedProduct,
} from './connect-helpers.js';

describe('computeApplicationFeeCents', () => {
  it('takes 10% of the charge in cents', () => {
    assert.equal(computeApplicationFeeCents(1000, 1), 100);
    assert.equal(computeApplicationFeeCents(1999, 1), 200);
    assert.equal(computeApplicationFeeCents(500, 2), 100);
  });

  it('defaults quantity to 1 when omitted, zero, or invalid', () => {
    assert.equal(computeApplicationFeeCents(1000), 100);
    assert.equal(computeApplicationFeeCents(1000, 0), 100);
    assert.equal(computeApplicationFeeCents(1000, Number.NaN), 100);
  });

  it('rejects a negative unit amount', () => {
    assert.throws(() => computeApplicationFeeCents(-1, 1), /non-negative/);
  });
});

describe('mapConnectedProduct', () => {
  it('includes priceId from an expanded default_price object', () => {
    const mapped = mapConnectedProduct({
      id: 'prod_1',
      name: 'Trail Tent',
      description: 'Two-person tent',
      default_price: { id: 'price_abc', unit_amount: 12999, currency: 'usd' },
    });

    assert.equal(mapped.priceId, 'price_abc');
    assert.equal(mapped.default_price, 'price_abc');
    assert.equal(mapped.price, 12999);
    assert.equal(mapped.currency, 'usd');
  });

  it('includes priceId when default_price is an unexpanded string id', () => {
    const mapped = mapConnectedProduct({
      id: 'prod_2',
      name: 'Mug',
      default_price: 'price_xyz',
    });

    assert.equal(mapped.priceId, 'price_xyz');
    assert.equal(mapped.default_price, 'price_xyz');
  });

  it('returns an empty priceId when no default price is set', () => {
    const mapped = mapConnectedProduct({
      id: 'prod_3',
      name: 'Draft',
      default_price: null,
    });

    assert.equal(mapped.priceId, '');
    assert.equal(mapped.price, 0);
  });
});

describe('isWebhookPath', () => {
  it('matches the standard and thin webhook routes', () => {
    assert.equal(isWebhookPath('/webhook'), true);
    assert.equal(isWebhookPath('/webhook/thin'), true);
    assert.equal(isWebhookPath('/webhook?foo=1'), true);
  });

  it('does not match other API routes', () => {
    assert.equal(isWebhookPath('/api/checkout'), false);
    assert.equal(isWebhookPath('/webhook/extra'), false);
    assert.equal(isWebhookPath('/'), false);
  });
});
