import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  checkoutCannotCollectFulfillmentFields,
  checkoutCannotCollectVatId,
  checkoutHasNoUpsells,
  checkoutIsHostedRedirectOnly,
  extractCheckoutSessionCreates,
  inspectCheckoutCustomFieldsUi,
  sourceSetsCustomFields,
  sourceSetsOptionalItems,
  sourceSetsTaxIdCollection,
  sourceSetsTaxIdCollectionEnabled,
  sourceSetsUiMode,
  sourceSetsUiModeCustom,
  sourceSetsUiModeEmbedded,
} from './checkout-custom-fields-ui.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Checkout omits custom_fields, tax_id_collection, ui_mode, and optional_items', () => {
  it('a session without those fields cannot collect VAT/PO data, embed, or upsell', () => {
    assert.equal(checkoutCannotCollectFulfillmentFields(false), true);
    assert.equal(checkoutCannotCollectFulfillmentFields(true), false);
    assert.equal(checkoutCannotCollectVatId(false), true);
    assert.equal(checkoutCannotCollectVatId(true), false);
    assert.equal(checkoutIsHostedRedirectOnly(false), true);
    assert.equal(checkoutIsHostedRedirectOnly(true, 'hosted'), true);
    assert.equal(checkoutIsHostedRedirectOnly(true, 'embedded'), false);
    assert.equal(checkoutHasNoUpsells(false), true);
    assert.equal(checkoutHasNoUpsells(true), false);

    assert.equal(sourceSetsCustomFields(`custom_fields: [{ key: 'po' }]`), true);
    assert.equal(sourceSetsTaxIdCollection(`tax_id_collection: { enabled: true }`), true);
    assert.equal(
      sourceSetsTaxIdCollectionEnabled(`tax_id_collection: { enabled: true }`),
      true
    );
    assert.equal(
      sourceSetsTaxIdCollectionEnabled(`tax_id_collection: { enabled: false }`),
      false
    );
    assert.equal(sourceSetsUiMode(`ui_mode: 'embedded'`), true);
    assert.equal(sourceSetsUiModeEmbedded(`ui_mode: 'embedded'`), true);
    assert.equal(sourceSetsUiModeCustom(`ui_mode: 'custom'`), true);
    assert.equal(sourceSetsUiModeEmbedded(`ui_mode: 'hosted'`), false);
    assert.equal(sourceSetsOptionalItems(`optional_items: [{ price: 'price_x' }]`), true);
  });

  it('catalog Checkout omits custom_fields, tax_id_collection, ui_mode, and optional_items', () => {
    const web = readRepo('src/web-server.ts');
    const checkout = extractCheckoutSessionCreates(web);
    const fields = inspectCheckoutCustomFieldsUi(web);

    assert.match(checkout, /checkout\.sessions\.create/);
    assert.match(checkout, /mode:\s*['"]payment['"]/);
    assert.match(checkout, /sessionId:\s*session\.id/);
    assert.equal(sourceSetsCustomFields(web), false);
    assert.equal(sourceSetsTaxIdCollection(web), false);
    assert.equal(sourceSetsUiMode(web), false);
    assert.equal(sourceSetsOptionalItems(web), false);
    assert.equal(fields.hasCustomFields, false);
    assert.equal(fields.hasTaxIdCollection, false);
    assert.equal(fields.hasUiMode, false);
    assert.equal(fields.hasOptionalItems, false);
    assert.equal(checkoutCannotCollectFulfillmentFields(fields.hasCustomFields), true);
    assert.equal(checkoutCannotCollectVatId(fields.hasTaxIdCollection), true);
    assert.equal(checkoutIsHostedRedirectOnly(fields.hasUiMode), true);
    assert.equal(checkoutHasNoUpsells(fields.hasOptionalItems), true);
  });

  it('Connect Checkout and subscription sessions omit the same fields', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const checkout = extractCheckoutSessionCreates(source);
    const fields = inspectCheckoutCustomFieldsUi(source);

    assert.match(checkout, /mode:\s*['"]payment['"]/);
    assert.match(checkout, /mode:\s*['"]subscription['"]/);
    assert.equal((checkout.match(/checkout\.sessions\.create/g) || []).length, 2);
    assert.equal(sourceSetsCustomFields(source), false);
    assert.equal(sourceSetsTaxIdCollection(source), false);
    assert.equal(sourceSetsUiMode(source), false);
    assert.equal(sourceSetsOptionalItems(source), false);
    assert.equal(fields.hasCustomFields, false);
    assert.equal(fields.hasTaxIdCollection, false);
    assert.equal(fields.hasUiMode, false);
    assert.equal(fields.hasOptionalItems, false);
    assert.equal(checkoutCannotCollectFulfillmentFields(fields.hasCustomFields), true);
    assert.equal(checkoutCannotCollectVatId(fields.hasTaxIdCollection), true);
    assert.equal(checkoutIsHostedRedirectOnly(fields.hasUiMode), true);
    assert.equal(checkoutHasNoUpsells(fields.hasOptionalItems), true);
  });
});
