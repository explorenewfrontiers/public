import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isAuthEnabled, validateAuth } from './auth.js';

describe('isAuthEnabled', () => {
  it('is disabled when the API key is unset', () => {
    assert.equal(isAuthEnabled(undefined), false);
  });

  it('is enabled when the API key is an empty string', () => {
    assert.equal(isAuthEnabled(''), true);
  });

  it('is enabled when a key is configured', () => {
    assert.equal(isAuthEnabled('secret'), true);
  });
});

describe('validateAuth', () => {
  it('accepts any request when auth is disabled', () => {
    assert.equal(validateAuth(undefined, undefined), true);
    assert.equal(validateAuth('Basic abc', undefined), true);
    assert.equal(validateAuth('Bearer anything', undefined), true);
  });

  it('rejects a missing Authorization header when auth is enabled', () => {
    assert.equal(validateAuth(undefined, 'secret'), false);
    assert.equal(validateAuth('', 'secret'), false);
  });

  it('rejects non-Bearer schemes', () => {
    assert.equal(validateAuth('Basic secret', 'secret'), false);
    assert.equal(validateAuth('bearer secret', 'secret'), false);
    assert.equal(validateAuth('Token secret', 'secret'), false);
  });

  it('rejects a Bearer header with no token', () => {
    assert.equal(validateAuth('Bearer', 'secret'), false);
  });

  it('rejects the wrong token', () => {
    assert.equal(validateAuth('Bearer other', 'secret'), false);
  });

  it('accepts the configured Bearer token', () => {
    assert.equal(validateAuth('Bearer secret', 'secret'), true);
  });

  it('treats an empty configured key as a required empty token', () => {
    assert.equal(validateAuth('Bearer ', ''), true);
    assert.equal(validateAuth('Bearer secret', ''), false);
  });
});
