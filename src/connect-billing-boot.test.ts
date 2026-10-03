import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  connectBillingPortalParams,
  connectSecretKeyBootError,
} from './connect-billing-boot.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect billing portal and secret-key boot', () => {
  it('creates a portal session without a configuration id', () => {
    const params = connectBillingPortalParams({
      accountId: 'acct_1',
      domain: 'http://localhost:3000',
    });

    assert.equal(params.customer_account, 'acct_1');
    assert.equal(params.configuration, undefined);
    assert.equal(
      params.return_url,
      'http://localhost:3000/dashboard?accountId=acct_1'
    );
  });

  it('throws at import when STRIPE_SECRET_KEY is missing (before listen)', () => {
    assert.match(
      connectSecretKeyBootError(undefined) ?? '',
      /STRIPE_SECRET_KEY is not set/
    );
    assert.match(
      connectSecretKeyBootError('') ?? '',
      /STRIPE_SECRET_KEY is not set/
    );
    assert.equal(connectSecretKeyBootError('sk_test_123'), undefined);
  });
});

describe('Connect billing and boot source stays aligned', () => {
  it('portal create omits configuration and secret key is required before listen', () => {
    const server = readRepo('stripe-connect-sample/server.ts');
    const dockerfile = readRepo('stripe-connect-sample/Dockerfile');

    assert.match(server, /billingPortal\.sessions\.create/);
    const portalBlock = server.slice(server.indexOf('billingPortal.sessions.create'));
    const portalCreate = portalBlock.slice(0, portalBlock.indexOf('res.json'));
    assert.equal(portalCreate.includes('configuration:'), false);
    assert.equal(portalCreate.includes('configuration,'), false);
    assert.match(
      server,
      /if \(!STRIPE_SECRET_KEY\) \{\s*throw new Error\(/
    );
    assert.match(server, /app\.listen\(PORT/);
    assert.ok(server.indexOf('STRIPE_SECRET_KEY is not set') < server.indexOf('app.listen'));

    assert.match(dockerfile, /HEALTHCHECK/);
    assert.match(dockerfile, /localhost:3000/);
  });
});
