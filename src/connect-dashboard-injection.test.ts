import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  buildStorefrontNavigationUrl,
  buildStorefrontProductsFetchUrl,
  onboardingUrlIsSafeHref,
  renderOnboardingLink,
  renderRequirementItem,
} from './connect-dashboard-injection.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect dashboard HTML and query interpolation', () => {
  it('interpolates onboarding URLs and requirement names without escaping', () => {
    const payload = 'javascript:alert(1)';
    const linkHtml = renderOnboardingLink(payload);
    assert.equal(linkHtml.includes(`href="${payload}"`), true);
    assert.equal(onboardingUrlIsSafeHref(payload), false);
    assert.equal(onboardingUrlIsSafeHref('https://connect.stripe.com/setup/abc'), true);

    const requirement = '</li></ul><img src=x onerror=alert(1)>';
    assert.equal(renderRequirementItem(requirement), `<li>${requirement}</li>`);
  });

  it('navigates to the storefront with a raw accountId but encodes the products fetch', () => {
    const injected = 'acct_1&other=1#frag';
    assert.equal(buildStorefrontNavigationUrl(injected), `/storefront.html?accountId=${injected}`);
    assert.equal(
      buildStorefrontProductsFetchUrl(injected),
      `/api/products/${encodeURIComponent(injected)}`
    );
    assert.equal(buildStorefrontNavigationUrl(injected).includes(encodeURIComponent(injected)), false);
  });
});

describe('Connect dashboard injection source stays aligned', () => {
  it('still interpolates onboarding href, requirement li, and raw storefront query', () => {
    const dashboard = readRepo('stripe-connect-sample/public/index.html');
    const storefront = readRepo('stripe-connect-sample/public/storefront.html');

    assert.match(
      dashboard,
      /<p><a href="\$\{linkResult\.url\}" target="_blank"/
    );
    assert.match(dashboard, /requirementsHTML \+= `<li>\$\{req\}<\/li>`/);
    assert.match(
      dashboard,
      /window\.location\.href = `\/storefront\.html\?accountId=\$\{accountId\}`/
    );

    assert.match(storefront, /`\/api\/products\/\$\{encodeURIComponent\(accountId\)\}`/);
    assert.match(storefront, /accountId: accountId,/);
  });
});
