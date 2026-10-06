import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  LISTEN_SOURCES,
  listenSpecifiesLoopbackHost,
  productionListenSpecifiesHost,
} from './listen-bind-all-interfaces.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('HTTP servers bind all interfaces', () => {
  it('does not treat listen(port) as loopback-only', () => {
    assert.equal(listenSpecifiesLoopbackHost('server.listen(port, () => {})'), false);
    assert.equal(
      listenSpecifiesLoopbackHost("app.listen(port, '127.0.0.1', () => {})"),
      true
    );
    assert.equal(productionListenSpecifiesHost(), false);
  });
});

describe('listen() source stays aligned', () => {
  it('MCP, catalog, and Connect listen with port only', () => {
    assert.deepEqual(LISTEN_SOURCES, [
      'src/index.ts',
      'src/web-server.ts',
      'stripe-connect-sample/server.ts',
    ]);

    const mcp = readRepo('src/index.ts');
    assert.match(mcp, /server\.listen\(port, \(\) => \{/);
    assert.equal(listenSpecifiesLoopbackHost(mcp), false);

    const catalog = readRepo('src/web-server.ts');
    assert.match(catalog, /app\.listen\(port, \(\) => \{/);
    assert.equal(listenSpecifiesLoopbackHost(catalog), false);

    const connect = readRepo('stripe-connect-sample/server.ts');
    assert.match(connect, /app\.listen\(PORT, \(\) => \{/);
    assert.equal(listenSpecifiesLoopbackHost(connect), false);
  });
});
