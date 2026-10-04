/**
 * Mirrors Checkout customer fields and MCP money-call lifecycle.
 *
 * Open PR #38 locks missing metadata/client_reference_id. Open PR #25 locks
 * missing idempotency keys and zero quantity. They do not lock: Checkout
 * creates omit customer_email and receipt_email (guest charges, no receipt);
 * catalog/Connect quantity has no upper bound; MCP money tools never attach
 * req.on('close') / Stripe timeout so a dropped client still creates a PI.
 */

export type CheckoutCustomerFields = {
  customer_email?: string;
  customer?: string;
  receipt_email?: string;
};

export function catalogCheckoutCustomerFields(): CheckoutCustomerFields {
  return {};
}

export function connectCheckoutCustomerFields(): CheckoutCustomerFields {
  return {};
}

export function hasPayerIdentity(fields: CheckoutCustomerFields): boolean {
  return Boolean(fields.customer_email || fields.customer || fields.receipt_email);
}

export function productionQuantityOrDefault(quantity: number | undefined): number {
  return quantity || 1;
}

export function productionHasQuantityCap(): boolean {
  return false;
}

export function mcpAbortsStripeOnClientClose(): boolean {
  return false;
}

export function mcpSetsStripeTimeout(): boolean {
  return false;
}
