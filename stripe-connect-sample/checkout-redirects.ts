/**
 * Checkout return URLs for the Connect storefront.
 * Stripe redirects the customer here after payment or cancel.
 * These must be real routes — /success and /storefront are not served.
 */

export interface CheckoutRedirectUrls {
  success_url: string;
  cancel_url: string;
}

/**
 * Build success/cancel URLs that land on the existing storefront page.
 * `{CHECKOUT_SESSION_ID}` is left unencoded so Stripe can substitute it.
 */
export function buildPaymentCheckoutRedirects(
  baseUrl: string,
  accountId: string
): CheckoutRedirectUrls {
  if (!baseUrl || typeof baseUrl !== 'string') {
    throw new Error('baseUrl is required');
  }
  if (!accountId || typeof accountId !== 'string') {
    throw new Error('accountId is required');
  }

  const origin = baseUrl.replace(/\/$/, '');
  const accountQuery = encodeURIComponent(accountId);

  return {
    success_url: `${origin}/storefront.html?session_id={CHECKOUT_SESSION_ID}&accountId=${accountQuery}`,
    cancel_url: `${origin}/storefront.html?accountId=${accountQuery}`,
  };
}
