import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  isJsonRpcBatch,
  isMcpSpecCallToolResult,
  jsonRpcMethodOf,
  jsonRpcVersionOf,
  wrapCallToolResult,
} from './mcp-rpc-result.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('MCP call_tool result envelope', () => {
  it('wraps Stripe payloads as { type, text } without a spec content array', () => {
    const wrapped = wrapCallToolResult({ id: 'cus_123', email: 'a@b.com' });

    assert.equal(wrapped.type, 'text');
    assert.match(wrapped.text, /cus_123/);
    assert.equal('content' in wrapped, false);
    assert.equal('isError' in wrapped, false);
    assert.equal(isMcpSpecCallToolResult(wrapped), false);

    const specShaped = {
      content: [{ type: 'text', text: wrapped.text }],
    };
    assert.equal(isMcpSpecCallToolResult(specShaped), true);
  });

  it('treats a JSON-RPC batch as a single request with no method', () => {
    const batch = [
      { jsonrpc: '2.0', method: 'initialize', id: 1 },
      { jsonrpc: '2.0', method: 'list_tools', id: 2 },
    ];

    assert.equal(isJsonRpcBatch(batch), true);
    assert.equal(jsonRpcMethodOf(batch), undefined);
    assert.equal(jsonRpcVersionOf(batch), undefined);

    const missingVersion = { method: 'initialize', id: 1 };
    assert.equal(jsonRpcMethodOf(missingVersion), 'initialize');
    assert.equal(jsonRpcVersionOf(missingVersion), undefined);
  });
});

describe('MCP RPC result source stays aligned', () => {
  it('returns type/text from JSON.stringify and never builds content[]', () => {
    const index = readRepo('src/index.ts');
    const readme = readRepo('README.md');

    assert.match(
      index,
      /result: \{\s*type: 'text',\s*text: JSON\.stringify\(result, null, 2\),\s*\}/
    );
    assert.equal(index.includes('content:'), false);
    assert.equal(index.includes('isError'), false);
    assert.equal(index.includes('Array.isArray'), false);
    assert.equal(index.includes("request.jsonrpc"), false);
    assert.equal(index.includes("parsed.jsonrpc"), false);

    assert.match(
      readme,
      /"result": \{\s*"type": "text",\s*"text": "\.\.\."\s*\}/
    );
    assert.equal(readme.includes('"content"'), false);
  });
});
