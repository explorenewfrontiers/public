import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  EXPRESS_X_POWERED_BY_VALUE,
  productionDisablesXPoweredBy,
  sourceDisablesXPoweredBy,
  vercelHeaderNames,
  vercelSetsXPoweredBy,
} from './http-x-powered-by.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Express apps leave X-Powered-By enabled', () => {
  it('catalog website never disables x-powered-by', () => {
    const source = readRepo('src/web-server.ts');
    assert.match(source, /express\(\)/);
    assert.equal(sourceDisablesXPoweredBy(source), false);
    assert.equal(productionDisablesXPoweredBy(), false);
    assert.equal(EXPRESS_X_POWERED_BY_VALUE, 'Express');
  });

  it('Connect sample never disables x-powered-by', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    assert.match(source, /express\(\)/);
    assert.equal(sourceDisablesXPoweredBy(source), false);
    assert.equal(source.includes('helmet'), false);
  });

  it('Connect vercel.json does not override X-Powered-By', () => {
    const names = vercelHeaderNames(readRepo('stripe-connect-sample/vercel.json'));
    assert.equal(vercelSetsXPoweredBy(names), false);
    assert.ok(names.includes('X-Frame-Options'));
  });
});
