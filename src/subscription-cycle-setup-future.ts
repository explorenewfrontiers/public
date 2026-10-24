/**
 * Connect `POST /api/subscriptions` creates `mode: 'subscription'`
 * with no `subscription_data.billing_cycle_anchor` or
 * `proration_behavior`. Recurring invoices align to session-complete
 * rather than a merchant billing date, and later plan changes
 * (webhook already compares previous vs current price — #24) have no
 * proration policy. Distinct from missing `trial_period_days` (#66)
 * and missing `application_fee_percent` (#27).
 *
 * MCP `create_payment_intent` and Connect payment Checkout
 * `payment_intent_data` omit `setup_future_usage`. Cards are not
 * saved for off-session charges. Distinct from Checkout
 * `saved_payment_method_options` (#66), which only affects the
 * hosted Checkout wallet UI.
 *
 * Open coverage PRs lock subscription fees (#27), trials (#66), and
 * Checkout saved-PM options (#66). They do not lock billing-cycle
 * anchors, proration, or PaymentIntent card reuse.
 */

export interface SubscriptionCycleFields {
  hasBillingCycleAnchor: boolean;
  hasProrationBehavior: boolean;
}

export interface SetupFutureUsageFields {
  hasSetupFutureUsage: boolean;
}

export function sourceSetsBillingCycleAnchor(source: string): boolean {
  return /billing_cycle_anchor\s*:/.test(source);
}

export function sourceSetsProrationBehavior(source: string): boolean {
  return /proration_behavior\s*:/.test(source);
}

export function sourceSetsSetupFutureUsage(source: string): boolean {
  return /setup_future_usage\s*:/.test(source);
}

export function inspectSubscriptionCycleFields(
  source: string
): SubscriptionCycleFields {
  return {
    hasBillingCycleAnchor: sourceSetsBillingCycleAnchor(source),
    hasProrationBehavior: sourceSetsProrationBehavior(source),
  };
}

export function inspectSetupFutureUsage(source: string): SetupFutureUsageFields {
  return {
    hasSetupFutureUsage: sourceSetsSetupFutureUsage(source),
  };
}

export function subscriptionStartsAtSessionComplete(
  hasBillingCycleAnchor: boolean
): boolean {
  return !hasBillingCycleAnchor;
}

export function planChangeHasNoProrationPolicy(
  hasProrationBehavior: boolean
): boolean {
  return !hasProrationBehavior;
}

export function paymentIntentDoesNotSaveCard(
  hasSetupFutureUsage: boolean
): boolean {
  return !hasSetupFutureUsage;
}

export function sourceSetsSetupFutureUsageOffSession(source: string): boolean {
  return /setup_future_usage\s*:\s*['"]off_session['"]/.test(source);
}

export function extractSubscriptionCheckoutCreates(source: string): string {
  const chunks: string[] = [];
  const re = /checkout\.sessions\.create\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    const chunk = source.slice(match.index, match.index + 900);
    if (/mode:\s*['"]subscription['"]/.test(chunk)) {
      chunks.push(chunk);
    }
  }
  return chunks.join('\n---\n');
}

export function extractPaymentIntentCreates(source: string): string {
  const chunks: string[] = [];
  const re = /paymentIntents\.create\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    chunks.push(source.slice(match.index, match.index + 400));
  }
  return chunks.join('\n---\n');
}

export function extractPaymentCheckoutCreates(source: string): string {
  const chunks: string[] = [];
  const re = /checkout\.sessions\.create\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    const chunk = source.slice(match.index, match.index + 1100);
    if (/mode:\s*['"]payment['"]/.test(chunk)) {
      chunks.push(chunk);
    }
  }
  return chunks.join('\n---\n');
}
