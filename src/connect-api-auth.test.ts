import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  ACCOUNT_ID_QUERY_TEMPLATES,
  CONNECT_MUTATING_ROUTES,
  connectChecksOriginOrCsrf,
  connectParsesUrlencodedBodies,
  connectRouteRequiresAuth,
} from './connect-api-auth.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect mutating APIs have no request authentication', () => {
  it('treats every money and account POST as public', () => {
    assert.equal(CONNECT_MUTATING_ROUTES.length, 6);
    for (const route of CONNECT_MUTATING_ROUTES) {
      assert.equal(connectRouteRequiresAuth(route.method, route.path), false);
    }
    assert.equal(connectChecksOriginOrCsrf(), false);
    assert.equal(connectParsesUrlencodedBodies(), true);
  });

  it('leaks connected-account IDs through query strings', () => {
    assert.ok(ACCOUNT_ID_QUERY_TEMPLATES.every((template) => template.includes('accountId=')));
  });
});

describe('Connect API auth source stays aligned', () => {
  it('registers urlencoded parsing and never checks Authorization or CSRF', () => {
    const server = readRepo('stripe-connect-sample/server.ts');
    const dashboard = readRepo('stripe-connect-sample/public/index.html');
    const storefront = readRepo('stripe-connect-sample/public/storefront.html');

    assert.match(server, /bodyParser\.urlencoded\(\{\s*extended:\s*true\s*\}\)/);
    assert.equal(server.includes('req.headers.authorization'), false);
    assert.equal(server.includes('csrf'), false);
    assert.equal(server.includes('x-csrf'), false);
    assert.equal(/req\.headers\['origin'\]/.test(server), false);

    for (const route of CONNECT_MUTATING_ROUTES) {
      assert.match(
        server,
        new RegExp(`app\\.post\\(\\s*'${route.path.replace(/\//g, '\\/')}'`)
      );
    }

    assert.match(dashboard, /\/storefront\.html\?accountId=\$\{accountId\}/);
    assert.match(server, /\/storefront\?accountId=\$\{accountId\}/);
    assert.match(server, /\/onboarding\?accountId=\$\{accountId\}/);
    assert.match(server, /\/dashboard\?accountId=\$\{accountId\}/);
    assert.match(storefront, /urlParams\.get\('accountId'\)/);
  });
});
