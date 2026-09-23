/**
 * Mirrors stripe-connect-sample/server.ts webhook access-control routing
 * that previous coverage PRs do not lock down.
 *
 * /webhook handles customer.subscription.updated, customer.subscription.deleted,
 * and invoice.payment_succeeded. It never handles customer.subscription.created,
 * so a newly paid subscription is only logged as unhandled and never grants
 * access. charge.refunded and charge.dispute.created are also unhandled, so
 * refunds and disputes never revoke fulfillment.
 *
 * Dashboard webhook docs list the same three handled events and omit
 * subscription.created, charge.refunded, and charge.dispute.created.
 */

export const CONNECT_HANDLED_ACCESS_EVENTS = [
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
] as const;

export const CONNECT_UNHANDLED_ACCESS_GRANT_EVENTS = [
  'customer.subscription.created',
] as const;

export const CONNECT_UNHANDLED_ACCESS_REVOKE_EVENTS = [
  'charge.refunded',
  'charge.dispute.created',
] as const;

export type ConnectAccessEventKind =
  | (typeof CONNECT_HANDLED_ACCESS_EVENTS)[number]
  | 'unhandled';

export function classifyConnectAccessEvent(eventType: string): ConnectAccessEventKind {
  switch (eventType) {
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'invoice.payment_succeeded':
      return eventType;
    default:
      return 'unhandled';
  }
}

export function newSubscriptionGrantsAccess(eventType: string): boolean {
  return (
    eventType === 'customer.subscription.created' &&
    classifyConnectAccessEvent(eventType) !== 'unhandled'
  );
}

export function refundOrDisputeRevokesAccess(eventType: string): boolean {
  return (
    (CONNECT_UNHANDLED_ACCESS_REVOKE_EVENTS as readonly string[]).includes(eventType) &&
    classifyConnectAccessEvent(eventType) !== 'unhandled'
  );
}
