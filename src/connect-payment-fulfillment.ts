/**
 * Mirrors stripe-connect-sample one-time checkout vs webhook handling,
 * and the dashboard account-id autofill in public/index.html.
 *
 * POST /api/checkout creates mode:'payment' sessions, but /webhook only
 * switches on subscription/invoice events. checkout.session.completed and
 * payment_intent.succeeded fall through to the default unhandled log.
 *
 * After POST /api/accounts succeeds, the dashboard copies the new account
 * id into onboarding/product/storefront fields, not subscription or billing.
 */

export const CONNECT_CHECKOUT_MODE = 'payment' as const;

export const CONNECT_HANDLED_WEBHOOK_TYPES = [
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
] as const;

export const CONNECT_ONE_TIME_PAYMENT_EVENTS = [
  'checkout.session.completed',
  'payment_intent.succeeded',
] as const;

export type ConnectWebhookKind =
  | (typeof CONNECT_HANDLED_WEBHOOK_TYPES)[number]
  | 'unhandled';

export function classifyConnectWebhookType(eventType: string): ConnectWebhookKind {
  switch (eventType) {
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'invoice.payment_succeeded':
      return eventType;
    default:
      return 'unhandled';
  }
}

export function isUnhandledOneTimePaymentEvent(eventType: string): boolean {
  return (
    (CONNECT_ONE_TIME_PAYMENT_EVENTS as readonly string[]).includes(eventType) &&
    classifyConnectWebhookType(eventType) === 'unhandled'
  );
}

export const DASHBOARD_AUTOFILL_ACCOUNT_FIELDS = [
  'accountIdForOnboarding',
  'productAccountId',
  'storefrontAccountId',
] as const;

export const DASHBOARD_ACCOUNT_FIELDS_NOT_AUTOFILLED = [
  'subscriptionAccountId',
  'billingAccountId',
] as const;
