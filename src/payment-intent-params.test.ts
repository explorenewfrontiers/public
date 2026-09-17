import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { buildPaymentIntentCreateParams } from './payment-intent-params.js';

const indexPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/index.ts');

describe('buildPaymentIntentCreateParams', () => {
  it('forwards a valid amount and currency plus optional fields', () => {
    assert.deepEqual(
      buildPaymentIntentCreateParams({
        amount: 1999,
        currency: 'usd',
        customer: 'cus_1',
        description: 'Kit',
      }),
      {
        amount: 1999,
        currency: 'usd',
        customer: 'cus_1',
        description: 'Kit',
      }
    );
  });

  it('forwards zero, negative, and non-integer amounts without rejecting them', () => {
    assert.equal(buildPaymentIntentCreateParams({ amount: 0, currency: 'usd' }).amount, 0);
    assert.equal(buildPaymentIntentCreateParams({ amount: -500, currency: 'usd' }).amount, -500);
    assert.equal(buildPaymentIntentCreateParams({ amount: 10.5, currency: 'usd' }).amount, 10.5);
  });

  it('forwards missing required fields as undefined', () => {
    assert.deepEqual(buildPaymentIntentCreateParams({}), {
      amount: undefined,
      currency: undefined,
      customer: undefined,
      description: undefined,
    });
  });
});

describe('MCP server source stays aligned', () => {
  it('still creates payment intents from raw tool input without amount checks', () => {
    const source = fs.readFileSync(indexPath, 'utf8');
    assert.match(source, /case 'create_payment_intent':/);
    assert.match(source, /amount: input\.amount as number/);
    assert.match(source, /currency: input\.currency as string/);
    assert.equal(source.includes('amount > 0'), false);
    assert.equal(source.includes('Number.isInteger(input.amount)'), false);
  });
});
