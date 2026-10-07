import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  isLikelyConnectedAccountId,
  isStripeAccountAllowlisted,
  productionEnforcesStripeAccountAllowlist,
  productionRequiresAcctPrefix,
  stripeAccountOptionFromHeader,
} from './mcp-stripe-account-allowlist.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('MCP Stripe-Account header has no allowlist', () => {
  it('forwards any truthy header, including non-acct_ values', () => {
    assert.equal(stripeAccountOptionFromHeader(undefined), undefined);
    assert.equal(stripeAccountOptionFromHeader(''), undefined);
    assert.equal(stripeAccountOptionFromHeader('acct_connected'), 'acct_connected');
    assert.equal(stripeAccountOptionFromHeader('acct_attacker'), 'acct_attacker');
    assert.equal(stripeAccountOptionFromHeader('cus_not_an_account'), 'cus_not_an_account');
    assert.equal(stripeAccountOptionFromHeader('  acct_padded  '), '  acct_padded  ');
  });

  it('does not require an acct_ prefix or an allowlist in production', () => {
    assert.equal(isLikelyConnectedAccountId('acct_123'), true);
    assert.equal(isLikelyConnectedAccountId('cus_123'), false);
    assert.equal(isLikelyConnectedAccountId('acct_'), false);

    const allowlist = new Set(['acct_platform_connected']);
    assert.equal(isStripeAccountAllowlisted('acct_platform_connected', allowlist), true);
    assert.equal(isStripeAccountAllowlisted('acct_attacker', allowlist), false);

    assert.equal(productionEnforcesStripeAccountAllowlist(), false);
    assert.equal(productionRequiresAcctPrefix(), false);
  });
});

describe('MCP Stripe-Account source stays aligned', () => {
  it('reads the header and assigns it with only a truthy check', () => {
    const mcp = readRepo('src/index.ts');

    assert.match(
      mcp,
      /const stripeAccount = req\.headers\['stripe-account'\] as string \| undefined/
    );
    assert.match(mcp, /handleRequest\(request, stripeAccount\)/);
    assert.match(mcp, /if \(stripeAccount\) \{\s*options\.stripeAccount = stripeAccount;/);

    assert.equal(mcp.includes('allowlist'), false);
    assert.equal(mcp.includes('acct_'), false);
    assert.equal(mcp.includes('allowedAccounts'), false);
    assert.equal(mcp.includes('isLikelyConnectedAccountId'), false);
  });
});
