import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  CONNECT_MONEY_ROUTES,
  productionStatusReturnsReadyToProcessPayments,
  productionWriteRouteChecksOnboardingComplete,
  productionWriteRouteChecksReadyToProcessPayments,
  shouldBlockMoneyMovement,
} from './connect-capability-gate.js';

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

describe('Connect money routes ignore payment capability', () => {
  it('would block charges when card_payments is not active', () => {
    assert.equal(shouldBlockMoneyMovement({ readyToProcessPayments: true }), false);
    assert.equal(shouldBlockMoneyMovement({ readyToProcessPayments: false }), true);
    assert.equal(shouldBlockMoneyMovement({ onboardingComplete: true }), true);
    assert.equal(shouldBlockMoneyMovement({}), true);
  });

  it('computes readyToProcessPayments on status but never reads it on writes', () => {
    assert.equal(productionStatusReturnsReadyToProcessPayments(), true);
    assert.equal(productionWriteRouteChecksReadyToProcessPayments(), false);
    assert.equal(productionWriteRouteChecksOnboardingComplete(), false);
    assert.deepEqual(CONNECT_MONEY_ROUTES, [
      'POST /api/products',
      'POST /api/checkout',
      'POST /api/subscriptions',
      'POST /api/billing-portal',
    ]);
  });
});

describe('Connect capability-gate source stays aligned', () => {
  it('status returns readyToProcessPayments while write handlers omit it', () => {
    const connect = readRepo('stripe-connect-sample/server.ts');
    const status = handlerSource(connect, "app.get('/api/accounts/:accountId/status'");
    assert.match(status, /readyToProcessPayments/);
    assert.match(
      status,
      /card_payments\?\.status ===\s*\n\s*'active'/
    );

    for (const route of [
      "app.post('/api/products'",
      "app.post('/api/checkout'",
      "app.post('/api/subscriptions'",
      "app.post('/api/billing-portal'",
    ]) {
      const body = handlerSource(connect, route);
      assert.equal(body.includes('readyToProcessPayments'), false, route);
      assert.equal(body.includes('onboardingComplete'), false, route);
      assert.equal(body.includes('charges_enabled'), false, route);
      assert.equal(body.includes('payouts_enabled'), false, route);
    }
  });
});
