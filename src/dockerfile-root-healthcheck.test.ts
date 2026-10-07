import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  dockerfileDeclaresNonRootUser,
  dockerfileHasHealthcheck,
  productionRootImageHasHealthcheck,
  productionRootImageRunsAsRoot,
} from './dockerfile-root-healthcheck.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('root MCP Dockerfile runs as root without a healthcheck', () => {
  it('treats a missing USER as root and a missing HEALTHCHECK as unmonitored', () => {
    const bare = 'FROM node:18-alpine\nCMD ["node", "dist/index.js"]\n';
    assert.equal(dockerfileDeclaresNonRootUser(bare), false);
    assert.equal(dockerfileHasHealthcheck(bare), false);

    const hardened = 'FROM node:18-alpine\nUSER node\nHEALTHCHECK CMD wget -qO- http://127.0.0.1:8000/\n';
    assert.equal(dockerfileDeclaresNonRootUser(hardened), true);
    assert.equal(dockerfileHasHealthcheck(hardened), true);
    assert.equal(dockerfileDeclaresNonRootUser('USER root\n'), false);

    assert.equal(productionRootImageRunsAsRoot(), true);
    assert.equal(productionRootImageHasHealthcheck(), false);
  });
});

describe('Dockerfile source stays aligned', () => {
  it('root image has no USER and no HEALTHCHECK; Connect has HEALTHCHECK only', () => {
    const root = readRepo('Dockerfile');
    assert.match(root, /FROM node:18-alpine/);
    assert.match(root, /CMD \["node", "dist\/index\.js"\]/);
    assert.equal(dockerfileDeclaresNonRootUser(root), false);
    assert.equal(dockerfileHasHealthcheck(root), false);
    assert.equal(/^\s*USER\b/m.test(root), false);
    assert.equal(/^\s*HEALTHCHECK\b/m.test(root), false);

    const connect = readRepo('stripe-connect-sample/Dockerfile');
    assert.equal(dockerfileHasHealthcheck(connect), true);
    assert.equal(dockerfileDeclaresNonRootUser(connect), false);
    assert.match(connect, /HEALTHCHECK --interval=30s/);
  });
});
