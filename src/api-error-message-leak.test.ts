import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  clientErrorBody,
  jsonRpcToolErrorMessage,
  messageLooksLikeStripeInternals,
  productionSanitizesStripeErrors,
  sourceReflectsErrorMessage,
} from './api-error-message-leak.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('API handlers echo raw Error.message to clients', () => {
  it('forwards Stripe key and missing-price messages unchanged', () => {
    const keyError = new Error(
      'Invalid API Key provided: sk_test_51ABC***********************xyz'
    );
    const priceError = new Error('No such price: price_attacker_50');
    const accountError = new Error(
      "The provided key does not have access to account 'acct_123' (or that account does not exist)."
    );

    assert.equal(clientErrorBody(keyError).error, keyError.message);
    assert.equal(jsonRpcToolErrorMessage(priceError), priceError.message);
    assert.equal(messageLooksLikeStripeInternals(keyError.message), true);
    assert.equal(messageLooksLikeStripeInternals(priceError.message), true);
    assert.equal(messageLooksLikeStripeInternals(accountError.message), true);
    assert.equal(productionSanitizesStripeErrors(), false);
  });

  it('catalog product and checkout routes interpolate error.message', () => {
    const source = readRepo('src/web-server.ts');
    assert.equal(sourceReflectsErrorMessage(source), true);
    assert.equal((source.match(/error instanceof Error \? error\.message/g) || []).length, 3);
  });

  it('Connect mutating routes interpolate error.message', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    assert.equal(sourceReflectsErrorMessage(source), true);
    assert.match(source, /Failed to create checkout session/);
    assert.match(source, /Failed to create account/);
  });

  it('MCP call_tool JSON-RPC errors use the thrown Error.message', () => {
    const source = readRepo('src/index.ts');
    assert.equal(sourceReflectsErrorMessage(source), true);
    assert.match(source, /code: -32603/);
  });
});
