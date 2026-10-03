import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  isJsonContentType,
  isJsonRpcV2,
  isMcpAuthEnabled,
  validateMcpAuth,
  validateMcpAuthAsProduction,
} from './mcp-auth-envelope.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('MCP empty API key and Authorization header edges', () => {
  it('treats MCP_API_KEY="" as auth-enabled, and empty Bearer matches it', () => {
    assert.equal(isMcpAuthEnabled(undefined), false);
    assert.equal(isMcpAuthEnabled(''), true);
    assert.equal(isMcpAuthEnabled('secret'), true);

    assert.equal(validateMcpAuthAsProduction('Bearer ', ''), true);
    assert.equal(validateMcpAuthAsProduction('Bearer', ''), false);
    assert.equal(validateMcpAuthAsProduction('Bearer secret', ''), false);
    assert.equal(validateMcpAuthAsProduction(undefined, ''), false);
  });

  it('rejects lowercase bearer and throws when Authorization is a string[]', () => {
    assert.equal(validateMcpAuthAsProduction('bearer secret', 'secret'), false);
    assert.equal(validateMcpAuthAsProduction('Bearer secret', 'secret'), true);

    assert.throws(
      () =>
        validateMcpAuthAsProduction(
          ['Bearer secret', 'Bearer other'],
          'secret'
        ),
      TypeError
    );

    assert.equal(
      validateMcpAuth(['Bearer secret', 'Bearer other'], 'secret'),
      true
    );
  });

  it('does not require jsonrpc 2.0 or application/json before dispatch', () => {
    assert.equal(isJsonRpcV2({ jsonrpc: '2.0' }), true);
    assert.equal(isJsonRpcV2({ jsonrpc: '1.0' }), false);
    assert.equal(isJsonRpcV2({}), false);

    assert.equal(isJsonContentType('application/json'), true);
    assert.equal(isJsonContentType('text/plain'), false);
    assert.equal(isJsonContentType(undefined), false);
  });
});

describe('MCP auth envelope source stays aligned', () => {
  it('enables auth on any defined MCP_API_KEY and splits Authorization as a string', () => {
    const index = readRepo('src/index.ts');

    assert.match(index, /const mpcApiKey = process\.env\.MCP_API_KEY;/);
    assert.match(index, /const mpcAuthEnabled = mpcApiKey !== undefined;/);
    assert.match(
      index,
      /const \[scheme, token\] = authHeader\.split\(' '\)/
    );
    assert.match(index, /if \(scheme !== 'Bearer'\)/);
    assert.equal(index.includes('timingSafeEqual'), false);
    assert.equal(index.includes("req.headers['content-type']"), false);
    assert.equal(index.includes('request.jsonrpc'), false);
    assert.equal(index.includes("=== '2.0'"), false);
    assert.match(
      index,
      /req\.headers\.authorization as string \| undefined/
    );
    assert.equal(index.includes('Array.isArray(req.headers.authorization)'), false);
  });
});
