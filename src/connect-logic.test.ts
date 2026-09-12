import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  computeAccountStatus,
  computeApplicationFeeAmount,
} from './connect-logic.js';

const sampleServerPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../stripe-connect-sample/server.ts'
);

describe('computeAccountStatus', () => {
  it('is ready to process payments only when card_payments is active', () => {
    assert.equal(
      computeAccountStatus({
        configuration: { merchant: { capabilities: { card_payments: { status: 'active' } } } },
      }).readyToProcessPayments,
      true
    );
    assert.equal(
      computeAccountStatus({
        configuration: { merchant: { capabilities: { card_payments: { status: 'inactive' } } } },
      }).readyToProcessPayments,
      false
    );
    assert.equal(computeAccountStatus({}).readyToProcessPayments, false);
  });

  it('treats currently_due and past_due as incomplete onboarding', () => {
    assert.equal(
      computeAccountStatus({
        requirements: { summary: { minimum_deadline: { status: 'currently_due' } } },
      }).onboardingComplete,
      false
    );
    assert.equal(
      computeAccountStatus({
        requirements: { summary: { minimum_deadline: { status: 'past_due' } } },
      }).onboardingComplete,
      false
    );
  });

  it('treats missing or other requirement statuses as complete', () => {
    assert.equal(computeAccountStatus({}).onboardingComplete, true);
    assert.equal(
      computeAccountStatus({
        requirements: { summary: { minimum_deadline: { status: 'eventually_due' } } },
      }).onboardingComplete,
      true
    );
  });

  it('defaults missing requirement lists to empty arrays', () => {
    const status = computeAccountStatus({
      requirements: {
        summary: {
          currently_due: ['id_number'],
          past_due: ['address'],
        },
      },
    });
    assert.deepEqual(status.currentlyDueRequirements, ['id_number']);
    assert.deepEqual(status.pastDueRequirements, ['address']);
    assert.deepEqual(computeAccountStatus({}).currentlyDueRequirements, []);
    assert.deepEqual(computeAccountStatus({}).pastDueRequirements, []);
  });
});

describe('computeApplicationFeeAmount', () => {
  it('uses 10% of quantity and defaults quantity to 1', () => {
    assert.equal(computeApplicationFeeAmount(1), 0);
    assert.equal(computeApplicationFeeAmount(), 0);
    assert.equal(computeApplicationFeeAmount(0), 0);
    assert.equal(computeApplicationFeeAmount(10), 1);
    assert.equal(computeApplicationFeeAmount(15), 2);
  });
});

describe('Connect sample source stays aligned', () => {
  it('still uses the same onboarding and fee formulas as the helpers', () => {
    const source = fs.readFileSync(sampleServerPath, 'utf8');
    assert.match(source, /\(quantity \|\| 1\)\s*\*\s*0\.1/);
    assert.match(source, /requirementsStatus !== 'currently_due'/);
    assert.match(source, /requirementsStatus !== 'past_due'/);
    assert.match(source, /card_payments\?\.status ===\s*\n?\s*'active'/);
  });
});
