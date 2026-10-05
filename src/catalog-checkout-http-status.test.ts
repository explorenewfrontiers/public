import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  catalogCheckoutChecksResponseOk,
  checkoutButtonAfterResponse,
} from './catalog-checkout-http-status.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Catalog checkout ignores HTTP status', () => {
  it('leaves the button stuck on a 5xx body without sessionId', () => {
    assert.deepEqual(
      checkoutButtonAfterResponse({
        responseOk: false,
        sessionId: undefined,
      }),
      { disabled: true, label: 'Processing...' }
    );
    assert.equal(catalogCheckoutChecksResponseOk(), false);
  });

  it('only resets the button when fetch throws, not on HTTP errors', () => {
    assert.deepEqual(
      checkoutButtonAfterResponse({ responseOk: false, threw: true }),
      { disabled: false, label: 'Checkout' }
    );
    assert.deepEqual(
      checkoutButtonAfterResponse({
        responseOk: true,
        sessionId: 'cs_test_1',
      }),
      { disabled: true, label: 'Processing...' }
    );
  });
});

describe('Catalog checkout HTTP status source stays aligned', () => {
  it('checkout() parses JSON without response.ok and has no else reset', () => {
    const app = readRepo('public/app.js');
    const start = app.indexOf('async function checkout()');
    const end = app.indexOf('function showNotification', start);
    const checkout = app.slice(start, end);

    assert.match(checkout, /const data = await response\.json\(\)/);
    assert.equal(checkout.includes('response.ok'), false);
    assert.match(checkout, /if \(data\.sessionId\)/);
    assert.equal(/\belse\b/.test(checkout), false);
    assert.match(
      checkout,
      /checkoutBtn\.disabled = true;\s*checkoutBtn\.textContent = 'Processing\.\.\.'/
    );
  });
});
