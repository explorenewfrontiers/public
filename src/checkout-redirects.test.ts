import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCatalogCheckoutRedirects,
  homepagePathForLegacyCheckoutReturn,
} from './checkout-redirects.js';

describe('buildCatalogCheckoutRedirects', () => {
  it('returns the existing homepage, not /success or /cancel', () => {
    const urls = buildCatalogCheckoutRedirects('https://shop.example');

    assert.equal(
      urls.success_url,
      'https://shop.example/?checkout=success&session_id={CHECKOUT_SESSION_ID}'
    );
    assert.equal(urls.cancel_url, 'https://shop.example/?checkout=canceled');
    assert.equal(urls.success_url.includes('/success'), false);
    assert.equal(urls.cancel_url.includes('/cancel'), false);
  });

  it('strips a trailing slash from the base URL', () => {
    const urls = buildCatalogCheckoutRedirects('http://localhost:3000/');

    assert.match(
      urls.success_url,
      /^http:\/\/localhost:3000\/\?checkout=success/
    );
    assert.equal(urls.cancel_url, 'http://localhost:3000/?checkout=canceled');
  });

  it('leaves the Stripe session placeholder intact', () => {
    const urls = buildCatalogCheckoutRedirects('https://shop.example');
    assert.match(urls.success_url, /session_id=\{CHECKOUT_SESSION_ID\}/);
  });

  it('rejects a missing base URL', () => {
    assert.throws(() => buildCatalogCheckoutRedirects(''), /baseUrl/);
  });
});

describe('homepagePathForLegacyCheckoutReturn', () => {
  it('maps /success with a session id onto the homepage banner', () => {
    assert.equal(
      homepagePathForLegacyCheckoutReturn('/success', 'cs_test_123'),
      '/?checkout=success&session_id=cs_test_123'
    );
  });

  it('encodes session ids in the legacy /success redirect', () => {
    assert.equal(
      homepagePathForLegacyCheckoutReturn('/success', 'cs a'),
      '/?checkout=success&session_id=cs%20a'
    );
  });

  it('maps /cancel onto the homepage canceled banner', () => {
    assert.equal(
      homepagePathForLegacyCheckoutReturn('/cancel'),
      '/?checkout=canceled'
    );
  });
});
