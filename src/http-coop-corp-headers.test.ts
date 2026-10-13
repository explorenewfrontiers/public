import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  CHECKOUT_SESSION_ID_QUERY,
  htmlSetsCrossOriginIsolationMeta,
  openerCanReadCheckoutSessionId,
  productionSetsCoop,
  sourcePutsCheckoutSessionIdInQuery,
  sourceSetsCrossOriginIsolationHeaders,
  vercelHeaderNames,
} from './http-coop-corp-headers.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('HTTP surfaces omit COOP / CORP / COEP', () => {
  it('MCP server never sets Cross-Origin-Opener/Resource/Embedder-Policy', () => {
    const source = readRepo('src/index.ts');
    assert.match(
      source,
      /res\.setHeader\(\s*['"]Content-Type['"]\s*,\s*['"]application\/json['"]\s*\)/
    );
    assert.equal(sourceSetsCrossOriginIsolationHeaders(source), false);
    assert.equal(productionSetsCoop(), false);
  });

  it('catalog and Connect Express apps do not set COOP / CORP / COEP', () => {
    const catalog = readRepo('src/web-server.ts');
    const connect = readRepo('stripe-connect-sample/server.ts');

    assert.equal(sourceSetsCrossOriginIsolationHeaders(catalog), false);
    assert.equal(sourceSetsCrossOriginIsolationHeaders(connect), false);
  });

  it('HTML shells do not set COOP / CORP / COEP meta tags', () => {
    assert.equal(htmlSetsCrossOriginIsolationMeta(readRepo('public/index.html')), false);
    assert.equal(
      htmlSetsCrossOriginIsolationMeta(readRepo('stripe-connect-sample/public/index.html')),
      false
    );
    assert.equal(
      htmlSetsCrossOriginIsolationMeta(readRepo('stripe-connect-sample/public/storefront.html')),
      false
    );
  });

  it('Connect vercel.json sets frame/nosniff but not COOP / CORP / COEP', () => {
    const names = vercelHeaderNames(readRepo('stripe-connect-sample/vercel.json'));
    assert.ok(names.includes('X-Frame-Options'));
    assert.ok(names.includes('X-Content-Type-Options'));
    const lower = names.map((name) => name.toLowerCase());
    assert.equal(lower.includes('cross-origin-opener-policy'), false);
    assert.equal(lower.includes('cross-origin-resource-policy'), false);
    assert.equal(lower.includes('cross-origin-embedder-policy'), false);
  });
});

describe('missing COOP lets a popup opener read Checkout session ids', () => {
  it('catalog and Connect success_url put session_id in the query without COOP', () => {
    const catalog = readRepo('src/web-server.ts');
    const connect = readRepo('stripe-connect-sample/server.ts');

    assert.equal(sourcePutsCheckoutSessionIdInQuery(catalog), true);
    assert.equal(sourcePutsCheckoutSessionIdInQuery(connect), true);
    assert.equal(sourceSetsCrossOriginIsolationHeaders(catalog), false);
    assert.equal(sourceSetsCrossOriginIsolationHeaders(connect), false);
    assert.equal(
      openerCanReadCheckoutSessionId({
        setsCoop: sourceSetsCrossOriginIsolationHeaders(catalog),
        sessionIdInQuery: sourcePutsCheckoutSessionIdInQuery(catalog),
      }),
      true
    );
    assert.equal(
      openerCanReadCheckoutSessionId({
        setsCoop: sourceSetsCrossOriginIsolationHeaders(connect),
        sessionIdInQuery: sourcePutsCheckoutSessionIdInQuery(connect),
      }),
      true
    );
    assert.equal(CHECKOUT_SESSION_ID_QUERY.startsWith('session_id='), true);
  });
});
