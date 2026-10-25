/**
 * Connect `POST /api/billing-portal` omits `locale` and `flow_data`.
 * The portal follows the browser language (not the hardcoded
 * `identity.country: 'us'` — #28) and always opens the default
 * homepage, so the dashboard cannot deep-link a seller to
 * `payment_method_update`, `subscription_update`, or
 * `subscription_cancel`. Distinct from missing `configuration`
 * (#38), which is why a first-time portal create fails at all.
 *
 * Connect `/webhook` handles `invoice.payment_succeeded` but ignores
 * `invoice.upcoming` (no renewal reminder / dunning start),
 * `invoice.finalized` (no last chance to attach tax/memo before the
 * invoice is locked), and `invoice.voided` (voided invoices never
 * revoke or adjust access). Distinct from `invoice.payment_failed` /
 * `payment_action_required` (#22) and `invoice.paid` (#25).
 *
 * Open coverage PRs lock portal configuration (#38) and the other
 * invoice/subscription webhook cases (#22, #23, #25). They do not
 * lock portal locale/flow_data or the upcoming/finalized/voided
 * invoice lifecycle.
 */

export interface PortalLocaleFlowFields {
  hasLocale: boolean;
  hasFlowData: boolean;
}

export interface InvoiceLifecycleCases {
  handlesPaymentSucceeded: boolean;
  handlesUpcoming: boolean;
  handlesFinalized: boolean;
  handlesVoided: boolean;
}

export function sourceSetsPortalLocale(source: string): boolean {
  return /locale\s*:/.test(source);
}

export function sourceSetsFlowData(source: string): boolean {
  return /flow_data\s*:/.test(source);
}

export function inspectPortalLocaleFlow(source: string): PortalLocaleFlowFields {
  return {
    hasLocale: sourceSetsPortalLocale(source),
    hasFlowData: sourceSetsFlowData(source),
  };
}

export function portalIgnoresMerchantLanguage(hasLocale: boolean): boolean {
  return !hasLocale;
}

export function portalCannotDeepLink(hasFlowData: boolean): boolean {
  return !hasFlowData;
}

export function sourceSetsFlowTypePaymentMethodUpdate(source: string): boolean {
  return /flow_data\s*:\s*\{[\s\S]{0,240}type\s*:\s*['"]payment_method_update['"]/.test(
    source
  );
}

export function sourceSetsFlowTypeSubscriptionCancel(source: string): boolean {
  return /flow_data\s*:\s*\{[\s\S]{0,240}type\s*:\s*['"]subscription_cancel['"]/.test(
    source
  );
}

export function extractBillingPortalCreates(source: string): string {
  const chunks: string[] = [];
  const re = /billingPortal\.sessions\.create\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    chunks.push(source.slice(match.index, match.index + 700));
  }
  return chunks.join('\n---\n');
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

export function inspectInvoiceLifecycleCases(
  webhookSource: string
): InvoiceLifecycleCases {
  return {
    handlesPaymentSucceeded: webhookHandlesEventType(
      webhookSource,
      'invoice.payment_succeeded'
    ),
    handlesUpcoming: webhookHandlesEventType(webhookSource, 'invoice.upcoming'),
    handlesFinalized: webhookHandlesEventType(webhookSource, 'invoice.finalized'),
    handlesVoided: webhookHandlesEventType(webhookSource, 'invoice.voided'),
  };
}

export function renewalRemindersNeverSent(handlesUpcoming: boolean): boolean {
  return !handlesUpcoming;
}

export function finalizedInvoiceCannotAttachTax(
  handlesFinalized: boolean
): boolean {
  return !handlesFinalized;
}

export function voidedInvoiceNeverAdjustsAccess(
  handlesVoided: boolean
): boolean {
  return !handlesVoided;
}
