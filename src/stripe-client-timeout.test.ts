import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  productionSetsStripeTimeout,
  sourceConfiguresStripeTimeoutOrRetries,
} from './stripe-client-timeout.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Stripe clients are constructed without timeout or retry caps', () => {
  it('MCP getStripeClient only sets apiVersion and optional stripeAccount', () => {
    const source = readRepo('src/index.ts');
    const start = source.indexOf('function getStripeClient');
    const end = source.indexOf('const tools:', start);
    const body = source.slice(start, end);

    assert.match(body, /apiVersion: '2024-11-20'/);
    assert.equal(sourceConfiguresStripeTimeoutOrRetries(body), false);
    assert.equal(body.includes('timeout'), false);
    assert.equal(body.includes('maxNetworkRetries'), false);
    assert.equal(productionSetsStripeTimeout(), false);
  });

  it('catalog website Stripe client has no timeout', () => {
    const webServer = readRepo('src/web-server.ts');
    assert.match(webServer, /new Stripe\(process\.env\.STRIPE_API_KEY \|\| ''\)/);
    assert.equal(sourceConfiguresStripeTimeoutOrRetries(webServer), false);
  });

  it('Connect Stripe client has no timeout or maxNetworkRetries', () => {
    const connect = readRepo('stripe-connect-sample/server.ts');
    assert.match(connect, /new Stripe\(STRIPE_SECRET_KEY\)/);
    assert.equal(sourceConfiguresStripeTimeoutOrRetries(connect), false);
  });
});
