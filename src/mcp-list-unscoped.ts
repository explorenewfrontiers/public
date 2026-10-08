/**
 * Mirrors MCP list_customers / list_charges / list_invoices in
 * src/index.ts.
 *
 * Open PR #44 locks that retrieve tools stringify PII on a single
 * object. It does not lock that the list tools have required: [] and
 * forward the raw Stripe list with no customer (or other) scope, so
 * a caller with the platform secret can dump every customer, charge,
 * and invoice on the account. list_products maps a non-PII subset.
 */

export function listToolRequiresCustomerScope(required: string[]): boolean {
  return required.includes('customer') || required.includes('customer_id');
}

export function productionListCustomersRequiresScope(): boolean {
  return false;
}

export function productionListChargesRequiresScope(): boolean {
  return false;
}

export function productionListInvoicesRequiresScope(): boolean {
  return false;
}
