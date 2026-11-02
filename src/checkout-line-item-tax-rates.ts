/**
 * Catalog `POST /api/checkout` and Connect `POST /api/checkout` /
 * `POST /api/subscriptions` never set line-item `tax_rates` or
 * `dynamic_tax_rates`. Catalog `prices.create` and Connect
 * `default_price_data` also omit `tax_rates`.
 *
 * Without per-line `tax_rates`, Checkout never applies a fixed
 * Tax Rate (state sales tax, VAT) to that item. Without
 * `dynamic_tax_rates`, Checkout cannot pick a rate from a list
 * based on the customer's address. Combined with omitting
 * `automatic_tax` (#59), these sessions collect $0 tax even
 * when the merchant is required to charge it.
 *
 * Distinct from session-level `automatic_tax` / price
 * `tax_behavior` (#59), product `tax_code` (#61), and Checkout
 * `tax_id_collection` (#68) — those are Stripe Tax, inclusive
 * vs exclusive display, product tax category, and VAT-ID
 * collection. None of them attach a Tax Rate to a line item.
 *
 * Open coverage PRs lock automatic tax (#59), tax codes (#61),
 * and tax ID collection (#68). They do not lock line-item
 * `tax_rates` or `dynamic_tax_rates`.
 */

export interface CheckoutLineItemTaxFields {
  hasTaxRates: boolean;
  hasDynamicTaxRates: boolean;
  callsTaxRatesCreate: boolean;
  callsTaxRatesList: boolean;
}

export function sourceSetsTaxRates(source: string): boolean {
  return /(^|[^A-Za-z_])tax_rates\s*:/.test(source);
}

export function sourceSetsDynamicTaxRates(source: string): boolean {
  return /dynamic_tax_rates\s*:/.test(source);
}

export function sourceCallsTaxRatesCreate(source: string): boolean {
  return /taxRates\.create\s*\(/.test(source);
}

export function sourceCallsTaxRatesList(source: string): boolean {
  return /taxRates\.list\s*\(/.test(source);
}

export function inspectCheckoutLineItemTax(
  source: string
): CheckoutLineItemTaxFields {
  return {
    hasTaxRates: sourceSetsTaxRates(source),
    hasDynamicTaxRates: sourceSetsDynamicTaxRates(source),
    callsTaxRatesCreate: sourceCallsTaxRatesCreate(source),
    callsTaxRatesList: sourceCallsTaxRatesList(source),
  };
}

export function checkoutCollectsZeroLineItemTax(
  hasTaxRates: boolean,
  hasDynamicTaxRates: boolean
): boolean {
  return !hasTaxRates && !hasDynamicTaxRates;
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

export function extractCheckoutLineItems(source: string): string {
  const chunks: string[] = [];
  const re = /line_items\s*:/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    chunks.push(source.slice(match.index, match.index + 400));
  }
  return chunks.join('\n---\n');
}

export function extractCatalogPriceCreates(source: string): string {
  const chunks: string[] = [];
  const re = /prices\.create\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    chunks.push(source.slice(match.index, match.index + 500));
  }
  return chunks.join('\n---\n');
}

export function extractConnectDefaultPriceData(source: string): string {
  const start = source.indexOf('default_price_data:');
  if (start === -1) {
    return '';
  }
  return source.slice(start, start + 320);
}
