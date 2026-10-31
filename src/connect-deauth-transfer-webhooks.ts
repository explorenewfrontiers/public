/**
 * Connect `/webhook` handles subscription update/delete and
 * `invoice.payment_succeeded` but ignores
 * `account.application.deauthorized` and `transfer.failed`.
 *
 * Without `account.application.deauthorized`, a connected account
 * that disconnects the platform from the Stripe Dashboard keeps a
 * live storefront. Later Checkout / product / portal calls using
 * `stripeAccount` fail, but this app never revokes the mapping or
 * stops advertising the seller.
 *
 * Without `transfer.failed`, a platform-to-connected-account
 * transfer that bounces never notifies the seller or retries.
 * Distinct from requesting the merchant `transfers` *capability*
 * (#66) and from `payout.failed` (#69) — those are "can we transfer"
 * and "did Stripe payout land", not "did this Transfer object fail".
 *
 * Dashboard webhook docs list only subscription update/delete and
 * `invoice.payment_succeeded`, so operators never subscribe to
 * deauthorize or transfer-failed events either.
 *
 * Open coverage PRs lock transfers *capability* (#66) and payout
 * *events* (#69). They do not lock deauthorization or Transfer
 * object failures.
 */

export interface DeauthTransferWebhookCases {
  handlesSubscriptionDeleted: boolean;
  handlesDeauthorized: boolean;
  handlesTransferFailed: boolean;
}

export function extractClassicWebhookHandler(source: string): string {
  const start = source.indexOf("'/webhook'");
  const thin = source.indexOf("'/webhook/thin'");
  if (start === -1) {
    return '';
  }
  const end = thin === -1 ? source.length : thin;
  return source.slice(start, end);
}

export function webhookHandlesEventType(
  webhookSource: string,
  eventType: string
): boolean {
  const escaped = eventType.replace(/\./g, '\\.');
  return new RegExp(`case\\s+['"]${escaped}['"]`).test(webhookSource);
}

export function inspectDeauthTransferWebhookCases(
  webhookSource: string
): DeauthTransferWebhookCases {
  return {
    handlesSubscriptionDeleted: webhookHandlesEventType(
      webhookSource,
      'customer.subscription.deleted'
    ),
    handlesDeauthorized: webhookHandlesEventType(
      webhookSource,
      'account.application.deauthorized'
    ),
    handlesTransferFailed: webhookHandlesEventType(
      webhookSource,
      'transfer.failed'
    ),
  };
}

export function disconnectedAccountKeepsStorefront(
  handlesDeauthorized: boolean
): boolean {
  return !handlesDeauthorized;
}

export function failedTransferNeverNotifiesSeller(
  handlesTransferFailed: boolean
): boolean {
  return !handlesTransferFailed;
}

export function sourceCallsTransfersCreate(source: string): boolean {
  return /transfers\.create\s*\(/.test(source);
}

export function dashboardDocumentsWebhookEvent(
  dashboardSource: string,
  eventType: string
): boolean {
  return dashboardSource.includes(eventType);
}

export function extractDashboardWebhookDocs(html: string): string {
  const heading = html.indexOf('Webhook Setup');
  if (heading === -1) {
    return '';
  }
  return html.slice(heading, heading + 1800);
}
