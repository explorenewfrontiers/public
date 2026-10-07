import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  connectPortFromEnv,
  isValidTcpPort,
  parseListenPort,
  productionRejectsInvalidListenPort,
} from './listen-port-parse.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('listen port parsing accepts invalid values', () => {
  it('parseInt of a non-numeric PORT is NaN and is not a valid TCP port', () => {
    assert.equal(Number.isNaN(parseListenPort('abc', '8000')), true);
    assert.equal(isValidTcpPort(parseListenPort('abc', '8000')), false);
    assert.equal(isValidTcpPort(parseListenPort('0', '8000')), false);
    assert.equal(isValidTcpPort(parseListenPort('-1', '8000')), false);
    assert.equal(isValidTcpPort(parseListenPort('70000', '8000')), false);
    assert.equal(isValidTcpPort(parseListenPort('8000', '8000')), true);
    assert.equal(parseListenPort(undefined, '8000'), 8000);
    assert.equal(parseListenPort('', '8000'), 8000);
    assert.equal(productionRejectsInvalidListenPort(), false);
  });

  it('Connect forwards a non-numeric PORT string through to listen()', () => {
    assert.equal(connectPortFromEnv('abc'), 'abc');
    assert.equal(connectPortFromEnv(undefined), 3000);
    assert.equal(connectPortFromEnv(''), 3000);
  });
});

describe('listen port source stays aligned', () => {
  it('MCP and catalog parseInt then listen with no finite/range check', () => {
    const mcp = readRepo('src/index.ts');
    assert.match(mcp, /const port = parseInt\(process\.env\.PORT \|\| '8000', 10\)/);
    assert.match(mcp, /server\.listen\(port,/);
    assert.equal(mcp.includes('Number.isFinite'), false);
    assert.equal(mcp.includes('Number.isNaN'), false);
    assert.equal(mcp.includes('65535'), false);

    const catalog = readRepo('src/web-server.ts');
    assert.match(
      catalog,
      /const port = parseInt\(process\.env\.WEB_PORT \|\| '3000', 10\)/
    );
    assert.match(catalog, /app\.listen\(port,/);
    assert.equal(catalog.includes('Number.isFinite'), false);
    assert.equal(catalog.includes('Number.isNaN'), false);
    assert.equal(catalog.includes('65535'), false);

    const connect = readRepo('stripe-connect-sample/server.ts');
    assert.match(connect, /const PORT = process\.env\.PORT \|\| 3000/);
    assert.match(connect, /app\.listen\(PORT,/);
    assert.equal(connect.includes('parseInt(process.env.PORT'), false);
  });
});
