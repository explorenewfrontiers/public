/**
 * Mirrors src/index.ts create_payment_intent argument forwarding.
 * The MCP tool schema requires amount and currency, but the handler does
 * not validate them before calling Stripe.
 */

export function buildPaymentIntentCreateParams(input: Record<string, unknown>): {
  amount: unknown;
  currency: unknown;
  customer: unknown;
  description: unknown;
} {
  return {
    amount: input.amount as number,
    currency: input.currency as string,
    customer: input.customer as string,
    description: input.description as string,
  };
}
