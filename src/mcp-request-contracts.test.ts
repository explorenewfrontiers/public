import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  MCP_LIST_LIMIT_FALLBACK,
  buildCreateCustomerParams,
  jsonRpcErrorForCallToolParams,
  readCallToolArguments,
  readCallToolName,
  resolveMcpListLimit,
} from './mcp-request-contracts.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const knownTools = new Set(['list_customers', 'create_customer', 'get_customer']);

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('MCP list limit coalescing', () => {
  it('defaults missing, 0, NaN, and empty-string limits to 10', () => {
    assert.equal(MCP_LIST_LIMIT_FALLBACK, 10);
    assert.equal(resolveMcpListLimit(undefined), 10);
    assert.equal(resolveMcpListLimit(0), 10);
    assert.equal(resolveMcpListLimit(Number.NaN), 10);
    assert.equal(resolveMcpListLimit(''), 10);
    assert.equal(resolveMcpListLimit(null), 10);
  });

  it('forwards a positive numeric limit and a negative limit (truthy) unchanged', () => {
    assert.equal(resolveMcpListLimit(25), 25);
    assert.equal(resolveMcpListLimit(-5), -5);
  });
});

describe('MCP call_tool params access', () => {
  it('throws when params is missing, mapping to JSON-RPC internal error', () => {
    assert.throws(() => readCallToolName(undefined), TypeError);
    assert.throws(() => readCallToolName(null), TypeError);

    const missing = jsonRpcErrorForCallToolParams(undefined, knownTools);
    assert.equal(missing?.code, -32603);
    assert.match(String(missing?.message), /Cannot read propert/i);

    const fromNull = jsonRpcErrorForCallToolParams(null, knownTools);
    assert.equal(fromNull?.code, -32603);
  });

  it('returns Tool not found when name is missing but params is an object', () => {
    assert.deepEqual(jsonRpcErrorForCallToolParams({ arguments: {} }, knownTools), {
      code: -32601,
      message: 'Tool not found',
    });
    assert.deepEqual(jsonRpcErrorForCallToolParams({ name: 'nope' }, knownTools), {
      code: -32601,
      message: 'Tool not found',
    });
  });

  it('treats missing or null arguments as an empty object', () => {
    assert.deepEqual(readCallToolArguments({ name: 'list_customers' }), {});
    assert.deepEqual(readCallToolArguments({ name: 'list_customers', arguments: null }), {});
    assert.deepEqual(readCallToolArguments({ name: 'get_customer', arguments: { customer_id: 'cus_1' } }), {
      customer_id: 'cus_1',
    });
    assert.equal(jsonRpcErrorForCallToolParams({ name: 'list_customers' }, knownTools), null);
  });
});

describe('create_customer required email is not enforced in the handler', () => {
  it('forwards a missing email as undefined', () => {
    assert.deepEqual(buildCreateCustomerParams({ name: 'Ada' }), {
      email: undefined,
      name: 'Ada',
      description: undefined,
    });
  });

  it('forwards an empty-string email without validating format', () => {
    assert.deepEqual(buildCreateCustomerParams({ email: '', name: 'Ada' }), {
      email: '',
      name: 'Ada',
      description: undefined,
    });
    assert.deepEqual(buildCreateCustomerParams({ email: 'not-an-email' }), {
      email: 'not-an-email',
      name: undefined,
      description: undefined,
    });
  });
});

describe('MCP request contract source stays aligned', () => {
  it('still uses || 10 for list limits and reads params.name without a null check', () => {
    const source = readRepo('src/index.ts');

    assert.match(source, /limit: \(input\.limit as number\) \|\| 10/);
    assert.equal((source.match(/limit: \(input\.limit as number\) \|\| 10/g) || []).length, 3);
    assert.match(source, /getStripeProducts\(client, \(input\.limit as number\) \|\| 10\)/);

    assert.match(
      source,
      /const params = request\.params as \{ name: string; arguments: Record<string, unknown> \};/
    );
    assert.match(source, /if \(!params\.name \|\| !tools\[params\.name\]\)/);
    assert.match(source, /params\.arguments \|\| \{\}/);
    assert.match(source, /code: -32603/);

    assert.match(source, /required: \['email'\]/);
    assert.match(
      source,
      /email: input\.email as string,\s*name: input\.name as string,\s*description: input\.description as string/
    );
  });
});
