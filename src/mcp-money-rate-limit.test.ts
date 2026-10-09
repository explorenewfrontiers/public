import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  productionRateLimitsMoneyTools,
  sourceHasRateLimiter,
} from './mcp-money-rate-limit.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('money-moving endpoints have no rate limiter', () => {
  it('MCP create_payment_intent and create_customer are unbounded', () => {
    const source = readRepo('src/index.ts');
    const toolStart = source.indexOf("case 'create_payment_intent'");
    const toolEnd = source.indexOf("case 'get_payment_intent'", toolStart);
    const intentBody = source.slice(toolStart, toolEnd);

    assert.match(intentBody, /client\.paymentIntents\.create/);
    assert.equal(sourceHasRateLimiter(intentBody), false);
    assert.equal(sourceHasRateLimiter(source), false);
    assert.equal(productionRateLimitsMoneyTools(), false);
  });

  it('catalog checkout POST has no rate limiter', () => {
    const webServer = readRepo('src/web-server.ts');
    assert.match(webServer, /app\.post\('\/api\/checkout'/);
    assert.match(webServer, /stripe\.checkout\.sessions\.create/);
    assert.equal(sourceHasRateLimiter(webServer), false);
  });

  it('Connect checkout and subscription POSTs have no rate limiter', () => {
    const connect = readRepo('stripe-connect-sample/server.ts');
    assert.match(connect, /app\.post\('\/api\/checkout'/);
    assert.match(connect, /app\.post\('\/api\/subscriptions'/);
    assert.match(connect, /checkout\.sessions\.create/);
    assert.equal(sourceHasRateLimiter(connect), false);
  });
});
