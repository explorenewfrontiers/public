import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  anonymousSdkTrafficWouldBeUnattributed,
  sourceConstructsStripeWithAppInfo,
  stripeClientSetsAppInfo,
  stripeConstructorCallCount,
} from './stripe-client-app-info.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Stripe clients omit appInfo so API traffic is unattributed', () => {
  it('only a non-empty appInfo.name counts as identifying the integration', () => {
    assert.equal(stripeClientSetsAppInfo(undefined), false);
    assert.equal(stripeClientSetsAppInfo({}), false);
    assert.equal(stripeClientSetsAppInfo({ apiVersion: '2024-11-20' }), false);
    assert.equal(
      stripeClientSetsAppInfo({ appInfo: { name: '' } }),
      false
    );
    assert.equal(
      stripeClientSetsAppInfo({ appInfo: { name: 'stripe-mcp', version: '1.0.0' } }),
      true
    );
    assert.equal(
      anonymousSdkTrafficWouldBeUnattributed({
        setsAppInfo: false,
        constructsStripe: true,
      }),
      true
    );
    assert.equal(
      anonymousSdkTrafficWouldBeUnattributed({
        setsAppInfo: true,
        constructsStripe: true,
      }),
      false
    );
  });

  it('MCP getStripeClient only sets apiVersion and stripeAccount', () => {
    const source = readRepo('src/index.ts');

    assert.equal(stripeConstructorCallCount(source), 1);
    assert.equal(sourceConstructsStripeWithAppInfo(source), false);
    assert.match(source, /apiVersion:\s*['"]2024-11-20['"]/);
    assert.match(source, /options\.stripeAccount\s*=\s*stripeAccount/);
    assert.match(source, /return new Stripe\(\s*stripeApiKey,\s*options\s*\)/);
  });

  it('catalog and Connect construct Stripe with the secret key and no appInfo', () => {
    const catalog = readRepo('src/web-server.ts');
    const connect = readRepo('stripe-connect-sample/server.ts');

    assert.equal(stripeConstructorCallCount(catalog), 1);
    assert.equal(stripeConstructorCallCount(connect), 1);
    assert.equal(sourceConstructsStripeWithAppInfo(catalog), false);
    assert.equal(sourceConstructsStripeWithAppInfo(connect), false);
    assert.match(catalog, /new Stripe\(\s*process\.env\.STRIPE_API_KEY\s*\|\|\s*['"]{2}\s*\)/);
    assert.match(connect, /new Stripe\(\s*STRIPE_SECRET_KEY\s*\)/);
    assert.equal(
      anonymousSdkTrafficWouldBeUnattributed({
        setsAppInfo: false,
        constructsStripe: true,
      }),
      true
    );
  });
});
