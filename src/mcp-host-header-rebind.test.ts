import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  hostIsAllowed,
  productionValidatesRequestHost,
  sourceValidatesRequestHost,
} from './mcp-host-header-rebind.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('MCP Host header is not an allowlisted origin check', () => {
  it('treats attacker and duplicate Host values as disallowed', () => {
    const allowlist = ['localhost', '127.0.0.1'] as const;

    assert.equal(hostIsAllowed('localhost:8000', allowlist), true);
    assert.equal(hostIsAllowed('127.0.0.1:8000', allowlist), true);
    assert.equal(hostIsAllowed('rebind.example:8000', allowlist), false);
    assert.equal(hostIsAllowed('metadata.google.internal', allowlist), false);
    assert.equal(hostIsAllowed(['localhost', 'evil.test'], allowlist), false);
    assert.equal(hostIsAllowed(undefined, allowlist), false);
    assert.equal(productionValidatesRequestHost(), false);
  });
});

describe('MCP HTTP source stays aligned', () => {
  it('createServer never reads Host before handling JSON-RPC', () => {
    const source = readRepo('src/index.ts');
    const start = source.indexOf('http.createServer');
    const end = source.indexOf('server.listen');
    const handler = source.slice(start, end);

    assert.equal(sourceValidatesRequestHost(handler), false);
    assert.equal(handler.includes('req.headers.host'), false);
    assert.equal(handler.includes("req.headers['host']"), false);
    assert.match(handler, /req\.headers\['stripe-account'\]/);
    assert.match(source, /server\.listen\(\s*port/);
  });
});
