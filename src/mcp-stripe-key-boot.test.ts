import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  catalogWebThrowsBeforeListen,
  connectThrowsWithoutSecretKey,
  mcpStripeKeyOrEmpty,
  mcpThrowsBeforeListen,
  stripeClientConfigured,
} from './mcp-stripe-key-boot.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('MCP and catalog Stripe key boot', () => {
  it('coerces a missing MCP key to empty and still boots', () => {
    assert.equal(mcpStripeKeyOrEmpty(undefined), '');
    assert.equal(mcpStripeKeyOrEmpty(''), '');
    assert.equal(mcpStripeKeyOrEmpty('sk_test_123'), 'sk_test_123');

    assert.equal(stripeClientConfigured(''), false);
    assert.equal(mcpThrowsBeforeListen(''), false);
    assert.equal(catalogWebThrowsBeforeListen(''), false);
  });

  it('Connect still fail-fasts on a missing secret (contrast)', () => {
    assert.equal(connectThrowsWithoutSecretKey(undefined), true);
    assert.equal(connectThrowsWithoutSecretKey(''), true);
    assert.equal(connectThrowsWithoutSecretKey('sk_test_123'), false);
  });
});

describe('Stripe key boot source stays aligned', () => {
  it('MCP and catalog construct Stripe with || "" and still listen', () => {
    const index = readRepo('src/index.ts');
    const web = readRepo('src/web-server.ts');
    const connect = readRepo('stripe-connect-sample/server.ts');

    assert.match(index, /const stripeApiKey = process\.env\.STRIPE_API_KEY \|\| ''/);
    assert.match(index, /return new Stripe\(stripeApiKey/);
    assert.match(index, /server\.listen\(port/);
    assert.equal(index.includes('if (!stripeApiKey)'), false);
    assert.equal(index.includes('STRIPE_API_KEY is not set'), false);

    assert.match(web, /new Stripe\(process\.env\.STRIPE_API_KEY \|\| ''\)/);
    assert.match(web, /app\.listen\(port/);
    assert.equal(web.includes('if (!process.env.STRIPE_API_KEY)'), false);

    assert.match(connect, /if \(!STRIPE_SECRET_KEY\)/);
    assert.match(connect, /throw new Error\(/);
  });
});
