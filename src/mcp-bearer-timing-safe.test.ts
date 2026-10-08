import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  productionUsesTimingSafeBearerCompare,
  sourceUsesTimingSafeEqual,
  validateAuthLoose,
} from './mcp-bearer-timing-safe.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('MCP Bearer compare is not timing-safe', () => {
  it('accepts a matching token with === and rejects a mismatch', () => {
    const key = 'super-secret-mcp-key';
    assert.equal(validateAuthLoose(`Bearer ${key}`, key), true);
    assert.equal(validateAuthLoose('Bearer almost-super-secret-mcp-key', key), false);
    assert.equal(validateAuthLoose('Bearer ', key), false);
    assert.equal(validateAuthLoose(undefined, key), false);
    assert.equal(productionUsesTimingSafeBearerCompare(), false);
  });
});

describe('MCP Bearer compare source stays aligned', () => {
  it('compares the token with === and never calls timingSafeEqual', () => {
    const source = readRepo('src/index.ts');
    const authStart = source.indexOf('function validateAuth');
    const authEnd = source.indexOf('async function handleRequest', authStart);
    const auth = source.slice(authStart, authEnd);

    assert.match(auth, /return token === mpcApiKey;/);
    assert.equal(sourceUsesTimingSafeEqual(auth), false);
    assert.equal(sourceUsesTimingSafeEqual(source), false);
    assert.equal(auth.includes('crypto'), false);
    assert.equal(productionUsesTimingSafeBearerCompare(), false);
  });
});
