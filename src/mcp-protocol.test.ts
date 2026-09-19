import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  MCP_HANDLED_METHODS,
  MCP_SPEC_TOOL_METHODS,
  README_CURL_RPC_METHOD,
  classifyMcpMethod,
  isHandledMcpMethod,
} from './mcp-protocol.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('MCP JSON-RPC method dispatch', () => {
  it('handles only initialize, list_tools, and call_tool', () => {
    assert.deepEqual(MCP_HANDLED_METHODS, ['initialize', 'list_tools', 'call_tool']);
    for (const method of MCP_HANDLED_METHODS) {
      assert.equal(isHandledMcpMethod(method), true);
      assert.equal(classifyMcpMethod(method), 'handled');
    }
  });

  it('rejects MCP-spec tool methods that real clients send', () => {
    for (const method of MCP_SPEC_TOOL_METHODS) {
      assert.equal(isHandledMcpMethod(method), false);
      assert.equal(classifyMcpMethod(method), 'spec-only');
    }
  });

  it('rejects the README curl method that names a tool instead of call_tool', () => {
    assert.equal(README_CURL_RPC_METHOD, 'list_customers');
    assert.equal(isHandledMcpMethod(README_CURL_RPC_METHOD), false);
    assert.equal(classifyMcpMethod(README_CURL_RPC_METHOD), 'tool-as-method');
  });
});

describe('MCP protocol source stays aligned', () => {
  it('index.ts method switch does not handle tools/list, tools/call, or list_customers', () => {
    const source = readRepo('src/index.ts');
    const methodSwitchStart = source.indexOf('switch (request.method)');
    const methodSwitchEnd = source.indexOf('default:', methodSwitchStart);
    const methodSwitch = source.slice(methodSwitchStart, methodSwitchEnd);

    assert.ok(methodSwitchStart >= 0);
    assert.match(methodSwitch, /case 'initialize':/);
    assert.match(methodSwitch, /case 'list_tools':/);
    assert.match(methodSwitch, /case 'call_tool':/);
    assert.equal(methodSwitch.includes("case 'tools/list'"), false);
    assert.equal(methodSwitch.includes("case 'tools/call'"), false);
    assert.equal(methodSwitch.includes("case 'list_customers'"), false);
    assert.match(source, /message: 'Method not found'/);
  });

  it('README curl example sends method list_customers', () => {
    const readme = readRepo('README.md');
    assert.match(
      readme,
      /-d '\{"jsonrpc":"2\.0","method":"list_customers","id":1\}'/
    );
  });
});
