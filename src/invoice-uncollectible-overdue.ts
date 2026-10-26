/**
 * Connect `/webhook` handles `invoice.payment_succeeded` but ignores
 * `invoice.marked_uncollectible` and `invoice.overdue`.
 *
 * Without `invoice.marked_uncollectible`, writing an invoice off as
 * bad debt never revokes access — the subscriber keeps the product
 * after collections give up. Without `invoice.overdue`, past-due
 * invoices never start dunning / pause the subscription (Stripe
 * Smart Retries may still run, but this app never learns). Distinct
 * from `invoice.payment_failed` / `payment_action_required` (#22),
 * `invoice.paid` (#25), and `invoice.upcoming` / `finalized` /
 * `voided` (#68).
 *
 * The dashboard webhook docs list only
 * `customer.subscription.updated` / `deleted` and
 * `invoice.payment_succeeded`, so operators never subscribe to
 * uncollectible or overdue events either.
 *
 * Open coverage PRs lock those other invoice cases. They do not
 * lock uncollectible write-off or overdue dunning.
 */

export interface InvoiceCollectionsCases {
  handlesPaymentSucceeded: boolean;
  handlesMarkedUncollectible: boolean;
  handlesOverdue: boolean;
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

export function inspectInvoiceCollectionsCases(
  webhookSource: string
): InvoiceCollectionsCases {
  return {
    handlesPaymentSucceeded: webhookHandlesEventType(
      webhookSource,
      'invoice.payment_succeeded'
    ),
    handlesMarkedUncollectible: webhookHandlesEventType(
      webhookSource,
      'invoice.marked_uncollectible'
    ),
    handlesOverdue: webhookHandlesEventType(webhookSource, 'invoice.overdue'),
  };
}

export function uncollectibleInvoiceNeverRevokesAccess(
  handlesMarkedUncollectible: boolean
): boolean {
  return !handlesMarkedUncollectible;
}

export function overdueInvoiceNeverStartsDunning(handlesOverdue: boolean): boolean {
  return !handlesOverdue;
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
