import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  CONNECT_REDIRECT_PATHS,
  buildBillingPortalReturnUrl,
  buildCheckoutRedirectUrls,
  buildCheckoutSessionResponse,
  buildOnboardingRedirectUrls,
  buildSubscriptionRedirectUrls,
  resolveConnectBaseUrl,
} from './connect-redirects.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sampleDir = path.join(repoRoot, 'stripe-connect-sample');
const samplePublicDir = path.join(sampleDir, 'public');
const sampleServerPath = path.join(sampleDir, 'server.ts');

describe('Connect redirect URL builders', () => {
  it('falls back to localhost when DOMAIN is unset', () => {
    assert.equal(resolveConnectBaseUrl(), 'http://localhost:3000');
    assert.equal(resolveConnectBaseUrl(''), 'http://localhost:3000');
    assert.equal(resolveConnectBaseUrl('https://pay.example'), 'https://pay.example');
  });

  it('sends paid customers to /success and canceled ones to /storefront', () => {
    assert.deepEqual(buildCheckoutRedirectUrls('acct_1'), {
      success_url: 'http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}&accountId=acct_1',
      cancel_url: 'http://localhost:3000/storefront?accountId=acct_1',
    });
  });

  it('sends subscription checkout to /subscription-success and /dashboard', () => {
    assert.deepEqual(buildSubscriptionRedirectUrls('acct_9', 'https://platform.example'), {
      success_url:
        'https://platform.example/subscription-success?session_id={CHECKOUT_SESSION_ID}&accountId=acct_9',
      cancel_url: 'https://platform.example/dashboard?accountId=acct_9',
    });
  });

  it('sends onboarding refresh/return to /onboarding and /dashboard', () => {
    assert.deepEqual(buildOnboardingRedirectUrls('acct_9', 'https://platform.example'), {
      refresh_url: 'https://platform.example/onboarding?accountId=acct_9',
      return_url: 'https://platform.example/dashboard?accountId=acct_9',
    });
  });

  it('returns billing portal customers to /dashboard', () => {
    assert.equal(
      buildBillingPortalReturnUrl('acct_9'),
      'http://localhost:3000/dashboard?accountId=acct_9'
    );
  });

  it('returns only sessionId from checkout create (no hosted session.url)', () => {
    const response = buildCheckoutSessionResponse('cs_test_123');
    assert.deepEqual(response, { success: true, sessionId: 'cs_test_123' });
    assert.equal('url' in response, false);
  });
});

describe('Connect public pages vs redirect targets', () => {
  it('has storefront.html and index.html but none of the checkout return pages', () => {
    const files = fs.readdirSync(samplePublicDir);
    assert.ok(files.includes('index.html'));
    assert.ok(files.includes('storefront.html'));
    assert.ok(!files.includes('success.html'));
    assert.ok(!files.includes('subscription-success.html'));
    assert.ok(!files.includes('dashboard.html'));
    assert.ok(!files.includes('onboarding.html'));
    assert.ok(!files.includes('storefront'));
  });

  it('uses extensionless paths that static hosting will not map to storefront.html', () => {
    const paths: readonly string[] = CONNECT_REDIRECT_PATHS;
    assert.ok(paths.includes('/storefront'));
    assert.ok(!paths.includes('/storefront.html'));
    assert.ok(paths.includes('/success'));
    assert.ok(paths.includes('/dashboard'));
  });
});

describe('Connect sample source stays aligned', () => {
  it('still builds the same checkout, subscription, and onboarding URLs', () => {
    const source = fs.readFileSync(sampleServerPath, 'utf8');
    assert.match(
      source,
      /success_url: `\$\{baseUrl\}\/success\?session_id=\{CHECKOUT_SESSION_ID\}&accountId=\$\{accountId\}`/
    );
    assert.match(source, /cancel_url: `\$\{baseUrl\}\/storefront\?accountId=\$\{accountId\}`/);
    assert.match(
      source,
      /success_url: `\$\{baseUrl\}\/subscription-success\?session_id=\{CHECKOUT_SESSION_ID\}&accountId=\$\{accountId\}`/
    );
    assert.match(source, /cancel_url: `\$\{baseUrl\}\/dashboard\?accountId=\$\{accountId\}`/);
    assert.match(
      source,
      /refresh_url: `\$\{process\.env\.DOMAIN \|\| 'http:\/\/localhost:3000'\}\/onboarding\?accountId=\$\{accountId\}`/
    );
    assert.match(
      source,
      /return_url: `\$\{process\.env\.DOMAIN \|\| 'http:\/\/localhost:3000'\}\/dashboard\?accountId=\$\{accountId\}`/
    );
    assert.match(source, /sessionId: session\.id/);
    assert.match(source, /res\.json\(\{\s*success: true,\s*sessionId: session\.id,\s*\}\)/);
  });
});
