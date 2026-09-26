import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  connectRequiredFieldsFrom,
  requiredFieldPresent,
  whitespaceOnlyPassesRequiredCheck,
} from './connect-required-whitespace.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect required fields accept whitespace', () => {
  it('treats whitespace-only strings as present', () => {
    assert.equal(requiredFieldPresent(''), false);
    assert.equal(requiredFieldPresent(undefined), false);
    assert.equal(requiredFieldPresent('   '), true);
    assert.equal(whitespaceOnlyPassesRequiredCheck('   '), true);
    assert.equal(whitespaceOnlyPassesRequiredCheck('\t\n'), true);
    assert.equal(whitespaceOnlyPassesRequiredCheck('acct_123'), false);
  });

  it('lets whitespace through account, product, and checkout guards', () => {
    const whitespace = connectRequiredFieldsFrom({
      displayName: '   ',
      contactEmail: '   ',
      accountId: '   ',
      name: '   ',
      priceInCents: '   ',
      priceId: '   ',
    });
    assert.deepEqual(whitespace, {
      accountCreateOk: true,
      productCreateOk: true,
      checkoutOk: true,
    });

    const missing = connectRequiredFieldsFrom({});
    assert.deepEqual(missing, {
      accountCreateOk: false,
      productCreateOk: false,
      checkoutOk: false,
    });
  });
});

describe('Connect required-field source stays aligned', () => {
  it('uses truthy checks with no trim on account, product, and checkout', () => {
    const server = readRepo('stripe-connect-sample/server.ts');

    assert.match(server, /if \(!displayName \|\| !contactEmail\)/);
    assert.match(server, /if \(!accountId \|\| !name \|\| !priceInCents\)/);
    assert.match(server, /if \(!accountId \|\| !priceId\) \{/);
    assert.equal(server.includes('.trim()'), false);
    assert.equal(server.includes('includes(\'@\')'), false);
  });
});
