import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  NODE_UNHANDLED_REJECTION_THROWS_MAJOR,
  asyncRouteRejectionIsUnhandledByExpress4,
  sourceRegistersRejectionHandledHandler,
  sourceRegistersUncaughtExceptionHandler,
  sourceRegistersUnhandledRejectionHandler,
  thinWebhookRetrieveIsOutsideVerifyTry,
  unhandledRejectionCrashesProcess,
} from './unhandled-rejection-process.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Unhandled Stripe promise rejections crash the payment process', () => {
  it('Node 15+ exits on unhandledRejection unless a process handler exists', () => {
    assert.equal(NODE_UNHANDLED_REJECTION_THROWS_MAJOR, 15);

    assert.equal(
      unhandledRejectionCrashesProcess({
        hasUnhandledRejectionHandler: false,
        nodeMajor: 18,
      }),
      true
    );
    assert.equal(
      unhandledRejectionCrashesProcess({
        hasUnhandledRejectionHandler: false,
        nodeMajor: 20,
      }),
      true
    );
    assert.equal(
      unhandledRejectionCrashesProcess({
        hasUnhandledRejectionHandler: true,
        nodeMajor: 18,
      }),
      false
    );
    assert.equal(
      unhandledRejectionCrashesProcess({
        hasUnhandledRejectionHandler: false,
        nodeMajor: 14,
      }),
      false
    );

    assert.equal(
      asyncRouteRejectionIsUnhandledByExpress4({
        expressCatchesAsync: false,
        hasUnhandledRejectionHandler: false,
      }),
      true
    );
    assert.equal(
      asyncRouteRejectionIsUnhandledByExpress4({
        expressCatchesAsync: true,
        hasUnhandledRejectionHandler: false,
      }),
      false
    );

    assert.equal(
      sourceRegistersUnhandledRejectionHandler(
        `process.on('unhandledRejection', () => {})`
      ),
      true
    );
    assert.equal(sourceRegistersUnhandledRejectionHandler('server.listen(80)'), false);
  });

  it('MCP, catalog, and Connect register no process rejection handlers', () => {
    const sources = [
      readRepo('src/index.ts'),
      readRepo('src/web-server.ts'),
      readRepo('stripe-connect-sample/server.ts'),
    ];

    for (const source of sources) {
      assert.equal(sourceRegistersUnhandledRejectionHandler(source), false);
      assert.equal(sourceRegistersUncaughtExceptionHandler(source), false);
      assert.equal(sourceRegistersRejectionHandledHandler(source), false);
      assert.equal(
        unhandledRejectionCrashesProcess({
          hasUnhandledRejectionHandler: false,
          nodeMajor: 18,
        }),
        true
      );
    }
  });

  it('Connect thin-webhook retrieve sits outside verify try/catch (Express 4 cannot catch it)', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const pkg = JSON.parse(readRepo('stripe-connect-sample/package.json')) as {
      dependencies: Record<string, string>;
    };

    assert.equal(thinWebhookRetrieveIsOutsideVerifyTry(source), true);
    assert.match(source, /app\.post\(\s*\n?\s*['"]\/webhook\/thin['"]/);
    assert.match(pkg.dependencies.express, /^\^4\./);
    assert.equal(
      asyncRouteRejectionIsUnhandledByExpress4({
        expressCatchesAsync: false,
        hasUnhandledRejectionHandler: sourceRegistersUnhandledRejectionHandler(source),
      }),
      true
    );
  });
});
