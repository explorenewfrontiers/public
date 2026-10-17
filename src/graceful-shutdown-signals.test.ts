import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  PLATFORM_SHUTDOWN_SIGNALS,
  extractListenAndBoot,
  inFlightRequestsWouldDropOnSigterm,
  sourceClosesHttpServer,
  sourceImportsHttpTerminator,
  sourceRegistersAnyShutdownSignal,
  sourceRegistersSignalHandler,
} from './graceful-shutdown-signals.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('HTTP servers drop in-flight Checkout/webhook work on SIGTERM', () => {
  it('a server without SIGTERM plus close() drops in-flight requests', () => {
    assert.deepEqual(PLATFORM_SHUTDOWN_SIGNALS, ['SIGTERM', 'SIGINT']);

    assert.equal(
      inFlightRequestsWouldDropOnSigterm({
        handlesShutdownSignal: false,
        closesServer: false,
      }),
      true
    );
    assert.equal(
      inFlightRequestsWouldDropOnSigterm({
        handlesShutdownSignal: true,
        closesServer: false,
      }),
      true
    );
    assert.equal(
      inFlightRequestsWouldDropOnSigterm({
        handlesShutdownSignal: false,
        closesServer: true,
      }),
      true
    );
    assert.equal(
      inFlightRequestsWouldDropOnSigterm({
        handlesShutdownSignal: true,
        closesServer: true,
      }),
      false
    );

    assert.equal(sourceRegistersSignalHandler('', 'SIGTERM'), false);
    assert.equal(
      sourceRegistersSignalHandler(`process.on('SIGTERM', () => {})`, 'SIGTERM'),
      true
    );
    assert.equal(
      sourceRegistersSignalHandler(`process.on("SIGINT", shutdown)`, 'SIGINT'),
      true
    );
    assert.equal(sourceClosesHttpServer('server.listen(8000)'), false);
    assert.equal(sourceClosesHttpServer('server.close(() => process.exit(0))'), true);
    assert.equal(sourceImportsHttpTerminator("import stoppable from 'stoppable'"), true);
  });

  it('MCP listen() is fire-and-forget with no SIGTERM drain', () => {
    const source = readRepo('src/index.ts');
    const boot = extractListenAndBoot(source);

    assert.match(boot, /server\.listen\s*\(/);
    assert.equal(sourceRegistersAnyShutdownSignal(source), false);
    assert.equal(sourceRegistersSignalHandler(source, 'SIGTERM'), false);
    assert.equal(sourceRegistersSignalHandler(source, 'SIGINT'), false);
    assert.equal(sourceClosesHttpServer(source), false);
    assert.equal(sourceImportsHttpTerminator(source), false);
    assert.equal(
      inFlightRequestsWouldDropOnSigterm({
        handlesShutdownSignal: sourceRegistersAnyShutdownSignal(source),
        closesServer: sourceClosesHttpServer(source),
      }),
      true
    );
  });

  it('catalog website and Connect sample also listen without shutdown handlers', () => {
    const catalog = readRepo('src/web-server.ts');
    const connect = readRepo('stripe-connect-sample/server.ts');

    for (const source of [catalog, connect]) {
      assert.match(extractListenAndBoot(source), /app\.listen\s*\(/);
      assert.equal(sourceRegistersAnyShutdownSignal(source), false);
      assert.equal(sourceClosesHttpServer(source), false);
      assert.equal(sourceImportsHttpTerminator(source), false);
      assert.equal(
        inFlightRequestsWouldDropOnSigterm({
          handlesShutdownSignal: false,
          closesServer: false,
        }),
        true
      );
    }

    assert.match(connect, /app\.post\(\s*\n?\s*['"]\/webhook['"]/);
    assert.match(catalog, /app\.post\(\s*['"]\/api\/checkout['"]/);
  });
});
