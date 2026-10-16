import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  deploymentDocsRecommendProxyPlatforms,
  expressTrustsProxy,
  reverseProxyWouldHideClient,
  sourceReadsForwardedClientIp,
} from './express-trust-proxy.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Express apps sit behind documented TLS proxies with trust proxy unset', () => {
  it('hiding the client requires a reverse proxy and no trust proxy setting', () => {
    assert.equal(
      reverseProxyWouldHideClient({ trustsProxy: false, deployedBehindProxy: true }),
      true
    );
    assert.equal(
      reverseProxyWouldHideClient({ trustsProxy: true, deployedBehindProxy: true }),
      false
    );
    assert.equal(
      reverseProxyWouldHideClient({ trustsProxy: false, deployedBehindProxy: false }),
      false
    );
  });

  it('Connect and catalog servers never enable trust proxy or read forwarded proto/ip', () => {
    const connect = readRepo('stripe-connect-sample/server.ts');
    const catalog = readRepo('src/web-server.ts');

    assert.equal(expressTrustsProxy(connect), false);
    assert.equal(expressTrustsProxy(catalog), false);
    assert.equal(sourceReadsForwardedClientIp(connect), false);
    assert.equal(sourceReadsForwardedClientIp(catalog), false);
    assert.equal(
      reverseProxyWouldHideClient({ trustsProxy: false, deployedBehindProxy: true }),
      true
    );
  });

  it('DEPLOYMENT.md recommends Heroku, Railway, and Vercel (TLS terminators)', () => {
    const docs = readRepo('stripe-connect-sample/DEPLOYMENT.md');
    assert.equal(deploymentDocsRecommendProxyPlatforms(docs), true);
    assert.match(docs, /## Heroku/);
    assert.match(docs, /## Railway/);
    assert.match(docs, /## Vercel/);
  });
});
