import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  isUsableStripeSignature,
  productionCastsSignatureHeaderToString,
  stripeSignatureFromHeader,
} from './connect-webhook-signature-array.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('duplicate stripe-signature headers are not a usable string', () => {
  it('casts a string[] header the way production does and it fails the string check', () => {
    const duplicate: string[] = [
      't=1700000000,v1=aaa',
      't=1700000000,v1=bbb',
    ];
    const asProduction = stripeSignatureFromHeader(duplicate);
    assert.equal(Array.isArray(asProduction), true);
    assert.equal(typeof asProduction, 'object');
    assert.equal(isUsableStripeSignature(asProduction), false);
    assert.equal(isUsableStripeSignature(duplicate.join(',')), true);
    assert.equal(String(duplicate), 't=1700000000,v1=aaa,t=1700000000,v1=bbb');
  });

  it('accepts a single signature string and rejects missing/empty values', () => {
    const single = 't=1700000000,v1=abcdef';
    assert.equal(stripeSignatureFromHeader(single), single);
    assert.equal(isUsableStripeSignature(single), true);
    assert.equal(isUsableStripeSignature(undefined), false);
    assert.equal(isUsableStripeSignature(''), false);
    assert.equal(isUsableStripeSignature(['t=1,v1=x']), false);
  });
});

describe('Connect webhook signature header source stays aligned', () => {
  it('both webhook routes cast stripe-signature to string without Array.isArray', () => {
    const connect = readRepo('stripe-connect-sample/server.ts');
    assert.equal(productionCastsSignatureHeaderToString(connect), true);

    const thickStart = connect.indexOf("app.post(\n  '/webhook'");
    const thickEnd = connect.indexOf("app.post(\n  '/webhook/thin'");
    const thick = connect.slice(thickStart, thickEnd === -1 ? undefined : thickEnd);
    assert.match(thick, /req\.headers\['stripe-signature'\] as string/);
    assert.match(thick, /constructEvent/);
    assert.equal(thick.includes('Array.isArray'), false);

    const thinStart = connect.indexOf("app.post(\n  '/webhook/thin'");
    const thin = connect.slice(thinStart);
    assert.match(thin, /req\.headers\['stripe-signature'\] as string/);
    assert.match(thin, /parseThinEvent/);
    assert.equal(thin.includes('Array.isArray(sig)'), false);
  });
});
