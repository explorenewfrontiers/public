import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  productionStatusIncludesPayoutFields,
  statusExposesPayoutBlockers,
} from './connect-status-payout-fields.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function handlerSource(connect: string, route: string): string {
  const start = connect.indexOf(route);
  assert.notEqual(start, -1, `missing ${route}`);
  const next = connect.indexOf('// ========', start + route.length);
  return connect.slice(start, next === -1 ? undefined : next);
}

describe('Connect status omits payout blockers', () => {
  it('cannot tell payouts-disabled or disabled_reason from the current JSON', () => {
    assert.equal(
      statusExposesPayoutBlockers({
        onboardingComplete: true,
        readyToProcessPayments: true,
      }),
      false
    );
    assert.equal(
      statusExposesPayoutBlockers({
        onboardingComplete: true,
        readyToProcessPayments: true,
        payouts_enabled: false,
        disabled_reason: 'rejected.listed',
      }),
      true
    );
    assert.equal(productionStatusIncludesPayoutFields(), false);
  });
});

describe('Connect status source stays aligned', () => {
  it('status JSON and dashboard never mention payouts_enabled or disabled_reason', () => {
    const connect = readRepo('stripe-connect-sample/server.ts');
    const status = handlerSource(
      connect,
      "app.get('/api/accounts/:accountId/status'"
    );

    assert.match(status, /onboardingComplete/);
    assert.match(status, /readyToProcessPayments/);
    assert.match(status, /currentlyDueRequirements/);
    assert.equal(status.includes('payouts_enabled'), false);
    assert.equal(status.includes('disabled_reason'), false);

    const dashboard = readRepo('stripe-connect-sample/public/index.html');
    assert.match(dashboard, /statusResult\.readyToProcessPayments/);
    assert.match(dashboard, /statusResult\.onboardingComplete/);
    assert.equal(dashboard.includes('payouts_enabled'), false);
    assert.equal(dashboard.includes('disabled_reason'), false);
  });
});
