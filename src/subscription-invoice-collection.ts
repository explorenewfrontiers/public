/**
 * Connect recurring billing goes only through Checkout
 * `mode: 'subscription'`. There is no `subscriptions.create`, so
 * `collection_method: 'send_invoice'` and `days_until_due` cannot
 * be set — B2B net-30 / invoice-email billing is impossible.
 * Checkout subscription sessions also omit
 * `payment_method_collection`, so a later trial (#66) still always
 * requires a card (`always` is the Stripe default).
 *
 * Distinct from missing `application_fee_percent` (#27),
 * `trial_period_days` (#66), `billing_cycle_anchor` /
 * `proration_behavior` (#67), and Checkout
 * `saved_payment_method_options` (#66) /
 * PaymentIntent `setup_future_usage` (#67).
 *
 * Open coverage PRs lock those cycle/trial/fee/card-save fields.
 * They do not lock send-invoice collection or payment-method
 * collection on subscription Checkout.
 */

export interface SubscriptionInvoiceCollectionFields {
  hasSubscriptionsCreate: boolean;
  hasCollectionMethod: boolean;
  hasSendInvoice: boolean;
  hasDaysUntilDue: boolean;
  hasPaymentMethodCollection: boolean;
}

export function sourceCallsSubscriptionsCreate(source: string): boolean {
  return /subscriptions\.create\s*\(/.test(source);
}

export function sourceSetsCollectionMethod(source: string): boolean {
  return /collection_method\s*:/.test(source);
}

export function sourceSetsSendInvoice(source: string): boolean {
  return /collection_method\s*:\s*['"]send_invoice['"]/.test(source);
}

export function sourceSetsDaysUntilDue(source: string): boolean {
  return /days_until_due\s*:/.test(source);
}

export function sourceSetsPaymentMethodCollection(source: string): boolean {
  return /payment_method_collection\s*:/.test(source);
}

export function inspectSubscriptionInvoiceCollection(
  source: string
): SubscriptionInvoiceCollectionFields {
  return {
    hasSubscriptionsCreate: sourceCallsSubscriptionsCreate(source),
    hasCollectionMethod: sourceSetsCollectionMethod(source),
    hasSendInvoice: sourceSetsSendInvoice(source),
    hasDaysUntilDue: sourceSetsDaysUntilDue(source),
    hasPaymentMethodCollection: sourceSetsPaymentMethodCollection(source),
  };
}

export function b2bInvoiceBillingImpossible(
  hasSubscriptionsCreate: boolean,
  hasSendInvoice: boolean
): boolean {
  return !hasSubscriptionsCreate || !hasSendInvoice;
}

export function netTermsCannotBeSet(hasDaysUntilDue: boolean): boolean {
  return !hasDaysUntilDue;
}

export function subscriptionAlwaysRequiresCard(
  hasPaymentMethodCollection: boolean,
  paymentMethodCollection?: string
): boolean {
  return (
    !hasPaymentMethodCollection || paymentMethodCollection === 'always'
  );
}

export function sourceSetsPaymentMethodCollectionIfRequired(
  source: string
): boolean {
  return /payment_method_collection\s*:\s*['"]if_required['"]/.test(source);
}

export function extractSubscriptionCheckoutCreates(source: string): string {
  const chunks: string[] = [];
  const re = /checkout\.sessions\.create\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    const chunk = source.slice(match.index, match.index + 1100);
    if (/mode:\s*['"]subscription['"]/.test(chunk)) {
      chunks.push(chunk);
    }
  }
  return chunks.join('\n---\n');
}
