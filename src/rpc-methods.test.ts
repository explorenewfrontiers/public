import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatToolResult, resolveJsonRpcMethod } from './rpc-methods.js';

const toolNames = new Set(['list_customers', 'get_customer', 'create_payment_intent']);

describe('resolveJsonRpcMethod', () => {
  it('keeps the existing initialize / list_tools / call_tool methods', () => {
    assert.deepEqual(resolveJsonRpcMethod('initialize', undefined, toolNames), {
      kind: 'initialize',
    });
    assert.deepEqual(resolveJsonRpcMethod('list_tools', undefined, toolNames), {
      kind: 'list_tools',
    });
    assert.deepEqual(
      resolveJsonRpcMethod(
        'call_tool',
        { name: 'list_customers', arguments: { limit: 5 } },
        toolNames
      ),
      { kind: 'call_tool', name: 'list_customers', args: { limit: 5 } }
    );
  });

  it('accepts official MCP tools/list and tools/call methods', () => {
    assert.deepEqual(resolveJsonRpcMethod('tools/list', undefined, toolNames), {
      kind: 'list_tools',
    });
    assert.deepEqual(
      resolveJsonRpcMethod(
        'tools/call',
        { name: 'get_customer', arguments: { customer_id: 'cus_123' } },
        toolNames
      ),
      { kind: 'call_tool', name: 'get_customer', args: { customer_id: 'cus_123' } }
    );
  });

  it('treats README-style tool names as JSON-RPC methods', () => {
    assert.deepEqual(resolveJsonRpcMethod('list_customers', undefined, toolNames), {
      kind: 'call_tool',
      name: 'list_customers',
      args: {},
    });
    assert.deepEqual(
      resolveJsonRpcMethod('get_customer', { customer_id: 'cus_123' }, toolNames),
      { kind: 'call_tool', name: 'get_customer', args: { customer_id: 'cus_123' } }
    );
  });

  it('does not treat unknown methods as tools', () => {
    assert.deepEqual(resolveJsonRpcMethod('list_customers', undefined, new Set()), {
      kind: 'unknown',
    });
    assert.deepEqual(resolveJsonRpcMethod('not_a_method', {}, toolNames), {
      kind: 'unknown',
    });
  });

  it('acknowledges MCP initialized notifications', () => {
    assert.deepEqual(
      resolveJsonRpcMethod('notifications/initialized', undefined, toolNames),
      { kind: 'notification' }
    );
  });
});

describe('formatToolResult', () => {
  it('includes MCP content[] and the legacy type/text fields', () => {
    const formatted = formatToolResult({ ok: true });
    assert.equal(formatted.type, 'text');
    assert.equal(formatted.text, JSON.stringify({ ok: true }, null, 2));
    assert.deepEqual(formatted.content, [{ type: 'text', text: formatted.text }]);
  });
});
