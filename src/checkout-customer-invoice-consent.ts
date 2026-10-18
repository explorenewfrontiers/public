/**
 * Catalog `POST /api/checkout` and Connect `POST /api/checkout` /
 * `POST /api/subscriptions` create Checkout Sessions without
 * `customer_creation`, `invoice_creation`, `consent_collection`, or
 * `shipping_address_collection`. Catalog `prices.create` and Connect
 * `default_price_data` also omit `tax_code`.
 *
 * Payment-mode Checkout defaults `customer_creation` to `if_required`,
 * which does not create a Customer unless another parameter requires it.
 * Without a Customer there is no saved payer for refunds, tax IDs, or
 * receipts. `invoice_creation` stays off, so one-time payments never get
 * an invoice PDF. `consent_collection` is unset, so ToS acceptance is
 * never recorded. Catalog rows carry SKU/category/images (physical goods)
 * but Checkout never collects a shipping address. Stripe Tax also needs
 * a product `tax_code` in addition to `tax_behavior` (#59).
 *
 * Open coverage PRs lock Checkout tax/address/expiry (#59), metadata /
 * client_reference_id (#38), and customer_email / receipt_email (#39).
 * They do not lock these fulfillment and compliance fields.
 */

export interface CheckoutFulfillmentFields {
  hasCustomerCreation: boolean;
  hasInvoiceCreation: boolean;
  hasConsentCollection: boolean;
  hasShippingAddressCollection: boolean;
  hasTaxCode: boolean;
}

export function sourceSetsCustomerCreation(source: string): boolean {
  return /customer_creation\s*:/.test(source);
}

export function sourceEnablesInvoiceCreation(source: string): boolean {
  return /invoice_creation\s*:/.test(source);
}

export function sourceSetsConsentCollection(source: string): boolean {
  return /consent_collection\s*:/.test(source);
}

export function sourceSetsShippingAddressCollection(source: string): boolean {
  return /shipping_address_collection\s*:/.test(source);
}

export function sourceSetsPriceTaxCode(source: string): boolean {
  return /tax_code\s*:/.test(source);
}

export function inspectCheckoutFulfillmentFields(
  source: string
): CheckoutFulfillmentFields {
  return {
    hasCustomerCreation: sourceSetsCustomerCreation(source),
    hasInvoiceCreation: sourceEnablesInvoiceCreation(source),
    hasConsentCollection: sourceSetsConsentCollection(source),
    hasShippingAddressCollection: sourceSetsShippingAddressCollection(source),
    hasTaxCode: sourceSetsPriceTaxCode(source),
  };
}

export function guestCheckoutCreatesNoCustomer(args: {
  hasCustomerCreationAlways: boolean;
  otherParamRequiresCustomer: boolean;
}): boolean {
  return !args.hasCustomerCreationAlways && !args.otherParamRequiresCustomer;
}

export function sourceSetsCustomerCreationAlways(source: string): boolean {
  return /customer_creation\s*:\s*['"]always['"]/.test(source);
}

export function oneTimePaymentHasNoInvoice(hasInvoiceCreation: boolean): boolean {
  return !hasInvoiceCreation;
}

export function checkoutRecordsNoTosAcceptance(hasConsentCollection: boolean): boolean {
  return !hasConsentCollection;
}

export function physicalGoodsCannotBeShipped(args: {
  catalogHasPhysicalSignals: boolean;
  hasShippingAddressCollection: boolean;
}): boolean {
  return args.catalogHasPhysicalSignals && !args.hasShippingAddressCollection;
}

export function stripeTaxHasProductClassification(hasTaxCode: boolean): boolean {
  return hasTaxCode;
}

export function extractCheckoutSessionCreates(source: string): string {
  const chunks: string[] = [];
  const re = /checkout\.sessions\.create\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    chunks.push(source.slice(match.index, match.index + 900));
  }
  return chunks.join('\n---\n');
}

export function extractPriceCreates(source: string): string {
  const chunks: string[] = [];
  const re = /(?:prices\.create|default_price_data)\s*[:=({]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    chunks.push(source.slice(match.index, match.index + 400));
  }
  return chunks.join('\n---\n');
}

export function catalogSourceHasPhysicalProductSignals(source: string): boolean {
  const hasSku = /\bSKU\b/.test(source) || /\bsku\b/.test(source);
  const hasCategory = /\bCategory\b/.test(source) || /\bcategory\b/.test(source);
  const hasImage = /Image URL/.test(source) || /image_url/.test(source);
  return hasSku && hasCategory && hasImage;
}
