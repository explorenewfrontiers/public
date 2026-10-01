import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sampleDir = path.join(repoRoot, 'stripe-connect-sample');

function readSample(relPath: string): string {
  return fs.readFileSync(path.join(sampleDir, relPath), 'utf8');
}

interface VercelEnvObject {
  description?: string;
  required?: boolean;
  default?: string;
}

interface VercelConfig {
  env?: Record<string, string | VercelEnvObject>;
  outputDirectory?: string;
  functions?: Record<string, unknown>;
}

describe('Connect Vercel env values are objects, not strings', () => {
  it('declares STRIPE_SECRET_KEY as { description, required } instead of a string', () => {
    const vercel = JSON.parse(readSample('vercel.json')) as VercelConfig;
    const secret = vercel.env?.STRIPE_SECRET_KEY;
    const publishable = vercel.env?.STRIPE_PUBLISHABLE_KEY;
    const webhook = vercel.env?.WEBHOOK_SECRET;
    const domain = vercel.env?.DOMAIN;

    assert.equal(typeof secret, 'object');
    assert.equal(typeof publishable, 'object');
    assert.equal(typeof webhook, 'object');
    assert.equal(typeof domain, 'object');
    assert.notEqual(typeof secret, 'string');

    assert.ok(secret && typeof secret === 'object' && secret.required === true);
    assert.ok(
      publishable && typeof publishable === 'object' && publishable.required === true
    );
  });

  it('never injects STRIPE_PUBLISHABLE_KEY into HTML or a config route', () => {
    const server = readSample('server.ts');
    const storefront = readSample('public/storefront.html');

    assert.equal(server.includes('STRIPE_PUBLISHABLE_KEY'), false);
    assert.equal(server.includes('/config'), false);
    assert.match(storefront, /pk_test_51234567890/);
    assert.equal(storefront.includes('STRIPE_PUBLISHABLE_KEY'), false);
  });
});
