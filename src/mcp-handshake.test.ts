import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  MCP_DISPATCHED_METHODS,
  MCP_HANDSHAKE_METHODS,
  jsonRpcNotificationGetsHttpBody,
  mcpDispatchesMethod,
  mcpHandshakeError,
} from './mcp-handshake.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('MCP handshake methods are rejected', () => {
  it('does not dispatch notifications/initialized, cancelled, or ping', () => {
    for (const method of MCP_DISPATCHED_METHODS) {
      assert.equal(mcpDispatchesMethod(method), true);
    }
    for (const method of MCP_HANDSHAKE_METHODS) {
      assert.equal(mcpDispatchesMethod(method), false);
    }
    assert.deepEqual(mcpHandshakeError(), { code: -32601, message: 'Method not found' });
  });

  it('still writes a JSON-RPC body for notifications that have no id', () => {
    assert.equal(jsonRpcNotificationGetsHttpBody(undefined), true);
    assert.equal(jsonRpcNotificationGetsHttpBody(null), true);
    assert.equal(jsonRpcNotificationGetsHttpBody('1'), true);
  });
});

describe('MCP handshake source stays aligned', () => {
  it('method switch has no handshake cases and HTTP always serializes the response', () => {
    const source = readRepo('src/index.ts');
    const methodSwitchStart = source.indexOf('switch (request.method)');
    const methodSwitchEnd = source.indexOf('default:', methodSwitchStart);
    const methodSwitch = source.slice(methodSwitchStart, methodSwitchEnd);

    assert.ok(methodSwitchStart >= 0);
    assert.match(methodSwitch, /case 'initialize':/);
    assert.match(methodSwitch, /case 'list_tools':/);
    assert.match(methodSwitch, /case 'call_tool':/);
    assert.equal(methodSwitch.includes("case 'notifications/initialized'"), false);
    assert.equal(methodSwitch.includes("case 'notifications/cancelled'"), false);
    assert.equal(methodSwitch.includes("case 'ping'"), false);
    assert.match(source, /message: 'Method not found'/);
    assert.match(source, /res\.end\(\s*JSON\.stringify\(response\)\s*\)/);
  });
});
