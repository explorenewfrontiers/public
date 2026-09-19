import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  CHECKOUT_CANCEL_PATH,
  DASHBOARD_STOREFRONT_PATH,
  buildCheckoutCancelUrl,
  buildDashboardStorefrontHref,
} from './connect-storefront-path.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sampleDir = path.join(repoRoot, 'stripe-connect-sample');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect storefront path mismatch', () => {
  it('dashboard and checkout cancel disagree on the storefront path', () => {
    assert.equal(DASHBOARD_STOREFRONT_PATH, '/storefront.html');
    assert.equal(CHECKOUT_CANCEL_PATH, '/storefront');
    assert.notEqual(DASHBOARD_STOREFRONT_PATH, CHECKOUT_CANCEL_PATH);

    assert.equal(
      buildDashboardStorefrontHref('acct_1'),
      '/storefront.html?accountId=acct_1'
    );
    assert.equal(
      buildCheckoutCancelUrl('acct_1'),
      'http://localhost:3000/storefront?accountId=acct_1'
    );
  });
});

describe('Connect storefront path source stays aligned', () => {
  it('dashboard opens storefront.html while checkout cancel_url omits the extension', () => {
    const dashboard = readRepo('stripe-connect-sample/public/index.html');
    const server = readRepo('stripe-connect-sample/server.ts');

    assert.match(
      dashboard,
      /window\.location\.href = `\/storefront\.html\?accountId=\$\{accountId\}`/
    );
    assert.match(server, /cancel_url: `\$\{baseUrl\}\/storefront\?accountId=\$\{accountId\}`/);
    assert.equal(fs.existsSync(path.join(sampleDir, 'public/storefront.html')), true);
    assert.equal(fs.existsSync(path.join(sampleDir, 'public/storefront')), false);
  });
});
