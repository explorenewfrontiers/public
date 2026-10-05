/**
 * Mirrors Connect /webhook event types for failed and expired one-time pay.
 *
 * Open PR #19 locks missing checkout.session.completed and
 * payment_intent.succeeded (successful storefront charges never fulfill).
 * It does not lock the failure path: payment_intent.payment_failed and
 * checkout.session.expired fall through to default and still ack
 * { received: true } with no revoke / abandoned-session record.
 */

export const PRODUCTION_WEBHOOK_TYPES = [
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
] as const;

export const UNHANDLED_PAYMENT_FAILURE_TYPES = [
  'payment_intent.payment_failed',
  'checkout.session.expired',
] as const;

export function productionHandlesWebhookType(type: string): boolean {
  return (PRODUCTION_WEBHOOK_TYPES as readonly string[]).includes(type);
}

export function shouldRecordPaymentFailure(type: string): boolean {
  return (UNHANDLED_PAYMENT_FAILURE_TYPES as readonly string[]).includes(type);
}

export function productionAcknowledgesUnhandledType(): boolean {
  return true;
}
