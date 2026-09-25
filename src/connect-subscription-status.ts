/**
 * Mirrors stripe-connect-sample/server.ts webhook access decisions that
 * previous coverage PRs do not lock down.
 *
 * Open PR #10 locks price-object vs price-id comparison. Open PR #22 locks
 * invoice.payment_failed / invoice.payment_action_required as unhandled.
 * Open PR #23 locks customer.subscription.created / charge.refunded as
 * unhandled. Open PR #24 locks the sparse items crash.
 *
 * Production `customer.subscription.updated` never reads
 * `subscription.status`, so past_due / unpaid / incomplete_expired / paused
 * never revoke access. `invoice.paid`, `customer.subscription.paused`, and
 * `customer.subscription.resumed` fall through to the default unhandled
 * logger. Handlers also never read `event.account`, so Connect events from
 * different connected accounts cannot be isolated.
 */

export const HANDLED_THICK_WEBHOOK_EVENTS = [
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
] as const;

export const UNHANDLED_ACCESS_EVENTS = [
  'invoice.paid',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'customer.subscription.trial_will_end',
] as const;

export type SubscriptionAccessStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'canceled'
  | 'paused';

export function subscriptionUpdatedReadsStatus(): boolean {
  return false;
}

export function webhookRoutesByEventAccount(): boolean {
  return false;
}

export function accessActionForSubscriptionStatus(
  _status: SubscriptionAccessStatus
): 'grant' | 'revoke' | 'none' {
  return 'none';
}

export function isThickWebhookEventHandled(eventType: string): boolean {
  return (HANDLED_THICK_WEBHOOK_EVENTS as readonly string[]).includes(eventType);
}
