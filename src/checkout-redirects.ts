export interface CatalogCheckoutRedirects {
  success_url: string;
  cancel_url: string;
}

/**
 * Checkout return URLs for the catalog storefront.
 * Stripe redirects the customer here after payment or cancel.
 * `/success` and `/cancel` are not served — send them to the homepage.
 */
export function buildCatalogCheckoutRedirects(
  baseUrl: string
): CatalogCheckoutRedirects {
  if (!baseUrl || typeof baseUrl !== 'string') {
    throw new Error('baseUrl is required');
  }

  const origin = baseUrl.replace(/\/$/, '');

  return {
    // `{CHECKOUT_SESSION_ID}` is left unencoded so Stripe can substitute it.
    success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?checkout=canceled`,
  };
}

/**
 * Map the legacy /success and /cancel paths (still used by in-flight sessions)
 * onto the homepage query-string banners.
 */
export function homepagePathForLegacyCheckoutReturn(
  path: '/success' | '/cancel',
  sessionId?: string
): string {
  if (path === '/cancel') {
    return '/?checkout=canceled';
  }

  if (sessionId) {
    return `/?checkout=success&session_id=${encodeURIComponent(sessionId)}`;
  }

  return '/?checkout=success';
}
