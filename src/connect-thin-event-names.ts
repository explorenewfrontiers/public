/**
 * Mirrors Stripe Connect thin-webhook event type strings.
 *
 * Open PR #15 locks handled switch cases as v2.core.account[...] and the
 * unhandled customer-capability event. It does not lock that the dashboard
 * webhook docs and server comments tell operators to subscribe to
 * v2.account[...] (no ".core"), which never matches the switch.
 *
 * Operators who copy the dashboard list into Stripe Dashboard webhooks
 * therefore never hit the requirement or merchant-capability handlers, so
 * KYC / card_payments status changes are logged as unhandled.
 */

export const THIN_WEBHOOK_SWITCH_TYPES = [
  'v2.core.account[requirements].updated',
  'v2.core.account[configuration.merchant].capability_status_updated',
] as const;

export const DASHBOARD_DOCUMENTED_THIN_EVENTS = [
  'v2.account[requirements].updated',
  'v2.account[configuration.merchant].capability_status_updated',
] as const;

export const SERVER_COMMENT_THIN_EVENTS = [
  'v2.account[requirements].updated',
  'v2.account[configuration.merchant].capability_status_updated',
  'v2.account[configuration.customer].capability_status_updated',
] as const;

export function thinSwitchHandles(eventType: string): boolean {
  return (THIN_WEBHOOK_SWITCH_TYPES as readonly string[]).includes(eventType);
}
