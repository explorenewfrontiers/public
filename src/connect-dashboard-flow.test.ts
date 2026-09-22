import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  DASHBOARD_ONBOARDING_READY_COPY,
  PRODUCT_ACCOUNT_FIELD_ID,
  accountCreateFieldsAccepted,
  dashboardClaimsReadyToAcceptPayments,
  productAccountIdSurvivesSuccessfulCreate,
  renderProductCreatedInfo,
  shouldOfferOnboardingLink,
} from './connect-dashboard-flow.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('dashboard onboarding complete vs payment readiness', () => {
  it('offers an onboarding link only when onboardingComplete is false', () => {
    assert.equal(
      shouldOfferOnboardingLink({
        onboardingComplete: false,
        readyToProcessPayments: false,
      }),
      true
    );
    assert.equal(
      shouldOfferOnboardingLink({
        onboardingComplete: true,
        readyToProcessPayments: false,
      }),
      false
    );
  });

  it('claims payment-ready from onboardingComplete even when card payments are inactive', () => {
    assert.equal(
      dashboardClaimsReadyToAcceptPayments({
        onboardingComplete: true,
        readyToProcessPayments: false,
      }),
      true
    );
    assert.equal(
      dashboardClaimsReadyToAcceptPayments({
        onboardingComplete: false,
        readyToProcessPayments: true,
      }),
      false
    );
    assert.match(DASHBOARD_ONBOARDING_READY_COPY, /ready to accept payments/);
  });
});

describe('dashboard product form reset and created-product HTML', () => {
  it('clears the autofilled product account id after a successful create', () => {
    assert.equal(productAccountIdSurvivesSuccessfulCreate(), false);
    assert.equal(PRODUCT_ACCOUNT_FIELD_ID, 'productAccountId');
  });

  it('interpolates product name into innerHTML without escaping', () => {
    const html = renderProductCreatedInfo(
      { id: 'prod_1', name: '<img src=x onerror=alert(1)>' },
      '9.99',
      'USD'
    );
    assert.match(html, /<strong>Name:<\/strong> <img src=x onerror=alert\(1\)><br>/);
    assert.match(html, /<strong>Product ID:<\/strong> prod_1/);
  });
});

describe('account create email is any truthy string', () => {
  it('rejects missing or empty fields and accepts invalid or whitespace emails', () => {
    assert.equal(accountCreateFieldsAccepted('Shop', 'owner@example.com'), true);
    assert.equal(accountCreateFieldsAccepted('Shop', 'not-an-email'), true);
    assert.equal(accountCreateFieldsAccepted('Shop', ' '), true);
    assert.equal(accountCreateFieldsAccepted('Shop', ''), false);
    assert.equal(accountCreateFieldsAccepted('', 'owner@example.com'), false);
    assert.equal(accountCreateFieldsAccepted(undefined, 'owner@example.com'), false);
  });
});

describe('Connect dashboard source stays aligned', () => {
  it('still branches only on onboardingComplete and resets the product form', () => {
    const dashboard = readRepo('stripe-connect-sample/public/index.html');
    const server = readRepo('stripe-connect-sample/server.ts');

    assert.match(dashboard, /if \(!statusResult\.onboardingComplete\)/);
    assert.match(
      dashboard,
      /Onboarding complete! This account is ready to accept payments\./
    );
    assert.equal(dashboard.includes('readyToProcessPayments'), true);
    assert.equal(
      dashboard.includes('if (!statusResult.readyToProcessPayments)'),
      false
    );
    assert.equal(
      dashboard.includes('statusResult.readyToProcessPayments &&'),
      false
    );

    assert.match(dashboard, /createProductForm'\).reset\(\)/);
    assert.match(dashboard, /id="productAccountId"/);
    assert.match(
      dashboard,
      /<strong>Name:<\/strong> \$\{result\.product\.name\}/
    );

    assert.match(server, /if \(!displayName \|\| !contactEmail\)/);
    assert.equal(server.includes('contactEmail.includes('), false);
    assert.equal(/contactEmail\s*\.match\(/.test(server), false);
  });
});
