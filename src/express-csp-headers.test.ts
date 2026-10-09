import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  htmlSetsCspMeta,
  productionSetsCsp,
  sourceSetsBrowserSecurityHeaders,
} from './express-csp-headers.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('HTTP apps and HTML shells omit CSP and clickjacking headers', () => {
  it('catalog Express server does not set CSP, frame, or nosniff headers', () => {
    const webServer = readRepo('src/web-server.ts');
    assert.equal(sourceSetsBrowserSecurityHeaders(webServer), false);
    assert.match(webServer, /app\.use\(cors\(\)\)/);
    assert.equal(webServer.includes('helmet'), false);
    assert.equal(productionSetsCsp(), false);
  });

  it('Connect Express server does not set CSP, frame, or nosniff headers', () => {
    const connect = readRepo('stripe-connect-sample/server.ts');
    assert.equal(sourceSetsBrowserSecurityHeaders(connect), false);
    assert.equal(connect.includes('res.setHeader'), false);
    assert.equal(connect.includes('Content-Security-Policy'), false);
  });

  it('catalog and Connect HTML do not set a CSP meta tag', () => {
    assert.equal(htmlSetsCspMeta(readRepo('public/index.html')), false);
    assert.equal(htmlSetsCspMeta(readRepo('stripe-connect-sample/public/index.html')), false);
    assert.equal(
      htmlSetsCspMeta(readRepo('stripe-connect-sample/public/storefront.html')),
      false
    );
  });
});
