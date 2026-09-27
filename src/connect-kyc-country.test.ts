import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  CONNECT_ACCOUNT_COUNTRY,
  connectProductCurrency,
  isOnboardingComplete,
} from './connect-kyc-country.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect KYC status and country', () => {
  it('treats non-due requirement statuses as onboarding complete', () => {
    assert.equal(isOnboardingComplete('currently_due'), false);
    assert.equal(isOnboardingComplete('past_due'), false);
    assert.equal(isOnboardingComplete(undefined), true);
    assert.equal(isOnboardingComplete('eventually_due'), true);
    assert.equal(isOnboardingComplete('pending_verification'), true);
    assert.equal(isOnboardingComplete('restricted'), true);
    assert.equal(isOnboardingComplete('disabled'), true);
    assert.equal(isOnboardingComplete('complete'), true);
  });

  it('hardcodes the connected-account country to us', () => {
    assert.equal(CONNECT_ACCOUNT_COUNTRY, 'us');
  });

  it('forwards product currency without lowercasing', () => {
    assert.equal(connectProductCurrency('USD'), 'USD');
    assert.equal(connectProductCurrency('eur'), 'eur');
    assert.equal(connectProductCurrency(''), 'usd');
    assert.equal(connectProductCurrency(undefined), 'usd');
  });
});

describe('Connect KYC source stays aligned', () => {
  it('uses the two-status complete check, country us, and raw currency', () => {
    const connect = readRepo('stripe-connect-sample/server.ts');

    assert.match(
      connect,
      /const onboardingComplete =\s+requirementsStatus !== 'currently_due' &&\s+requirementsStatus !== 'past_due'/
    );
    assert.equal(connect.includes("=== 'complete'"), false);
    assert.equal(connect.includes('eventually_due'), false);
    assert.equal(connect.includes('pending_verification'), false);

    assert.match(connect, /country: 'us'/);
    assert.equal(/country:\s*contactCountry|country:\s*country/.test(connect), false);

    assert.match(connect, /currency: currency \|\| 'usd'/);
    const productBlock = connect.slice(connect.indexOf('default_price_data:'));
    assert.equal(productBlock.slice(0, 250).includes('toLowerCase()'), false);
  });
});
