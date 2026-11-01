import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  checkoutAlwaysRedirectsOnCompletion,
  checkoutCannotAdjustLineQuantity,
  checkoutLeavesOriginContextUnspecified,
  extractCheckoutLineItems,
  extractCheckoutSessionCreates,
  inspectCheckoutAdjustableQtyRedirect,
  sourceSetsAdjustableQuantity,
  sourceSetsAdjustableQuantityMaximum,
  sourceSetsIfRequiredRedirectOnCompletion,
  sourceSetsMobileOriginContext,
  sourceSetsOriginContext,
  sourceSetsRedirectOnCompletion,
} from './checkout-adjustable-qty-redirect.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Checkout omits adjustable_quantity, origin_context, and redirect_on_completion', () => {
  it('a session without those fields locks qty, origin, and post-pay redirect', () => {
    assert.equal(checkoutCannotAdjustLineQuantity(false), true);
    assert.equal(checkoutCannotAdjustLineQuantity(true), false);
    assert.equal(checkoutLeavesOriginContextUnspecified(false), true);
    assert.equal(checkoutLeavesOriginContextUnspecified(true), false);
    assert.equal(checkoutAlwaysRedirectsOnCompletion(false), true);
    assert.equal(checkoutAlwaysRedirectsOnCompletion(true), false);

    assert.equal(
      sourceSetsAdjustableQuantity(
        `line_items: [{ price: 'price_x', quantity: 1, adjustable_quantity: { enabled: true } }]`
      ),
      true
    );
    assert.equal(
      sourceSetsAdjustableQuantityMaximum(
        `adjustable_quantity: { enabled: true, maximum: 10 }`
      ),
      true
    );
    assert.equal(
      sourceSetsAdjustableQuantityMaximum(`adjustable_quantity: { enabled: true }`),
      false
    );
    // quantity coercion (#25) is not a hosted stepper
    assert.equal(sourceSetsAdjustableQuantity(`quantity: quantity || 1`), false);
    assert.equal(
      sourceSetsOriginContext(`origin_context: 'mobile_app'`),
      true
    );
    assert.equal(
      sourceSetsMobileOriginContext(`origin_context: 'mobile_app'`),
      true
    );
    assert.equal(
      sourceSetsMobileOriginContext(`origin_context: 'web'`),
      false
    );
    // ui_mode (#68) is not origin_context
    assert.equal(sourceSetsOriginContext(`ui_mode: 'embedded'`), false);
    assert.equal(
      sourceSetsRedirectOnCompletion(`redirect_on_completion: 'if_required'`),
      true
    );
    assert.equal(
      sourceSetsIfRequiredRedirectOnCompletion(
        `redirect_on_completion: 'if_required'`
      ),
      true
    );
    assert.equal(
      sourceSetsIfRequiredRedirectOnCompletion(`redirect_on_completion: 'always'`),
      false
    );
    assert.equal(sourceSetsRedirectOnCompletion(`success_url: '.../success'`), false);
  });

  it('catalog Checkout line items omit adjustable_quantity, origin_context, and redirect_on_completion', () => {
    const web = readRepo('src/web-server.ts');
    const checkout = extractCheckoutSessionCreates(web);
    const lineItems = extractCheckoutLineItems(web);
    const fields = inspectCheckoutAdjustableQtyRedirect(web);

    assert.match(checkout, /checkout\.sessions\.create/);
    assert.match(checkout, /mode:\s*['"]payment['"]/);
    assert.match(lineItems, /price:\s*item\.priceId/);
    assert.match(lineItems, /quantity:\s*item\.quantity/);
    assert.doesNotMatch(lineItems, /adjustable_quantity/);
    assert.equal(sourceSetsAdjustableQuantity(web), false);
    assert.equal(sourceSetsOriginContext(web), false);
    assert.equal(sourceSetsRedirectOnCompletion(web), false);
    assert.equal(fields.hasAdjustableQuantity, false);
    assert.equal(fields.hasOriginContext, false);
    assert.equal(fields.hasRedirectOnCompletion, false);
    assert.equal(checkoutCannotAdjustLineQuantity(fields.hasAdjustableQuantity), true);
    assert.equal(
      checkoutLeavesOriginContextUnspecified(fields.hasOriginContext),
      true
    );
    assert.equal(
      checkoutAlwaysRedirectsOnCompletion(fields.hasRedirectOnCompletion),
      true
    );
  });

  it('Connect Checkout and subscription sessions omit the same fields; storefront hardcodes qty 1', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const storefront = readRepo('stripe-connect-sample/public/storefront.html');
    const checkout = extractCheckoutSessionCreates(source);
    const lineItems = extractCheckoutLineItems(source);
    const fields = inspectCheckoutAdjustableQtyRedirect(source);

    assert.match(checkout, /mode:\s*['"]payment['"]/);
    assert.match(checkout, /mode:\s*['"]subscription['"]/);
    assert.equal((checkout.match(/checkout\.sessions\.create/g) || []).length, 2);
    assert.match(lineItems, /quantity:\s*quantity\s*\|\|\s*1/);
    assert.match(lineItems, /quantity:\s*1/);
    assert.doesNotMatch(lineItems, /adjustable_quantity/);
    assert.equal(sourceSetsAdjustableQuantity(source), false);
    assert.equal(sourceSetsOriginContext(source), false);
    assert.equal(sourceSetsRedirectOnCompletion(source), false);
    assert.equal(fields.hasAdjustableQuantity, false);
    assert.equal(fields.hasOriginContext, false);
    assert.equal(fields.hasRedirectOnCompletion, false);
    assert.equal(checkoutCannotAdjustLineQuantity(fields.hasAdjustableQuantity), true);
    assert.equal(
      checkoutLeavesOriginContextUnspecified(fields.hasOriginContext),
      true
    );
    assert.equal(
      checkoutAlwaysRedirectsOnCompletion(fields.hasRedirectOnCompletion),
      true
    );
    assert.match(storefront, /quantity:\s*1/);
    assert.doesNotMatch(storefront, /adjustable_quantity/);
  });
});
