/**
 * Mirrors stripe-connect-sample/server.ts /webhook invoice handling.
 *
 * The Connect sample creates subscriptions and documents
 * invoice.payment_succeeded, but failed and action-required invoices
 * fall through to the default unhandled log. Access is never revoked
 * after a failed recurring charge.
 *
 * Distinct from one-time Checkout events (checkout.session.completed /
 * payment_intent.succeeded) covered by a previous coverage PR.
 */

export const CONNECT_HANDLED_INVOICE_EVENTS = ['invoice.payment_succeeded'] as const;

export const CONNECT_UNHANDLED_SUBSCRIPTION_INVOICE_EVENTS = [
  'invoice.payment_failed',
  'invoice.payment_action_required',
] as const;

export type ConnectInvoiceWebhookKind =
  | (typeof CONNECT_HANDLED_INVOICE_EVENTS)[number]
  | 'unhandled';

export function classifyConnectInvoiceEvent(eventType: string): ConnectInvoiceWebhookKind {
  switch (eventType) {
    case 'invoice.payment_succeeded':
      return eventType;
    default:
      return 'unhandled';
  }
}

export function failedInvoiceRevokesAccess(eventType: string): boolean {
  return (
    (CONNECT_UNHANDLED_SUBSCRIPTION_INVOICE_EVENTS as readonly string[]).includes(
      eventType
    ) && classifyConnectInvoiceEvent(eventType) !== 'unhandled'
  );
}
