import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  accountCreateStripePayload,
  extractRouteHandler,
  handlerRequiresStringFields,
  requiredAccountFieldsPresent,
  requiredCheckoutFieldsPresent,
  sourceUsesExtendedUrlencoded,
  sourceUsesJsonBodyParser,
  stripeAccountRequestOption,
} from './connect-urlencoded-nested-injection.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect urlencoded({ extended: true }) nested fields bypass required checks', () => {
  it('truthy nested objects and arrays pass the same guards as production', () => {
    const nestedName = { legal: 'Acme Platform' };
    const emailList = ['attacker@example.com'];
    const accountArray = ['acct_attacker'];
    const priceObject = { '0': 'price_expensive' };

    assert.equal(
      requiredAccountFieldsPresent({
        displayName: nestedName,
        contactEmail: emailList,
      }),
      true
    );
    assert.equal(
      requiredCheckoutFieldsPresent({
        accountId: accountArray,
        priceId: priceObject,
      }),
      true
    );
    assert.equal(
      requiredAccountFieldsPresent({ displayName: '', contactEmail: 'a@b.com' }),
      false
    );
  });

  it('non-string required fields are forwarded to Stripe create options', () => {
    const displayName = { legal: 'Acme' };
    const contactEmail = ['not-an-email'];
    const accountId = { stripeAccount: 'acct_injected' };

    assert.deepEqual(accountCreateStripePayload({ displayName, contactEmail }), {
      display_name: displayName,
      contact_email: contactEmail,
    });
    assert.deepEqual(stripeAccountRequestOption(accountId), {
      stripeAccount: accountId,
    });
  });

  it('Connect server uses extended urlencoded and truthy-only required checks', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    assert.equal(sourceUsesExtendedUrlencoded(source), true);
    assert.equal(sourceUsesJsonBodyParser(source), true);

    const accounts = extractRouteHandler(source, "app.post('/api/accounts'");
    const checkout = extractRouteHandler(source, "app.post('/api/checkout'");
    const onboarding = extractRouteHandler(source, "app.post('/api/onboarding/link'");

    assert.match(accounts, /if\s*\(\s*!displayName\s*\|\|\s*!contactEmail\s*\)/);
    assert.match(checkout, /if\s*\(\s*!accountId\s*\|\|\s*!priceId\s*\)/);
    assert.match(onboarding, /if\s*\(\s*!accountId\s*\)/);
    assert.equal(handlerRequiresStringFields(accounts), false);
    assert.equal(handlerRequiresStringFields(checkout), false);

    assert.match(accounts, /display_name:\s*displayName/);
    assert.match(accounts, /contact_email:\s*contactEmail/);
    assert.match(checkout, /stripeAccount:\s*accountId/);
  });
});
