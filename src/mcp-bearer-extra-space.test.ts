import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  productionSplitsAuthorizationOnSingleSpace,
  validateAuthSingleSpaceSplit,
} from './mcp-bearer-extra-space.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Bearer parsing splits on a single ASCII space', () => {
  it('accepts a well-formed Bearer token and rejects extra whitespace', () => {
    const apiKey = 'mcp-secret-key';
    assert.equal(validateAuthSingleSpaceSplit('Bearer mcp-secret-key', apiKey), true);
    assert.equal(validateAuthSingleSpaceSplit('Bearer  mcp-secret-key', apiKey), false);
    assert.equal(validateAuthSingleSpaceSplit('Bearer   mcp-secret-key', apiKey), false);
    assert.equal(validateAuthSingleSpaceSplit('Bearer\tmcp-secret-key', apiKey), false);
    assert.equal(validateAuthSingleSpaceSplit(' Bearer mcp-secret-key', apiKey), false);
    assert.equal(validateAuthSingleSpaceSplit('Bearer\tmcp-secret-key'.replace('\t', ' '), apiKey), true);
  });

  it('double-space Authorization uses the empty string as the token', () => {
    const [scheme, token] = 'Bearer  mcp-secret-key'.split(' ');
    assert.equal(scheme, 'Bearer');
    assert.equal(token, '');
    assert.equal(validateAuthSingleSpaceSplit('Bearer  mcp-secret-key', ''), true);
    assert.equal(validateAuthSingleSpaceSplit('Bearer  mcp-secret-key', 'mcp-secret-key'), false);
  });
});

describe('Bearer extra-space source stays aligned', () => {
  it('validateAuth splits Authorization on a single space only', () => {
    const source = readRepo('src/index.ts');
    const start = source.indexOf('function validateAuth');
    const end = source.indexOf('async function handleRequest', start);
    const body = source.slice(start, end);

    assert.equal(productionSplitsAuthorizationOnSingleSpace(body), true);
    assert.match(body, /authHeader\.split\(' '\)/);
    assert.equal(body.includes('split(/\\s+/)'), false);
    assert.equal(body.includes('trim()'), false);
  });
});
