/**
 * Mirrors src/web-server.ts checkout + CORS setup that previous coverage
 * PRs do not lock down.
 *
 * Open PR #5 locks line-item mapping and missing-items 500s. Open PR #19
 * locks Connect `/webhook` omitting checkout.session.completed. The catalog
 * website creates `mode: 'payment'` Checkout sessions and has no webhook
 * route at all, so successful catalog charges are never fulfilled.
 *
 * `app.use(cors())` is called with no origin allowlist, so any website can
 * POST /api/checkout against this merchant. There is also no auth on that
 * route.
 */

export const CATALOG_CHECKOUT_PATH = '/api/checkout';

export const CATALOG_WEBHOOK_PATHS = ['/webhook', '/webhook/thin'] as const;

export function catalogWebsiteRegistersPaymentWebhook(): boolean {
  return false;
}

export function catalogCorsIsDefaultWideOpen(): boolean {
  return true;
}

export function catalogCheckoutRequiresAuth(): boolean {
  return false;
}
