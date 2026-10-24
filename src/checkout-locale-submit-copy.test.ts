import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  checkoutIgnoresBuyerLanguage,
  checkoutShowsNoMerchantCopy,
  checkoutUsesDefaultPayCta,
  extractCheckoutSessionCreates,
  inspectCheckoutLocaleSubmitCopy,
  sourceSetsCustomText,
  sourceSetsCustomTextTerms,
  sourceSetsLocale,
  sourceSetsSubmitType,
  sourceSetsSubmitTypeBook,
  sourceSetsSubmitTypeDonate,
} from './checkout-locale-submit-copy.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Checkout omits locale, submit_type, and custom_text', () => {
  it('a session without locale/CTA/copy follows the browser and shows default Pay', () => {
    assert.equal(checkoutIgnoresBuyerLanguage(false), true);
    assert.equal(checkoutIgnoresBuyerLanguage(true), false);
    assert.equal(checkoutUsesDefaultPayCta(false), true);
    assert.equal(checkoutUsesDefaultPayCta(true), false);
    assert.equal(checkoutShowsNoMerchantCopy(false), true);
    assert.equal(checkoutShowsNoMerchantCopy(true), false);

    assert.equal(sourceSetsLocale(`locale: 'ja'`), true);
    assert.equal(sourceSetsSubmitType(`submit_type: 'book'`), true);
    assert.equal(sourceSetsSubmitTypeBook(`submit_type: 'book'`), true);
    assert.equal(sourceSetsSubmitTypeDonate(`submit_type: 'donate'`), true);
    assert.equal(sourceSetsSubmitTypeBook(`submit_type: 'pay'`), false);
    assert.equal(
      sourceSetsCustomText(`custom_text: { submit: { message: 'Confirm' } }`),
      true
    );
    assert.equal(
      sourceSetsCustomTextTerms(
        `custom_text: { terms_of_service_acceptance: { message: 'I agree' } }`
      ),
      true
    );
    assert.equal(
      sourceSetsCustomTextTerms(`custom_text: { submit: { message: 'Pay now' } }`),
      false
    );
  });

  it('catalog Checkout omits locale, submit_type, and custom_text', () => {
    const web = readRepo('src/web-server.ts');
    const checkout = extractCheckoutSessionCreates(web);
    const fields = inspectCheckoutLocaleSubmitCopy(web);

    assert.match(checkout, /checkout\.sessions\.create/);
    assert.match(checkout, /mode:\s*['"]payment['"]/);
    assert.equal(sourceSetsLocale(web), false);
    assert.equal(sourceSetsSubmitType(web), false);
    assert.equal(sourceSetsCustomText(web), false);
    assert.equal(fields.hasLocale, false);
    assert.equal(fields.hasSubmitType, false);
    assert.equal(fields.hasCustomText, false);
    assert.equal(checkoutIgnoresBuyerLanguage(fields.hasLocale), true);
    assert.equal(checkoutUsesDefaultPayCta(fields.hasSubmitType), true);
    assert.equal(checkoutShowsNoMerchantCopy(fields.hasCustomText), true);
  });

  it('Connect Checkout and subscription sessions omit the same fields', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const checkout = extractCheckoutSessionCreates(source);
    const fields = inspectCheckoutLocaleSubmitCopy(source);

    assert.match(checkout, /mode:\s*['"]payment['"]/);
    assert.match(checkout, /mode:\s*['"]subscription['"]/);
    assert.equal((checkout.match(/checkout\.sessions\.create/g) || []).length, 2);
    assert.equal(sourceSetsLocale(source), false);
    assert.equal(sourceSetsSubmitType(source), false);
    assert.equal(sourceSetsCustomText(source), false);
    assert.equal(fields.hasLocale, false);
    assert.equal(fields.hasSubmitType, false);
    assert.equal(fields.hasCustomText, false);
    assert.equal(checkoutIgnoresBuyerLanguage(fields.hasLocale), true);
    assert.equal(checkoutUsesDefaultPayCta(fields.hasSubmitType), true);
    assert.equal(checkoutShowsNoMerchantCopy(fields.hasCustomText), true);
  });
});
