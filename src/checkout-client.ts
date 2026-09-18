/**
 * Mirrors catalog and Connect checkout client initialization.
 * Those storefronts never inject a real publishable key (or the connected
 * account) into Stripe.js, so redirectToCheckout cannot complete.
 */

export function resolveCatalogStripeKey(windowStripeKey: unknown): string {
  return (windowStripeKey as string) || '';
}

export function initConnectStorefrontStripe(publishableKey: string): {
  publishableKey: string;
  stripeAccount: undefined;
} {
  // storefront.html: const stripe = Stripe(stripePublishableKey);
  return { publishableKey, stripeAccount: undefined };
}

export const CONNECT_HARDCODED_PUBLISHABLE_KEY = 'pk_test_51234567890';
