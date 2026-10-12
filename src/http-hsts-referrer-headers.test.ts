import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  CHECKOUT_SESSION_ID_PLACEHOLDER,
  htmlSetsReferrerPolicy,
  productionSetsHsts,
  sourcePutsCheckoutSessionIdInQuery,
  sourceSetsTransportSecurityHeaders,
  vercelHeaderNames,
} from './http-hsts-referrer-headers.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('HTTP surfaces omit HSTS and Referrer-Policy', () => {
  it('MCP server only sets Content-Type and never HSTS/Referrer-Policy', () => {
    const source = readRepo('src/index.ts');
    assert.match(source, /res\.setHeader\(\s*['"]Content-Type['"]\s*,\s*['"]application\/json['"]\s*\)/);
    assert.equal(sourceSetsTransportSecurityHeaders(source), false);
    assert.equal(source.includes('helmet'), false);
    assert.equal(productionSetsHsts(), false);
  });

  it('catalog and Connect Express apps do not set transport security headers', () => {
    const catalog = readRepo('src/web-server.ts');
    const connect = readRepo('stripe-connect-sample/server.ts');

    assert.equal(sourceSetsTransportSecurityHeaders(catalog), false);
    assert.equal(sourceSetsTransportSecurityHeaders(connect), false);
    assert.equal(catalog.includes('helmet'), false);
    assert.equal(connect.includes('helmet'), false);
  });

  it('HTML shells do not set a Referrer-Policy meta tag', () => {
    assert.equal(htmlSetsReferrerPolicy(readRepo('public/index.html')), false);
    assert.equal(
      htmlSetsReferrerPolicy(readRepo('stripe-connect-sample/public/index.html')),
      false
    );
    assert.equal(
      htmlSetsReferrerPolicy(readRepo('stripe-connect-sample/public/storefront.html')),
      false
    );
  });

  it('Connect vercel.json sets frame/nosniff headers but not HSTS or Referrer-Policy', () => {
    const names = vercelHeaderNames(readRepo('stripe-connect-sample/vercel.json'));
    assert.ok(names.includes('X-Frame-Options'));
    assert.ok(names.includes('X-Content-Type-Options'));
    assert.equal(
      names.some((name) => name.toLowerCase() === 'strict-transport-security'),
      false
    );
    assert.equal(
      names.some((name) => name.toLowerCase() === 'referrer-policy'),
      false
    );
    assert.equal(
      names.some((name) => name.toLowerCase() === 'permissions-policy'),
      false
    );
  });
});

describe('Checkout success URLs put session ids in the query string', () => {
  it('catalog and Connect success_url include session_id={CHECKOUT_SESSION_ID}', () => {
    const catalog = readRepo('src/web-server.ts');
    const connect = readRepo('stripe-connect-sample/server.ts');

    assert.equal(sourcePutsCheckoutSessionIdInQuery(catalog), true);
    assert.equal(sourcePutsCheckoutSessionIdInQuery(connect), true);
    assert.match(catalog, /success_url:.*session_id=\{CHECKOUT_SESSION_ID\}/);
    assert.match(connect, /success_url:.*session_id=\{CHECKOUT_SESSION_ID\}/);
    assert.equal(CHECKOUT_SESSION_ID_PLACEHOLDER.includes('session_id='), true);
  });
});
