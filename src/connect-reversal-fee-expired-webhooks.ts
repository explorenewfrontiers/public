/**
 * Connect `/webhook` handles subscription update/delete and
 * `invoice.payment_succeeded` but ignores `transfer.reversed`,
 * `application_fee.refunded`, and `charge.expired`.
 *
 * Without `transfer.reversed`, a successful platform-to-seller
 * Transfer that Stripe later claws back (chargeback, fraud, or
 * dashboard reverse) never updates books. The seller stays
 * "paid" while the destination balance is reversed. Distinct
 * from `transfer.failed` (#72) — that is the *initial* Transfer
 * bouncing, not a later reversal of a succeeded Transfer.
 *
 * Without `application_fee.refunded`, a refund of the platform
 * take never updates platform revenue. Distinct from
 * `refunds.create` / payout events (#69) and inbound
 * `charge.refunded` (#23) — those are charge/payout objects,
 * not the Application Fee object Stripe refunds independently.
 *
 * Without `charge.expired`, an uncaptured authorization that
 * times out (typically 7 days) never cancels fulfillment.
 * Distinct from `checkout.session.expired` (#40) and from
 * omitting `capture_method` (#63) — those are session abandon
 * and capture-mode defaults, not the Charge expiry event.
 *
 * Dashboard webhook docs omit all three, so operators never
 * subscribe either.
 *
 * Open coverage PRs lock transfer *failed* (#72), charge
 * *refunded* (#23), refund *tools* / payouts (#69), and
 * session *expired* (#40). They do not lock Transfer
 * reversals, application-fee refunds, or charge expiry.
 */

export interface ReversalFeeExpiredWebhookCases {
  handlesTransferFailed: boolean;
  handlesTransferReversed: boolean;
  handlesApplicationFeeRefunded: boolean;
  handlesChargeExpired: boolean;
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

export function inspectReversalFeeExpiredWebhookCases(
  webhookSource: string
): ReversalFeeExpiredWebhookCases {
  return {
    handlesTransferFailed: webhookHandlesEventType(
      webhookSource,
      'transfer.failed'
    ),
    handlesTransferReversed: webhookHandlesEventType(
      webhookSource,
      'transfer.reversed'
    ),
    handlesApplicationFeeRefunded: webhookHandlesEventType(
      webhookSource,
      'application_fee.refunded'
    ),
    handlesChargeExpired: webhookHandlesEventType(webhookSource, 'charge.expired'),
  };
}

export function reversedTransferLeavesSellerPaid(
  handlesTransferReversed: boolean
): boolean {
  return !handlesTransferReversed;
}

export function refundedApplicationFeeNeverUpdatesBooks(
  handlesApplicationFeeRefunded: boolean
): boolean {
  return !handlesApplicationFeeRefunded;
}

export function expiredChargeNeverCancelsFulfillment(
  handlesChargeExpired: boolean
): boolean {
  return !handlesChargeExpired;
}

export function sourceCallsApplicationFeesRefund(source: string): boolean {
  return /applicationFees\.refund\s*\(/.test(source);
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
