/**
 * Mirrors stripe-connect-sample/server.ts subscription vs one-time fee
 * collection. Open coverage PRs lock the one-time checkout fee formula
 * (`Math.round((quantity || 1) * 0.1)` ≈ 0 cents) but not that
 * POST /api/subscriptions creates a recurring Checkout session with no
 * platform take at all.
 *
 * Production one-time checkout sets payment_intent_data.application_fee_amount.
 * Production subscriptions set mode: 'subscription' and never pass
 * subscription_data.application_fee_percent or application_fee_amount.
 */

export interface SubscriptionCheckoutParams {
  mode?: string;
  customer_account?: string;
  subscription_data?: {
    application_fee_percent?: number;
  };
  payment_intent_data?: {
    application_fee_amount?: number;
  };
  application_fee_amount?: number;
  application_fee_percent?: number;
}

export function subscriptionCheckoutTakesPlatformFee(
  params: SubscriptionCheckoutParams
): boolean {
  const percent = params.subscription_data?.application_fee_percent;
  return (
    typeof params.application_fee_percent === 'number' ||
    typeof params.application_fee_amount === 'number' ||
    typeof params.payment_intent_data?.application_fee_amount === 'number' ||
    (typeof percent === 'number' && percent > 0)
  );
}

export function currentSubscriptionCheckoutParams(): SubscriptionCheckoutParams {
  return {
    mode: 'subscription',
    customer_account: 'acct_connected',
  };
}
