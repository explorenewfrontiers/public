/**
 * Mirrors invoice.payment_succeeded handling in Connect /webhook.
 *
 * Open PRs #19/#22/#25 lock missing checkout.session.completed,
 * invoice.payment_failed, and invoice.paid. They do not lock that the
 * succeeded handler only logs invoice.id — it never reads amount_paid,
 * billing_reason, paid, or status — so a $0 invoice, subscription_create
 * vs cycle, or unpaid/open object is indistinguishable if fulfillment
 * is later wired to this event.
 */

export type InvoicePaymentSucceeded = {
  id: string;
  amount_paid?: number;
  billing_reason?: string;
  paid?: boolean;
  status?: string;
};

export function shouldGrantAccessFromInvoice(
  invoice: InvoicePaymentSucceeded
): boolean {
  return invoice.paid === true && (invoice.amount_paid ?? 0) > 0;
}

export function productionInvoiceHandlerReadsAmountPaid(): boolean {
  return false;
}

export function productionInvoiceHandlerReadsBillingReason(): boolean {
  return false;
}
