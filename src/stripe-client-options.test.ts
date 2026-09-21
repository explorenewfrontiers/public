import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  STRIPE_API_VERSION,
  stripeClientOptions,
} from './stripe-client-options.js';

const srcDir = path.dirname(fileURLToPath(import.meta.url));
const repoSrc = srcDir.endsWith(`${path.sep}dist`)
  ? path.resolve(srcDir, '..', 'src')
  : srcDir;

describe('stripeClientOptions', () => {
  it('pins the API version shipped with stripe@15, not 2024-11-20', () => {
    const options = stripeClientOptions();
    assert.equal(options.apiVersion, '2024-04-10');
    assert.equal(STRIPE_API_VERSION, '2024-04-10');
    assert.notEqual(options.apiVersion, '2024-11-20');
  });

  it('forwards a connected-account header when provided', () => {
    const options = stripeClientOptions('acct_123');
    assert.equal(options.stripeAccount, 'acct_123');
    assert.equal(options.apiVersion, '2024-04-10');
  });

  it('omits stripeAccount when none is passed', () => {
    const options = stripeClientOptions();
    assert.equal(options.stripeAccount, undefined);
  });

  it('does not hard-code the invalid 2024-11-20 version in the MCP server', () => {
    const indexSrc = fs.readFileSync(path.join(repoSrc, 'index.ts'), 'utf8');
    assert.equal(indexSrc.includes("apiVersion: '2024-11-20'"), false);
    assert.equal(indexSrc.includes('stripeClientOptions'), true);
  });
});
