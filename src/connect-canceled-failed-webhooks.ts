/**
 * Connect `/webhook` handles subscription update/delete and
 * `invoice.payment_succeeded` but ignores `payment_intent.canceled`
 * and `charge.failed`. Connect never calls `paymentIntents.cancel`.
 *
 * Without `payment_intent.canceled`, a voided authorization
 * (buyer backs out, dashboard cancel, or expiry of an
 * unconfirmed PI) never cancels fulfillment. The order stays
 * "pending" as if payment might still complete. Distinct from
 * `payment_intent.payment_failed` (#40) — that is a declined
 * *attempt*, not a canceled PaymentIntent — and from
 * `checkout.session.expired` (#40) / `charge.expired` (#73).
 *
 * Without `charge.failed`, a Charge object that declines
 * (downstream of a PI, or a direct charge) never updates
 * books. Distinct from `invoice.payment_failed` (#22) (Invoice
 * object) and from `charge.refunded` (#23) / `charge.expired`
 * (#73).
 *
 * Without `paymentIntents.cancel`, this codebase cannot void
 * an open authorization itself. Combined with the missing
 * inbound handlers, neither side of a cancel is covered.
 *
 * Dashboard webhook docs omit both events, so operators never
 * subscribe either.
 *
 * Open coverage PRs lock payment *failed* / session *expired*
 * (#40), invoice payment *failed* (#22), charge *refunded*
 * (#23), and charge *expired* (#73). They do not lock PI
 * cancel or Charge failed.
 */

export interface CanceledFailedWebhookCases {
  handlesPaymentIntentCanceled: boolean;
  handlesPaymentIntentPaymentFailed: boolean;
  handlesChargeFailed: boolean;
  handlesChargeExpired: boolean;
  handlesChargeRefunded: boolean;
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

export function inspectCanceledFailedWebhookCases(
  webhookSource: string
): CanceledFailedWebhookCases {
  return {
    handlesPaymentIntentCanceled: webhookHandlesEventType(
      webhookSource,
      'payment_intent.canceled'
    ),
    handlesPaymentIntentPaymentFailed: webhookHandlesEventType(
      webhookSource,
      'payment_intent.payment_failed'
    ),
    handlesChargeFailed: webhookHandlesEventType(webhookSource, 'charge.failed'),
    handlesChargeExpired: webhookHandlesEventType(webhookSource, 'charge.expired'),
    handlesChargeRefunded: webhookHandlesEventType(
      webhookSource,
      'charge.refunded'
    ),
  };
}

export function canceledPaymentIntentNeverCancelsFulfillment(
  handlesPaymentIntentCanceled: boolean
): boolean {
  return !handlesPaymentIntentCanceled;
}

export function failedChargeNeverUpdatesBooks(
  handlesChargeFailed: boolean
): boolean {
  return !handlesChargeFailed;
}

export function sourceCallsPaymentIntentsCancel(source: string): boolean {
  return /paymentIntents\.cancel\s*\(/.test(source);
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
