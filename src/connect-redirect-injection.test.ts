import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  buildConnectRedirectUrls,
  dashboardAccountStatusPath,
  redirectUrlsEncodeAccountId,
} from './connect-redirect-injection.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect Stripe redirect accountId interpolation', () => {
  it('injects extra query params when accountId contains &', () => {
    const injected = 'acct_1&to=https://evil.test';
    const urls = buildConnectRedirectUrls('https://platform.example', injected);

    for (const url of Object.values(urls)) {
      const parsed = new URL(url);
      assert.equal(parsed.searchParams.get('accountId'), 'acct_1');
      assert.equal(parsed.searchParams.get('to'), 'https://evil.test');
      assert.equal(url.includes(encodeURIComponent(injected)), false);
    }

    assert.equal(redirectUrlsEncodeAccountId(), false);
  });

  it('lets # truncate the query and leaves path segments unescaped', () => {
    const hashed = 'acct_1#stolen';
    const urls = buildConnectRedirectUrls('https://platform.example', hashed);
    assert.equal(new URL(urls.checkoutCancel).searchParams.get('accountId'), 'acct_1');
    assert.equal(new URL(urls.checkoutCancel).hash, '#stolen');

    const traversed = dashboardAccountStatusPath('acct_1/../checkout');
    assert.equal(traversed, '/api/accounts/acct_1/../checkout/status');
    assert.equal(traversed.includes(encodeURIComponent('acct_1/../checkout')), false);
  });
});

describe('Connect redirect-injection source stays aligned', () => {
  it('interpolates raw accountId into Stripe return URLs and the status path', () => {
    const server = readRepo('stripe-connect-sample/server.ts');
    const dashboard = readRepo('stripe-connect-sample/public/index.html');

    assert.match(server, /refresh_url: `\$\{process\.env\.DOMAIN \|\| 'http:\/\/localhost:3000'\}\/onboarding\?accountId=\$\{accountId\}`/);
    assert.match(server, /return_url: `\$\{process\.env\.DOMAIN \|\| 'http:\/\/localhost:3000'\}\/dashboard\?accountId=\$\{accountId\}`/);
    assert.match(server, /success_url: `\$\{baseUrl\}\/success\?session_id=\{CHECKOUT_SESSION_ID\}&accountId=\$\{accountId\}`/);
    assert.match(server, /cancel_url: `\$\{baseUrl\}\/storefront\?accountId=\$\{accountId\}`/);
    assert.match(server, /success_url: `\$\{baseUrl\}\/subscription-success\?session_id=\{CHECKOUT_SESSION_ID\}&accountId=\$\{accountId\}`/);
    assert.equal(server.includes('encodeURIComponent(accountId)'), false);

    assert.match(dashboard, /`\/api\/accounts\/\$\{accountId\}\/status`/);
    assert.equal(dashboard.includes('encodeURIComponent(accountId)'), false);
  });
});
