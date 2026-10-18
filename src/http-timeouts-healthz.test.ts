import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  NODE18_DEFAULT_REQUEST_TIMEOUT_MS,
  dockerfileSetsNodeEnvProduction,
  extractListenAndTimeoutConfig,
  listenReturnValueIsDiscarded,
  orchestratorLacksDedicatedHealthProbe,
  slowClientHoldsDefaultRequestWindow,
  sourceDefinesHealthEndpoint,
  sourceSetsAnyHttpTimeout,
  sourceSetsServerTimeout,
} from './http-timeouts-healthz.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('HTTP servers omit request timeouts, /healthz, and MCP NODE_ENV', () => {
  it('a server without requestTimeout keeps Node 18\'s 300s default window', () => {
    assert.equal(NODE18_DEFAULT_REQUEST_TIMEOUT_MS, 300_000);

    assert.equal(
      slowClientHoldsDefaultRequestWindow({ hasCustomRequestTimeout: false }),
      true
    );
    assert.equal(
      slowClientHoldsDefaultRequestWindow({ hasCustomRequestTimeout: true }),
      false
    );
    assert.equal(orchestratorLacksDedicatedHealthProbe({ hasHealthRoute: false }), true);
    assert.equal(orchestratorLacksDedicatedHealthProbe({ hasHealthRoute: true }), false);

    assert.equal(sourceSetsServerTimeout('server.requestTimeout = 30_000', 'requestTimeout'), true);
    assert.equal(sourceSetsServerTimeout('server.headersTimeout = 10_000', 'headersTimeout'), true);
    assert.equal(sourceSetsServerTimeout('server.keepAliveTimeout = 5_000', 'keepAliveTimeout'), true);
    assert.equal(sourceSetsServerTimeout('server.timeout = 120_000', 'timeout'), true);
    assert.equal(sourceSetsServerTimeout('server.listen(8000)', 'requestTimeout'), false);
    assert.equal(sourceDefinesHealthEndpoint(`app.get('/healthz', (_req, res) => res.send('ok'))`), true);
    assert.equal(sourceDefinesHealthEndpoint(`app.get('/health', handler)`), true);
    assert.equal(sourceDefinesHealthEndpoint(`app.get('/api/checkout', handler)`), false);
    assert.equal(dockerfileSetsNodeEnvProduction('ENV NODE_ENV=production'), true);
    assert.equal(dockerfileSetsNodeEnvProduction('ENV PORT=8000'), false);
    assert.equal(listenReturnValueIsDiscarded('app.listen(3000, () => {});'), true);
    assert.equal(listenReturnValueIsDiscarded('const server = app.listen(3000);'), false);
  });

  it('MCP createServer listen is fire-and-forget with no timeouts or /healthz', () => {
    const source = readRepo('src/index.ts');
    const boot = extractListenAndTimeoutConfig(source);

    assert.match(boot, /server\.listen\s*\(/);
    assert.match(source, /http\.createServer/);
    assert.equal(sourceSetsAnyHttpTimeout(source), false);
    assert.equal(sourceSetsServerTimeout(source, 'requestTimeout'), false);
    assert.equal(sourceSetsServerTimeout(source, 'headersTimeout'), false);
    assert.equal(sourceSetsServerTimeout(source, 'keepAliveTimeout'), false);
    assert.equal(sourceDefinesHealthEndpoint(source), false);
    assert.equal(
      slowClientHoldsDefaultRequestWindow({
        hasCustomRequestTimeout: sourceSetsServerTimeout(source, 'requestTimeout'),
      }),
      true
    );
    assert.equal(
      orchestratorLacksDedicatedHealthProbe({
        hasHealthRoute: sourceDefinesHealthEndpoint(source),
      }),
      true
    );
  });

  it('catalog and Connect discard app.listen and have no /healthz; MCP image skips NODE_ENV', () => {
    const catalog = readRepo('src/web-server.ts');
    const connect = readRepo('stripe-connect-sample/server.ts');
    const rootDocker = readRepo('Dockerfile');
    const connectDocker = readRepo('stripe-connect-sample/Dockerfile');

    for (const source of [catalog, connect]) {
      assert.match(extractListenAndTimeoutConfig(source), /app\.listen\s*\(/);
      assert.equal(listenReturnValueIsDiscarded(source), true);
      assert.equal(sourceSetsAnyHttpTimeout(source), false);
      assert.equal(sourceDefinesHealthEndpoint(source), false);
      assert.equal(
        orchestratorLacksDedicatedHealthProbe({
          hasHealthRoute: sourceDefinesHealthEndpoint(source),
        }),
        true
      );
    }

    assert.equal(dockerfileSetsNodeEnvProduction(rootDocker), false);
    assert.equal(dockerfileSetsNodeEnvProduction(connectDocker), true);
    assert.match(rootDocker, /CMD \["node", "dist\/index\.js"\]/);
    assert.match(connect, /app\.get\(\s*['"]\/['"]/);
  });
});
