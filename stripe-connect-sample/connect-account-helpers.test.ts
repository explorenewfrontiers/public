import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildAccountOnboardingLinkParams,
  buildExpressAccountCreateParams,
  mapAccountStatus,
} from './connect-account-helpers.js';

describe('buildExpressAccountCreateParams', () => {
  it('uses the v1 Express Accounts API, not v2.core', () => {
    const params = buildExpressAccountCreateParams(
      "Jane's Shop",
      'jane@example.com'
    );

    assert.equal(params.type, 'express');
    assert.equal(params.country, 'US');
    assert.equal(params.email, 'jane@example.com');
    assert.equal(params.business_profile.name, "Jane's Shop");
    assert.deepEqual(params.capabilities.card_payments, { requested: true });
    assert.equal('display_name' in params, false);
    assert.equal('configuration' in params, false);
  });

  it('rejects missing fields', () => {
    assert.throws(
      () => buildExpressAccountCreateParams('', 'a@b.com'),
      /displayName/
    );
    assert.throws(
      () => buildExpressAccountCreateParams('Shop', ''),
      /contactEmail/
    );
  });
});

describe('buildAccountOnboardingLinkParams', () => {
  it('creates a v1 account_onboarding link that returns to /', () => {
    const params = buildAccountOnboardingLinkParams(
      'acct_123',
      'http://localhost:3000/'
    );

    assert.equal(params.account, 'acct_123');
    assert.equal(params.type, 'account_onboarding');
    assert.equal(params.refresh_url, 'http://localhost:3000/?accountId=acct_123');
    assert.equal(params.return_url, 'http://localhost:3000/?accountId=acct_123');
    assert.equal('use_case' in params, false);
  });
});

describe('mapAccountStatus', () => {
  it('is complete only when details are submitted and nothing is due', () => {
    const complete = mapAccountStatus({
      id: 'acct_1',
      details_submitted: true,
      capabilities: { card_payments: 'active' },
      requirements: { currently_due: [], past_due: [] },
    });

    assert.equal(complete.onboardingComplete, true);
    assert.equal(complete.readyToProcessPayments, true);
  });

  it('is incomplete when currently_due is non-empty even if details_submitted', () => {
    const pending = mapAccountStatus({
      id: 'acct_2',
      details_submitted: true,
      capabilities: { card_payments: 'inactive' },
      requirements: { currently_due: ['business_profile.url'], past_due: [] },
    });

    assert.equal(pending.onboardingComplete, false);
    assert.equal(pending.readyToProcessPayments, false);
    assert.deepEqual(pending.currentlyDueRequirements, ['business_profile.url']);
  });

  it('does not treat a missing requirements summary as complete', () => {
    const fresh = mapAccountStatus({
      id: 'acct_3',
      details_submitted: false,
    });

    assert.equal(fresh.onboardingComplete, false);
    assert.equal(fresh.readyToProcessPayments, false);
  });
});
