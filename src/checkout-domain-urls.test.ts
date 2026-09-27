import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  catalogCancelUrl,
  catalogSuccessUrl,
  connectCheckoutSuccessUrl,
  connectOnboardingRefreshUrl,
  hasDoubleSlashInPath,
  isAbsoluteHttpUrl,
  joinDomainPath,
} from './checkout-domain-urls.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('checkout DOMAIN URL join', () => {
  it('double-slashes when DOMAIN already ends with /', () => {
    const domain = 'https://shop.example.com/';
    const success = catalogSuccessUrl(domain);
    const cancel = catalogCancelUrl(domain);
    const onboard = connectOnboardingRefreshUrl(domain, 'acct_1');
    const checkout = connectCheckoutSuccessUrl(domain, 'acct_1');

    assert.equal(success, 'https://shop.example.com//success?session_id={CHECKOUT_SESSION_ID}');
    assert.equal(cancel, 'https://shop.example.com//cancel');
    assert.equal(onboard, 'https://shop.example.com//onboarding?accountId=acct_1');
    assert.equal(
      checkout,
      'https://shop.example.com//success?session_id={CHECKOUT_SESSION_ID}&accountId=acct_1'
    );
    assert.equal(hasDoubleSlashInPath(success), true);
    assert.equal(hasDoubleSlashInPath(joinDomainPath(domain, 'success')), true);
  });

  it('is not an absolute URL when DOMAIN has no protocol', () => {
    const domain = 'shop.example.com';
    const success = catalogSuccessUrl(domain);
    assert.equal(success, 'shop.example.com/success?session_id={CHECKOUT_SESSION_ID}');
    assert.equal(isAbsoluteHttpUrl(success), false);
    assert.equal(isAbsoluteHttpUrl('https://shop.example.com/success'), true);
    assert.equal(isAbsoluteHttpUrl('http://localhost:3000/cancel'), true);
  });

  it('keeps the default localhost join absolute and single-slashed', () => {
    const domain = 'http://localhost:3000';
    assert.equal(catalogCancelUrl(domain), 'http://localhost:3000/cancel');
    assert.equal(isAbsoluteHttpUrl(catalogSuccessUrl(domain)), true);
    assert.equal(hasDoubleSlashInPath(catalogSuccessUrl(domain)), false);
  });
});

describe('checkout DOMAIN source stays aligned', () => {
  it('concatenates DOMAIN + /path with no slash or protocol guard', () => {
    const web = readRepo('src/web-server.ts');
    const connect = readRepo('stripe-connect-sample/server.ts');

    assert.match(
      web,
      /success_url: `\$\{process\.env\.DOMAIN \|\| 'http:\/\/localhost:3000'\}\/success\?session_id=\{CHECKOUT_SESSION_ID\}`/
    );
    assert.match(
      web,
      /cancel_url: `\$\{process\.env\.DOMAIN \|\| 'http:\/\/localhost:3000'\}\/cancel`/
    );
    assert.equal(web.includes('replace(/\\/+$/)'), false);
    assert.equal(web.includes('new URL('), false);

    assert.match(
      connect,
      /refresh_url: `\$\{process\.env\.DOMAIN \|\| 'http:\/\/localhost:3000'\}\/onboarding\?accountId=\$\{accountId\}`/
    );
    assert.match(
      connect,
      /success_url: `\$\{baseUrl\}\/success\?session_id=\{CHECKOUT_SESSION_ID\}&accountId=\$\{accountId\}`/
    );
    assert.match(connect, /const baseUrl = process\.env\.DOMAIN \|\| 'http:\/\/localhost:3000'/);
    assert.equal(connect.includes('replace(/\\/+$/)'), false);
  });
});
