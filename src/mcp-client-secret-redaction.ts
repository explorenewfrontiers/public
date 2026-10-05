/**
 * Mirrors MCP call_tool serialization of Stripe money objects.
 *
 * Open PRs #7/#10/#33 lock create/retrieve contracts (amount, deleted
 * objects, missing payment_method_types). They do not lock that
 * handleToolCall returns the raw Stripe PaymentIntent / Charge and
 * call_tool JSON.stringifies it — client_secret and other confirm
 * secrets are sent back to the MCP client and any transcript logger.
 */

export type PaymentIntentLike = {
  id: string;
  object: 'payment_intent';
  amount: number;
  currency: string;
  client_secret: string;
  status: string;
};

export function mcpToolResultText(stripeObject: unknown): string {
  return JSON.stringify(stripeObject, null, 2);
}

export function productionRedactsClientSecret(): boolean {
  return false;
}

export function textIncludesClientSecret(text: string, secret: string): boolean {
  return text.includes(secret);
}
