/**
 * Mirrors money-create call sites that previous coverage PRs do not lock
 * down: none of the Stripe creates send an idempotency key, and the
 * Connect storefront Buy Now handler does not disable the button.
 *
 * Open PR #7 locks payment-intent field mapping. Open PR #14 locks
 * unvalidated amounts. Open PR #15 locks the hardcoded publishable key.
 * Open PR #19 locks catalog checkout forwarding quantity 0.
 *
 * A retried MCP `create_payment_intent` / Connect `/api/checkout` /
 * `/api/subscriptions` / `create_customer` therefore creates a second
 * Stripe object. The Connect storefront `handlePurchase` never sets
 * `disabled` on the buy button, so a double-click opens two Checkout
 * sessions. MCP also pins unpublished `apiVersion: '2024-11-20'`.
 */

export function moneyCreatesUseIdempotencyKey(): boolean {
  return false;
}

export function storefrontBuyDisablesButton(): boolean {
  return false;
}

export const MCP_STRIPE_API_VERSION = '2024-11-20';
