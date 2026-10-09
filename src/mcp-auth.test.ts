import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { isMcpAuthEnabled, validateBearerAuth } from './mcp-auth.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('isMcpAuthEnabled', () => {
  it('treats missing and empty keys as disabled', () => {
    assert.equal(isMcpAuthEnabled(undefined), false);
    assert.equal(isMcpAuthEnabled(''), false);
    assert.equal(isMcpAuthEnabled('secret-token'), true);
  });
});

describe('validateBearerAuth', () => {
  it('allows all requests when auth is disabled', () => {
    assert.equal(validateBearerAuth(undefined, undefined), true);
    assert.equal(validateBearerAuth(undefined, ''), true);
    assert.equal(validateBearerAuth('Bearer ', ''), true);
  });

  it('rejects missing or empty Bearer tokens when a key is set', () => {
    assert.equal(validateBearerAuth(undefined, 'secret-token'), false);
    assert.equal(validateBearerAuth('Bearer', 'secret-token'), false);
    assert.equal(validateBearerAuth('Bearer ', 'secret-token'), false);
    assert.equal(validateBearerAuth('Basic secret-token', 'secret-token'), false);
  });

  it('accepts the configured Bearer token', () => {
    assert.equal(validateBearerAuth('Bearer secret-token', 'secret-token'), true);
  });
});

describe('MCP Docker auth wiring', () => {
  it('passes MCP_API_KEY into the container and does not overlay dist', () => {
    const compose = readRepo('docker-compose.yml');
    assert.match(compose, /MCP_API_KEY=\$\{MCP_API_KEY\}/);
    assert.equal(compose.includes('./dist:/app/dist'), false);
  });

  it('builds dist inside the image instead of copying a host dist folder', () => {
    const dockerfile = readRepo('Dockerfile');
    assert.match(dockerfile, /COPY src \.\/src/);
    assert.match(dockerfile, /npm run build/);
    assert.equal(dockerfile.includes('COPY dist ./dist'), false);
  });

  it('uses validateBearerAuth so empty Compose keys cannot enable auth', () => {
    const index = readRepo('src/index.ts');
    assert.match(index, /from '\.\/mcp-auth\.js'/);
    assert.match(index, /validateBearerAuth\(/);
    assert.match(index, /isMcpAuthEnabled\(/);
  });
});
