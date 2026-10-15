import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  duplicateAccountCreatesWouldDiverge,
  extractDashboardFormHandler,
  extractRouteHandler,
  handlerDisablesSubmit,
  stripeCreateSetsIdempotencyKey,
} from './connect-account-create-idempotency.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect account create is not idempotent and the dashboard allows double submit', () => {
  it('POST /api/accounts creates a connected account without an idempotency key', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const handler = extractRouteHandler(source, "app.post('/api/accounts'");

    assert.match(handler, /v2\.core\.accounts\.create/);
    assert.equal(stripeCreateSetsIdempotencyKey(handler), false);
    assert.equal(handler.includes('idempotencyKey'), false);
  });

  it('dashboard createAccountForm never disables the submit button', () => {
    const html = readRepo('stripe-connect-sample/public/index.html');
    const handler = extractDashboardFormHandler(html, 'createAccountForm');

    assert.match(handler, /apiCall\('\/api\/accounts',\s*'POST'/);
    assert.equal(handlerDisablesSubmit(handler), false);
    assert.equal(
      duplicateAccountCreatesWouldDiverge({
        hasIdempotencyKey: false,
        submitDisabled: false,
      }),
      true
    );
  });
});
