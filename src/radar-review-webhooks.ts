/**
 * Connect `/webhook` handles subscription update/delete and
 * `invoice.payment_succeeded` but ignores `review.opened` and
 * `review.closed`.
 *
 * Radar can place a charge in manual review after Checkout
 * completes. `checkout.session.completed` (#19) can fire while the
 * Review is still `open`, so a later completed handler that ships
 * immediately would fulfill goods that Radar later rejects.
 * Without `review.opened`, the app never holds fulfillment.
 * Without `review.closed`, it never grants on `approved` or revokes
 * on `closed` / `refunded_as_fraud`.
 *
 * Distinct from `radar.early_fraud_warning.created` and
 * `charge.dispute.closed` (#63) — those are post-charge fraud
 * signals and dispute outcomes, not the in-flight Review object
 * that blocks or releases the payment.
 *
 * Dashboard webhook docs omit both Review events, so operators
 * never subscribe either.
 *
 * Open coverage PRs lock early-fraud-warning / dispute.closed
 * (#63) and async Checkout payment events (#66). They do not lock
 * Radar Review open/close.
 */

export interface RadarReviewWebhookCases {
  handlesPaymentSucceeded: boolean;
  handlesReviewOpened: boolean;
  handlesReviewClosed: boolean;
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

export function inspectRadarReviewWebhookCases(
  webhookSource: string
): RadarReviewWebhookCases {
  return {
    handlesPaymentSucceeded: webhookHandlesEventType(
      webhookSource,
      'invoice.payment_succeeded'
    ),
    handlesReviewOpened: webhookHandlesEventType(webhookSource, 'review.opened'),
    handlesReviewClosed: webhookHandlesEventType(webhookSource, 'review.closed'),
  };
}

export function reviewOpenedNeverHoldsFulfillment(
  handlesReviewOpened: boolean
): boolean {
  return !handlesReviewOpened;
}

export function reviewClosedNeverReleasesOrRevokes(
  handlesReviewClosed: boolean
): boolean {
  return !handlesReviewClosed;
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
