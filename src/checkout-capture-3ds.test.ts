import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  cardPaymentsSkipExplicit3ds,
  catalogSourceHasPhysicalProductSignals,
  connectCheckoutSetsApplicationFeeWithoutCapture,
  extractMoneyCreates,
  inspectCaptureAndThreeDsFields,
  physicalGoodsCapturedBeforeFulfillment,
  sourceRequiresThreeDSecureChallenge,
  sourceSetsCaptureMethod,
  sourceSetsManualCapture,
  sourceSetsRequestThreeDSecure,
} from './checkout-capture-3ds.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Checkout and PaymentIntents omit manual capture and explicit 3DS', () => {
  it('automatic capture plus no request_three_d_secure captures physical goods and skips SCA', () => {
    assert.equal(
      physicalGoodsCapturedBeforeFulfillment({
        catalogHasPhysicalSignals: true,
        hasManualCapture: false,
      }),
      true
    );
    assert.equal(
      physicalGoodsCapturedBeforeFulfillment({
        catalogHasPhysicalSignals: true,
        hasManualCapture: true,
      }),
      false
    );
    assert.equal(
      physicalGoodsCapturedBeforeFulfillment({
        catalogHasPhysicalSignals: false,
        hasManualCapture: false,
      }),
      false
    );
    assert.equal(cardPaymentsSkipExplicit3ds(false), true);
    assert.equal(cardPaymentsSkipExplicit3ds(true), false);

    assert.equal(sourceSetsCaptureMethod(`capture_method: 'automatic'`), true);
    assert.equal(sourceSetsManualCapture(`capture_method: 'manual'`), true);
    assert.equal(sourceSetsManualCapture(`capture_method: 'automatic'`), false);
    assert.equal(sourceSetsRequestThreeDSecure(`request_three_d_secure: 'automatic'`), true);
    assert.equal(sourceRequiresThreeDSecureChallenge(`request_three_d_secure: 'any'`), true);
    assert.equal(sourceRequiresThreeDSecureChallenge(`request_three_d_secure: 'challenge'`), true);
    assert.equal(sourceRequiresThreeDSecureChallenge(`request_three_d_secure: 'automatic'`), false);
    assert.equal(
      connectCheckoutSetsApplicationFeeWithoutCapture(
        'application_fee_amount: Math.round((quantity || 1) * 0.1)'
      ),
      true
    );
    assert.equal(
      connectCheckoutSetsApplicationFeeWithoutCapture(
        "application_fee_amount: 100, capture_method: 'manual'"
      ),
      false
    );
  });

  it('catalog Checkout and MCP PaymentIntents default to automatic capture with no 3DS', () => {
    const web = readRepo('src/web-server.ts');
    const catalog = readRepo('src/catalog.ts');
    const mcp = readRepo('src/index.ts');
    const checkout = extractMoneyCreates(web);
    const intents = extractMoneyCreates(mcp);
    const fields = inspectCaptureAndThreeDsFields(web + '\n' + mcp);

    assert.match(checkout, /checkout\.sessions\.create/);
    assert.match(checkout, /mode:\s*['"]payment['"]/);
    assert.match(intents, /paymentIntents\.create/);
    assert.equal(sourceSetsCaptureMethod(web + mcp), false);
    assert.equal(sourceSetsManualCapture(web + mcp), false);
    assert.equal(sourceSetsRequestThreeDSecure(web + mcp), false);
    assert.equal(fields.hasCaptureMethod, false);
    assert.equal(fields.hasManualCapture, false);
    assert.equal(fields.hasRequestThreeDSecure, false);
    assert.equal(fields.hasExplicitThreeDSecureChallenge, false);
    assert.equal(catalogSourceHasPhysicalProductSignals(catalog), true);
    assert.equal(
      physicalGoodsCapturedBeforeFulfillment({
        catalogHasPhysicalSignals: true,
        hasManualCapture: fields.hasManualCapture,
      }),
      true
    );
    assert.equal(cardPaymentsSkipExplicit3ds(fields.hasRequestThreeDSecure), true);
  });

  it('Connect Checkout takes an application fee without capture_method or 3DS', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const checkout = extractMoneyCreates(source);
    const fields = inspectCaptureAndThreeDsFields(source);

    assert.match(checkout, /mode:\s*['"]payment['"]/);
    assert.match(checkout, /application_fee_amount/);
    assert.equal((checkout.match(/checkout\.sessions\.create/g) || []).length, 2);
    assert.equal(sourceSetsCaptureMethod(source), false);
    assert.equal(sourceSetsRequestThreeDSecure(source), false);
    assert.equal(fields.hasCaptureMethod, false);
    assert.equal(fields.hasManualCapture, false);
    assert.equal(fields.hasRequestThreeDSecure, false);
    assert.equal(connectCheckoutSetsApplicationFeeWithoutCapture(source), true);
    assert.equal(cardPaymentsSkipExplicit3ds(fields.hasRequestThreeDSecure), true);
  });
});
