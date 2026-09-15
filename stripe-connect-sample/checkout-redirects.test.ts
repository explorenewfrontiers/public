import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPaymentCheckoutRedirects } from './checkout-redirects.js';

describe('buildPaymentCheckoutRedirects', () => {
  it('returns the existing storefront page, not /success or /storefront', () => {
    const urls = buildPaymentCheckoutRedirects(
      'https://platform.example',
      'acct_123'
    );

    assert.equal(
      urls.success_url,
      'https://platform.example/storefront.html?session_id={CHECKOUT_SESSION_ID}&accountId=acct_123'
    );
    assert.equal(
      urls.cancel_url,
      'https://platform.example/storefront.html?accountId=acct_123'
    );
    assert.equal(urls.success_url.includes('/success'), false);
    assert.equal(urls.cancel_url.endsWith('/storefront'), false);
  });

  it('strips a trailing slash from the base URL', () => {
    const urls = buildPaymentCheckoutRedirects(
      'http://localhost:3000/',
      'acct_123'
    );

    assert.match(urls.success_url, /^http:\/\/localhost:3000\/storefront\.html\?/);
    assert.match(urls.cancel_url, /^http:\/\/localhost:3000\/storefront\.html\?/);
  });

  it('encodes the account id and leaves the Stripe session placeholder intact', () => {
    const urls = buildPaymentCheckoutRedirects(
      'https://platform.example',
      'acct_a b'
    );

    assert.match(urls.success_url, /accountId=acct_a%20b$/);
    assert.match(urls.success_url, /session_id=\{CHECKOUT_SESSION_ID\}/);
    assert.match(urls.cancel_url, /accountId=acct_a%20b$/);
  });

  it('rejects missing identifiers', () => {
    assert.throws(
      () => buildPaymentCheckoutRedirects('', 'acct_1'),
      /baseUrl/
    );
    assert.throws(
      () => buildPaymentCheckoutRedirects('http://localhost', ''),
      /accountId/
    );
  });
});
