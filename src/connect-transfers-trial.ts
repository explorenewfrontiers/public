/**
 * Connect `POST /api/accounts` requests `card_payments` only. It never
 * requests the `transfers` capability, so destination charges, separate
 * charges-and-transfers, and platform-to-connected-account payouts are
 * blocked even after KYC. Direct Checkout still sends
 * `application_fee_amount` (#4/#27) on the connected account.
 *
 * Connect `POST /api/subscriptions` creates `mode: 'subscription'` with
 * no `subscription_data.trial_period_days` (or `trial_end` /
 * `trial_settings`). Recurring billing starts immediately — there is
 * no trial window before the first invoice.
 *
 * Open coverage PRs lock application_fee_percent (#27), one-time
 * default_price used as a subscription (#33), and KYC collection
 * fields (#63). They do not lock merchant `transfers` or subscription
 * trials.
 */

export interface MerchantCapabilityRequests {
  hasCardPayments: boolean;
  hasTransfers: boolean;
}

export interface SubscriptionTrialFields {
  hasSubscriptionData: boolean;
  hasTrialPeriodDays: boolean;
  hasTrialSettings: boolean;
}

export function sourceRequestsCardPayments(source: string): boolean {
  return /card_payments\s*:\s*\{[\s\S]{0,80}requested\s*:\s*true/.test(source);
}

export function sourceRequestsTransfers(source: string): boolean {
  return /transfers\s*:\s*\{[\s\S]{0,80}requested\s*:\s*true/.test(source);
}

export function inspectMerchantCapabilityRequests(
  source: string
): MerchantCapabilityRequests {
  return {
    hasCardPayments: sourceRequestsCardPayments(source),
    hasTransfers: sourceRequestsTransfers(source),
  };
}

export function connectedAccountCannotReceiveTransfers(args: {
  hasTransfers: boolean;
}): boolean {
  return !args.hasTransfers;
}

export function sourceSetsSubscriptionData(source: string): boolean {
  return /subscription_data\s*:/.test(source);
}

export function sourceSetsTrialPeriodDays(source: string): boolean {
  return /trial_period_days\s*:/.test(source);
}

export function sourceSetsTrialSettings(source: string): boolean {
  return /trial_settings\s*:/.test(source);
}

export function inspectSubscriptionTrialFields(
  source: string
): SubscriptionTrialFields {
  return {
    hasSubscriptionData: sourceSetsSubscriptionData(source),
    hasTrialPeriodDays: sourceSetsTrialPeriodDays(source),
    hasTrialSettings: sourceSetsTrialSettings(source),
  };
}

export function subscriptionBillsImmediately(args: {
  hasTrialPeriodDays: boolean;
  hasTrialSettings: boolean;
}): boolean {
  return !args.hasTrialPeriodDays && !args.hasTrialSettings;
}

export function extractAccountCreates(source: string): string {
  const chunks: string[] = [];
  const re = /(?:v2\.core\.accounts\.create|accounts\.create)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    chunks.push(source.slice(match.index, match.index + 1600));
  }
  return chunks.join('\n---\n');
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
