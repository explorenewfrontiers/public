/**
 * Mirrors src/web-server.ts checkout URLs/response and public/app.js
 * post-checkout UI so those contracts can be tested without Stripe.js.
 */

export function resolveCatalogWebsiteBaseUrl(domain?: string): string {
  return domain || 'http://localhost:3000';
}

export function buildCatalogCheckoutUrls(domain?: string): {
  success_url: string;
  cancel_url: string;
} {
  const base = resolveCatalogWebsiteBaseUrl(domain);
  return {
    success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/cancel`,
  };
}

export function buildCatalogCheckoutResponse(sessionId: string): { sessionId: string } {
  return { sessionId };
}

export function catalogCheckoutUiAfterResponse(data: { sessionId?: unknown }): {
  redirectToCheckout: boolean;
  resetButton: boolean;
} {
  if (data.sessionId) {
    return { redirectToCheckout: true, resetButton: false };
  }
  return { redirectToCheckout: false, resetButton: false };
}
