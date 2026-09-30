/**
 * Mirrors payment-method fields on MCP PaymentIntents and catalog Checkout.
 *
 * Open PR #14 locks unvalidated amount/currency forwarding. Open PR #25
 * locks unpublished apiVersion '2024-11-20'. Open PR #31 locks checkout
 * responses that drop session.url.
 *
 * create_payment_intent still sends only amount, currency, customer, and
 * description. Stripe's 2024+ PaymentIntents API requires either
 * payment_method_types or automatic_payment_methods.enabled; omitting both
 * fails the create. Catalog Checkout sets payment_method_types: ['card']
 * only (no wallets / Link / automatic_payment_methods). Connect Checkout
 * sets neither, so it depends on dashboard defaults and still cannot
 * collect non-card methods unless the account happens to allow them.
 */

export function buildMcpPaymentIntentCreateParams(input: {
  amount: unknown;
  currency: unknown;
  customer?: unknown;
  description?: unknown;
}): Record<string, unknown> {
  return {
    amount: input.amount as number,
    currency: input.currency as string,
    customer: input.customer as string,
    description: input.description as string,
  };
}

export function paymentIntentSpecifiesPaymentMethod(params: Record<string, unknown>): boolean {
  return (
    params.payment_method_types !== undefined ||
    params.automatic_payment_methods !== undefined
  );
}

export const CATALOG_CHECKOUT_PAYMENT_METHOD_TYPES = ['card'] as const;

export function connectCheckoutSetsPaymentMethodTypes(): boolean {
  return false;
}

export function connectCheckoutSetsAutomaticPaymentMethods(): boolean {
  return false;
}
