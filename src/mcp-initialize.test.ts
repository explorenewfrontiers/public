import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  initializeResult,
  MCP_PROTOCOL_VERSION,
  negotiatedProtocolVersion,
} from './mcp-initialize.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('MCP initialize handshake', () => {
  it('ignores the client protocolVersion and always returns 2024-11-05', () => {
    const newerClient = initializeResult({
      protocolVersion: '2025-03-26',
      clientInfo: { name: 'claude-code', version: '1.0' },
    });
    const missingParams = initializeResult(undefined);

    assert.equal(newerClient.protocolVersion, MCP_PROTOCOL_VERSION);
    assert.equal(missingParams.protocolVersion, '2024-11-05');
    assert.equal(
      negotiatedProtocolVersion({ protocolVersion: '2025-03-26' }),
      '2024-11-05'
    );
    assert.deepEqual(newerClient.capabilities, { tools: {} });
    assert.equal(newerClient.serverInfo.name, 'stripe-mcp');
    assert.equal(newerClient.serverInfo.version, '1.0.0');
    assert.equal('instructions' in newerClient, false);
  });
});

describe('MCP initialize source stays aligned', () => {
  it('initialize case does not read request.params', () => {
    const index = readRepo('src/index.ts');
    const initializeBlock = index.slice(
      index.indexOf("case 'initialize'"),
      index.indexOf("case 'list_tools'")
    );

    assert.match(
      initializeBlock,
      /case 'initialize':\s*return \{\s*jsonrpc: '2\.0',\s*id: request\.id,\s*result: \{\s*protocolVersion: '2024-11-05'/
    );
    assert.equal(initializeBlock.includes('request.params'), false);
    assert.equal(initializeBlock.includes('protocolVersion'), true);
    assert.equal(index.includes('params.protocolVersion'), false);
    assert.match(
      initializeBlock,
      /capabilities:\s*\{\s*tools:\s*\{\s*\},?\s*\}/
    );
    assert.match(
      initializeBlock,
      /serverInfo:\s*\{\s*name: 'stripe-mcp',\s*version: '1\.0\.0'/
    );
  });
});
