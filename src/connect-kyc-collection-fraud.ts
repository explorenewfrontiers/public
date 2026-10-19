/**
 * Connect `POST /api/onboarding/link` creates a V2 account link without
 * `collection_options.fields`, so Stripe only prompts for
 * `currently_due` requirements. `eventually_due` KYC stays deferred and
 * `onboardingComplete` can already flip true for `eventually_due` (#28).
 *
 * Connect `/webhook` handles `customer.subscription.updated` /
 * `deleted` and `invoice.payment_succeeded` only. It never handles
 * `radar.early_fraud_warning.created` (Radar flagged the charge) or
 * `charge.dispute.closed` (dispute outcome). `#23` locked
 * `charge.dispute.created` / `charge.refunded` as unhandled; a later
 * handler for `created` that still ignores `closed` would never restore
 * or keep revoked access after won/lost disputes.
 *
 * Open coverage PRs lock missing webhook event types for payments (#19),
 * invoices (#22), subscriptions (#23/#25), and replay (#39). They do
 * not lock account-link collection fields or Radar / dispute-closed.
 */

export type ConnectWebhookFraudEvent =
  | 'radar.early_fraud_warning.created'
  | 'charge.dispute.closed';

export interface AccountLinkCollectionFields {
  hasCollectionOptions: boolean;
  hasEventuallyDueFields: boolean;
}

export function sourceSetsCollectionOptions(source: string): boolean {
  return /collection_options\s*:/.test(source);
}

export function sourceRequestsEventuallyDueFields(source: string): boolean {
  return /fields\s*:\s*['"]eventually_due['"]/.test(source);
}

export function inspectAccountLinkCollectionFields(
  source: string
): AccountLinkCollectionFields {
  return {
    hasCollectionOptions: sourceSetsCollectionOptions(source),
    hasEventuallyDueFields: sourceRequestsEventuallyDueFields(source),
  };
}

export function onboardingDefersEventuallyDueKyc(args: {
  hasEventuallyDueFields: boolean;
}): boolean {
  return !args.hasEventuallyDueFields;
}

export function webhookHandlesFraudEvent(
  source: string,
  event: ConnectWebhookFraudEvent
): boolean {
  switch (event) {
    case 'radar.early_fraud_warning.created':
      return /radar\.early_fraud_warning\.created/.test(source);
    case 'charge.dispute.closed':
      return /charge\.dispute\.closed/.test(source);
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

export function webhookIgnoresFraudOutcome(args: {
  handlesEarlyFraudWarning: boolean;
  handlesDisputeClosed: boolean;
}): boolean {
  return !args.handlesEarlyFraudWarning && !args.handlesDisputeClosed;
}

export function extractAccountLinkCreates(source: string): string {
  const chunks: string[] = [];
  const re = /accountLinks\.create\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    chunks.push(source.slice(match.index, match.index + 700));
  }
  return chunks.join('\n---\n');
}

export function extractWebhookSwitch(source: string): string {
  const marker = /switch\s*\(\s*event\.type\s*\)/;
  const match = marker.exec(source);
  if (!match) {
    return '';
  }
  return source.slice(match.index, match.index + 2800);
}

export const CONNECT_WEBHOOK_FRAUD_EVENTS: readonly ConnectWebhookFraudEvent[] = [
  'radar.early_fraud_warning.created',
  'charge.dispute.closed',
];
