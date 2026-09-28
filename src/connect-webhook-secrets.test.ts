import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  CONNECT_WEBHOOK_PATHS,
  CONNECT_WEBHOOK_SECRET_ENV,
  connectThinWebhookSecretEnv,
  connectWebhookEndpointsShareOneSecret,
  resolveWebhookSigningSecret,
} from './connect-webhook-secrets.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readSample(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, 'stripe-connect-sample', relPath), 'utf8');
}

describe('Connect webhook signing secrets', () => {
  it('uses one env var for both v1 and thin endpoints, including empty', () => {
    assert.equal(CONNECT_WEBHOOK_PATHS.length, 2);
    assert.deepEqual([...CONNECT_WEBHOOK_PATHS], ['/webhook', '/webhook/thin']);
    assert.equal(connectThinWebhookSecretEnv(), CONNECT_WEBHOOK_SECRET_ENV);
    assert.equal(connectWebhookEndpointsShareOneSecret(), true);
    assert.equal(resolveWebhookSigningSecret(undefined), '');
    assert.equal(resolveWebhookSigningSecret(''), '');
    assert.equal(resolveWebhookSigningSecret('whsec_v1'), 'whsec_v1');
  });
});

describe('Connect webhook secret source stays aligned', () => {
  it('constructEvent and parseThinEvent both read WEBHOOK_SECRET || \'\'', () => {
    const server = readSample('server.ts');
    const envExample = readSample('.env.example');

    assert.match(server, /const WEBHOOK_SECRET = process\.env\.WEBHOOK_SECRET/);
    assert.match(
      server,
      /stripeClient\.webhooks\.constructEvent\(\s*req\.body,\s*sig,\s*WEBHOOK_SECRET \|\| ''/
    );
    assert.match(
      server,
      /stripeClient\.parseThinEvent\(\s*req\.body,\s*sig,\s*WEBHOOK_SECRET \|\| ''/
    );
    assert.equal(server.includes('THIN_WEBHOOK_SECRET'), false);
    assert.equal(server.includes('WEBHOOK_SECRET_THIN'), false);
    assert.equal(envExample.includes('THIN_WEBHOOK_SECRET'), false);
    assert.match(envExample, /^WEBHOOK_SECRET=/m);
  });
});
