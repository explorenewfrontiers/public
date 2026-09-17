import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  buildCatalogCheckoutResponse,
  buildCatalogCheckoutUrls,
  catalogCheckoutUiAfterResponse,
  resolveCatalogWebsiteBaseUrl,
} from './catalog-checkout-contract.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(repoRoot, 'public');
const webServerPath = path.join(repoRoot, 'src/web-server.ts');
const appJsPath = path.join(publicDir, 'app.js');

describe('catalog checkout redirect URLs', () => {
  it('falls back to localhost when DOMAIN is unset', () => {
    assert.equal(resolveCatalogWebsiteBaseUrl(), 'http://localhost:3000');
    assert.equal(resolveCatalogWebsiteBaseUrl(''), 'http://localhost:3000');
    assert.equal(resolveCatalogWebsiteBaseUrl('https://shop.example'), 'https://shop.example');
  });

  it('sends paid customers to /success and canceled ones to /cancel', () => {
    assert.deepEqual(buildCatalogCheckoutUrls(), {
      success_url: 'http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:3000/cancel',
    });
    assert.deepEqual(buildCatalogCheckoutUrls('https://shop.example'), {
      success_url: 'https://shop.example/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://shop.example/cancel',
    });
  });

  it('returns only sessionId from checkout create (no hosted session.url)', () => {
    const response = buildCatalogCheckoutResponse('cs_test_123');
    assert.deepEqual(response, { sessionId: 'cs_test_123' });
    assert.equal('url' in response, false);
  });
});

describe('catalog public pages vs redirect targets', () => {
  it('has index.html but no success or cancel pages', () => {
    const files = fs.readdirSync(publicDir);
    assert.ok(files.includes('index.html'));
    assert.ok(files.includes('app.js'));
    assert.ok(!files.includes('success.html'));
    assert.ok(!files.includes('cancel.html'));
    assert.ok(!files.includes('success'));
    assert.ok(!files.includes('cancel'));
  });
});

describe('catalog checkout button after a session response', () => {
  it('redirects only when sessionId is present', () => {
    assert.deepEqual(catalogCheckoutUiAfterResponse({ sessionId: 'cs_1' }), {
      redirectToCheckout: true,
      resetButton: false,
    });
  });

  it('leaves the button disabled when sessionId is missing', () => {
    assert.deepEqual(catalogCheckoutUiAfterResponse({}), {
      redirectToCheckout: false,
      resetButton: false,
    });
    assert.deepEqual(catalogCheckoutUiAfterResponse({ sessionId: '' }), {
      redirectToCheckout: false,
      resetButton: false,
    });
  });
});

describe('catalog website source stays aligned', () => {
  it('still builds /success and /cancel URLs and only redirects on sessionId', () => {
    const server = fs.readFileSync(webServerPath, 'utf8');
    const appJs = fs.readFileSync(appJsPath, 'utf8');

    assert.match(
      server,
      /success_url: `\$\{process\.env\.DOMAIN \|\| 'http:\/\/localhost:3000'\}\/success\?session_id=\{CHECKOUT_SESSION_ID\}`/
    );
    assert.match(
      server,
      /cancel_url: `\$\{process\.env\.DOMAIN \|\| 'http:\/\/localhost:3000'\}\/cancel`/
    );
    assert.match(server, /res\.json\(\{ sessionId: session\.id \}\)/);
    assert.match(appJs, /if \(data\.sessionId\)/);
    assert.match(appJs, /stripe\.redirectToCheckout\(\{ sessionId: data\.sessionId \}\)/);
    assert.equal(appJs.includes('data.url'), false);
  });
});
