/**
 * Mirrors stripe-connect-sample subscription checkout and the dashboard
 * completion path in public/index.html.
 *
 * /api/subscriptions creates a Checkout Session that bills customer_account
 * (the connected account / seller) and returns only sessionId. The dashboard
 * then POSTs /get-session, which the Express app does not define.
 */

export const DASHBOARD_SESSION_LOOKUP_PATH = '/get-session';

export function buildSubscriptionCheckoutParams(
  accountId: string,
  priceId: string,
  baseUrl = 'http://localhost:3000'
): {
  customer_account: string;
  mode: 'subscription';
  line_items: Array<{ price: string; quantity: number }>;
  success_url: string;
  cancel_url: string;
} {
  return {
    customer_account: accountId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/subscription-success?session_id={CHECKOUT_SESSION_ID}&accountId=${accountId}`,
    cancel_url: `${baseUrl}/dashboard?accountId=${accountId}`,
  };
}

export function buildSubscriptionApiResponse(sessionId: string): {
  success: true;
  sessionId: string;
} {
  return {
    success: true,
    sessionId,
  };
}

export function buildBillingPortalParams(
  accountId: string,
  baseUrl = 'http://localhost:3000'
): {
  customer_account: string;
  return_url: string;
} {
  return {
    customer_account: accountId,
    return_url: `${baseUrl}/dashboard?accountId=${accountId}`,
  };
}
