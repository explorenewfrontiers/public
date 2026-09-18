/**
 * Mirrors stripe-connect-sample/server.ts thin-webhook verification.
 * An empty WEBHOOK_SECRET is forwarded to Stripe, and the full-event
 * retrieve sits outside the signature try/catch.
 */

export function resolveWebhookSigningSecret(secret: string | undefined): string {
  return secret || '';
}

export const THIN_WEBHOOK_HANDLED_EVENT_TYPES = [
  'v2.core.account[requirements].updated',
  'v2.core.account[configuration.merchant].capability_status_updated',
] as const;

export const THIN_WEBHOOK_DOCUMENTED_CUSTOMER_CAPABILITY_EVENT =
  'v2.account[configuration.customer].capability_status_updated';

export function classifyThinWebhookEvent(eventType: string): 'handled' | 'unhandled' {
  return (THIN_WEBHOOK_HANDLED_EVENT_TYPES as readonly string[]).includes(eventType)
    ? 'handled'
    : 'unhandled';
}
