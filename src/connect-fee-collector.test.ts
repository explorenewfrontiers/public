import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  ACCOUNT_DASHBOARD,
  ACCOUNT_FEES_COLLECTOR,
  accountCollectsStripeFeesFromConnectedAccount,
  buildAccountResponsibilities,
  checkoutApplicationFeeAmount,
  checkoutSendsApplicationFee,
} from './connect-fee-collector.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect fee collector vs application fees', () => {
  it('creates accounts that assign Stripe fee collection while checkout still takes an application fee', () => {
    const responsibilities = buildAccountResponsibilities();
    assert.equal(responsibilities.fees_collector, 'stripe');
    assert.equal(responsibilities.losses_collector, 'stripe');
    assert.equal(ACCOUNT_DASHBOARD, 'full');
    assert.equal(
      accountCollectsStripeFeesFromConnectedAccount(responsibilities.fees_collector),
      true
    );
    assert.equal(checkoutSendsApplicationFee(), true);
    assert.equal(checkoutApplicationFeeAmount(1), 0);
    assert.equal(checkoutApplicationFeeAmount(10), 1);
  });
});

describe('Connect fee collector source stays aligned', () => {
  it('account create pins fees_collector stripe and checkout sets application_fee_amount', () => {
    const server = readRepo('stripe-connect-sample/server.ts');

    assert.match(server, /fees_collector: 'stripe'/);
    assert.match(server, /losses_collector: 'stripe'/);
    assert.match(server, /dashboard: 'full'/);
    assert.match(server, /application_fee_amount: Math\.round\(/);
    assert.equal(server.includes("fees_collector: 'application'"), false);
    assert.equal(server.includes('subscription_data'), false);
  });
});
