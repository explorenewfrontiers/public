import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  dotenvUsesDefaultCwd,
  isCwdRelativeStaticRoot,
  resolveStaticFromCwd,
  resolveStaticFromModuleDir,
} from './cwd-runtime-paths.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('CWD-relative dotenv and static assets', () => {
  it('serves public/ from cwd, not the module directory', () => {
    assert.equal(isCwdRelativeStaticRoot('public'), true);

    const fromCwd = resolveStaticFromCwd('/repo', 'public');
    const fromModule = resolveStaticFromModuleDir(
      '/repo/stripe-connect-sample',
      'public'
    );

    assert.equal(fromCwd, '/repo/public');
    assert.equal(fromModule, '/repo/stripe-connect-sample/public');
    assert.notEqual(fromCwd, fromModule);
  });

  it('dotenv.config() without path uses cwd', () => {
    assert.equal(dotenvUsesDefaultCwd('dotenv.config()'), true);
    assert.equal(
      dotenvUsesDefaultCwd("dotenv.config({ path: '/app/.env' })"),
      false
    );
  });
});

describe('CWD runtime path source stays aligned', () => {
  it('Connect and catalog static/dotenv calls are cwd-relative', () => {
    const connect = readRepo('stripe-connect-sample/server.ts');
    const web = readRepo('src/web-server.ts');

    assert.match(connect, /dotenv\.config\(\)/);
    assert.equal(connect.includes('dotenv.config({'), false);
    assert.match(connect, /express\.static\('public'\)/);
    assert.equal(connect.includes("path.join(__dirname, 'public')"), false);
    assert.equal(connect.includes('import.meta.url'), false);

    assert.match(web, /express\.static\('public'\)/);
    assert.equal(web.includes("path.join("), false);
    assert.equal(web.includes('import.meta.url'), false);
  });
});
