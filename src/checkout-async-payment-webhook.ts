/**
 * Catalog Checkout is `mode: 'payment'` with `payment_method_types:
 * ['card']`. Connect Checkout is also `mode: 'payment'` and sets no
 * payment_method_types, so Stripe can offer delayed methods (ACH,
 * bank transfer, Konbini, Boleto) when the Dashboard enables them.
 *
 * Those methods complete Checkout as `unpaid`. Stripe later sends
 * `checkout.session.async_payment_succeeded` or
 * `checkout.session.async_payment_failed`. Connect `/webhook` only
 * handles `customer.subscription.updated` / `deleted` and
 * `invoice.payment_succeeded`. It never handles the async Checkout
 * pair, so delayed payments never grant access and later failures
 * never revoke it.
 *
 * Open coverage PRs lock `checkout.session.completed` /
 * `payment_intent.succeeded` (#19), `payment_intent.payment_failed` /
 * `checkout.session.expired` (#40), and Radar / `dispute.closed`
 * (#63). They do not lock the async Checkout payment pair.
 */

export type ConnectWebhookAsyncCheckoutEvent =
  | 'checkout.session.async_payment_succeeded'
  | 'checkout.session.async_payment_failed';

export function webhookHandlesAsyncCheckoutEvent(
  source: string,
  event: ConnectWebhookAsyncCheckoutEvent
): boolean {
  switch (event) {
    case 'checkout.session.async_payment_succeeded':
      return /checkout\.session\.async_payment_succeeded/.test(source);
    case 'checkout.session.async_payment_failed':
      return /checkout\.session\.async_payment_failed/.test(source);
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

export function delayedCheckoutNeverFulfillsOrRevokes(args: {
  handlesAsyncSucceeded: boolean;
  handlesAsyncFailed: boolean;
}): boolean {
  return !args.handlesAsyncSucceeded && !args.handlesAsyncFailed;
}

export function sourceOffersUnrestrictedPaymentMethods(source: string): boolean {
  const creates = extractPaymentCheckoutCreates(source);
  if (!creates) {
    return false;
  }
  return !/payment_method_types\s*:/.test(creates);
}

export function extractPaymentCheckoutCreates(source: string): string {
  const chunks: string[] = [];
  const re = /checkout\.sessions\.create\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    const chunk = source.slice(match.index, match.index + 900);
    if (/mode:\s*['"]payment['"]/.test(chunk)) {
      chunks.push(chunk);
    }
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

export const CONNECT_WEBHOOK_ASYNC_CHECKOUT_EVENTS: readonly ConnectWebhookAsyncCheckoutEvent[] =
  ['checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed'];
