/**
 * Pure helpers for connected-account subscription checkout.
 * Kept separate from server.ts so they can be unit-tested without a Stripe key.
 */

export interface SubscriptionCheckoutSpec {
  sessionParams: {
    mode: 'subscription';
    line_items: Array<{ price: string; quantity: number }>;
    success_url: string;
    cancel_url: string;
  };
  requestOptions: {
    stripeAccount: string;
  };
}

/**
 * Build Checkout Session params for a marketplace subscription:
 * the connected account sells to an end customer (direct charge).
 *
 * Do not set `customer_account` to the same connected account — that treats
 * the seller as the subscriber. Prices created on the connected account must
 * be charged with the Stripe-Account header instead.
 */
export function buildSubscriptionCheckoutSession(
  accountId: string,
  priceId: string,
  baseUrl: string
): SubscriptionCheckoutSpec {
  if (!accountId || typeof accountId !== 'string') {
    throw new Error('accountId is required');
  }
  if (!priceId || typeof priceId !== 'string') {
    throw new Error('priceId is required');
  }
  if (!baseUrl || typeof baseUrl !== 'string') {
    throw new Error('baseUrl is required');
  }

  const origin = baseUrl.replace(/\/$/, '');
  const accountQuery = encodeURIComponent(accountId);

  return {
    sessionParams: {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}&accountId=${accountQuery}`,
      cancel_url: `${origin}/?accountId=${accountQuery}`,
    },
    requestOptions: {
      stripeAccount: accountId,
    },
  };
}

export function isRecurringPrice(price: { recurring?: unknown | null }): boolean {
  return price.recurring != null && price.recurring !== false;
}
