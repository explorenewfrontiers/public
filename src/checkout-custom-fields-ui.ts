/**
 * Catalog `POST /api/checkout` and Connect `POST /api/checkout` /
 * `POST /api/subscriptions` never set Checkout `custom_fields`,
 * `tax_id_collection`, `ui_mode`, or `optional_items`.
 *
 * Without `custom_fields`, Checkout cannot collect a PO number,
 * license plate, or other fulfillment field — that data is lost
 * before webhook fulfillment. Without `tax_id_collection`, EU/UK
 * VAT IDs are never collected, so reverse-charge / B2B tax cannot
 * apply (distinct from `automatic_tax` / `tax_behavior` — #59 —
 * and from `tax_code` on Prices — #61). Without `ui_mode`, the
 * session stays hosted-only; clients only receive `sessionId` and
 * call deprecated `redirectToCheckout` (#31), so flipping to
 * `embedded` / `custom` without a `client_secret` would break
 * pay. Without `optional_items`, Checkout has no upsell / add-on
 * line items (cart contents are the only lines).
 *
 * Open coverage PRs lock locale/CTA/copy (#67), recovery/saved-PM
 * (#66), statement/3DS (#63), and consent/shipping (#61). They do
 * not lock custom fields, tax-id collection, ui_mode, or upsells.
 */

export interface CheckoutCustomFieldsUiFields {
  hasCustomFields: boolean;
  hasTaxIdCollection: boolean;
  hasUiMode: boolean;
  hasOptionalItems: boolean;
}

export function sourceSetsCustomFields(source: string): boolean {
  return /custom_fields\s*:/.test(source);
}

export function sourceSetsTaxIdCollection(source: string): boolean {
  return /tax_id_collection\s*:/.test(source);
}

export function sourceSetsUiMode(source: string): boolean {
  return /ui_mode\s*:/.test(source);
}

export function sourceSetsOptionalItems(source: string): boolean {
  return /optional_items\s*:/.test(source);
}

export function inspectCheckoutCustomFieldsUi(
  source: string
): CheckoutCustomFieldsUiFields {
  return {
    hasCustomFields: sourceSetsCustomFields(source),
    hasTaxIdCollection: sourceSetsTaxIdCollection(source),
    hasUiMode: sourceSetsUiMode(source),
    hasOptionalItems: sourceSetsOptionalItems(source),
  };
}

export function checkoutCannotCollectFulfillmentFields(
  hasCustomFields: boolean
): boolean {
  return !hasCustomFields;
}

export function checkoutCannotCollectVatId(
  hasTaxIdCollection: boolean
): boolean {
  return !hasTaxIdCollection;
}

export function checkoutIsHostedRedirectOnly(
  hasUiMode: boolean,
  uiMode?: string
): boolean {
  return !hasUiMode || uiMode === 'hosted';
}

export function checkoutHasNoUpsells(hasOptionalItems: boolean): boolean {
  return !hasOptionalItems;
}

export function sourceSetsUiModeEmbedded(source: string): boolean {
  return /ui_mode\s*:\s*['"]embedded['"]/.test(source);
}

export function sourceSetsUiModeCustom(source: string): boolean {
  return /ui_mode\s*:\s*['"]custom['"]/.test(source);
}

export function sourceSetsTaxIdCollectionEnabled(source: string): boolean {
  return /tax_id_collection\s*:\s*\{[\s\S]{0,160}enabled\s*:\s*true/.test(
    source
  );
}

export function extractCheckoutSessionCreates(source: string): string {
  const chunks: string[] = [];
  const re = /checkout\.sessions\.create\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    chunks.push(source.slice(match.index, match.index + 1100));
  }
  return chunks.join('\n---\n');
}
