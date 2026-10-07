/**
 * Mirrors MCP retrieve/list serialization of Stripe customer, charge,
 * and invoice objects in src/index.ts.
 *
 * Open PRs #10/#40 lock retrieve contracts and that PaymentIntent
 * client_secret is stringified. They do not lock that get_customer /
 * get_charge / get_invoice / list_* return the raw Stripe object
 * (email, phone, address, receipt_email, invoice PDFs) while
 * list_products maps a non-PII subset.
 */

export const CUSTOMER_PII_FIELDS = [
  'email',
  'phone',
  'address',
  'name',
  'shipping',
] as const;

export const CHARGE_PII_FIELDS = [
  'receipt_email',
  'billing_details',
  'payment_method_details',
] as const;

export const INVOICE_PII_FIELDS = [
  'customer_email',
  'customer_name',
  'hosted_invoice_url',
  'invoice_pdf',
] as const;

export function mcpToolResultText(stripeObject: unknown): string {
  return JSON.stringify(stripeObject, null, 2);
}

export function productionRedactsCustomerPii(): boolean {
  return false;
}

export function productionRedactsChargePii(): boolean {
  return false;
}

export function productionRedactsInvoicePii(): boolean {
  return false;
}

export function textIncludesAny(
  text: string,
  values: readonly string[]
): boolean {
  return values.some((value) => text.includes(value));
}
