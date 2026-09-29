/**
 * Mirrors catalog and Connect checkout session responses vs client redirect.
 *
 * Open PR #15 locks missing/hardcoded publishable keys and Stripe.js
 * init without stripeAccount. Both checkout APIs still return only
 * sessionId and drop session.url. Clients call the deprecated
 * stripe.redirectToCheckout({ sessionId }). When Stripe.js cannot
 * initialize (empty key, placeholder pk_test, missing stripeAccount),
 * there is no hosted-session URL to fall back to, so a created session
 * never reaches the customer.
 */

export function connectCheckoutJson(session: { id: string; url: string | null }): {
  success: true;
  sessionId: string;
} {
  return {
    success: true,
    sessionId: session.id,
  };
}

export function catalogCheckoutJson(session: { id: string; url: string | null }): {
  sessionId: string;
} {
  return { sessionId: session.id };
}

export function checkoutResponseIncludesUrl(
  body: { sessionId?: string; url?: string | null }
): boolean {
  return typeof body.url === 'string' && body.url.length > 0;
}

export const CHECKOUT_CLIENT_REDIRECT = 'redirectToCheckout' as const;
