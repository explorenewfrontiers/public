/**
 * Mirrors the Connect dashboard storefront link versus checkout cancel_url.
 * The dashboard opens /storefront.html; checkout cancel sends buyers to
 * /storefront, which express.static will not serve as storefront.html.
 */

export const DASHBOARD_STOREFRONT_PATH = '/storefront.html';
export const CHECKOUT_CANCEL_PATH = '/storefront';

export function buildDashboardStorefrontHref(accountId: string): string {
  return `${DASHBOARD_STOREFRONT_PATH}?accountId=${accountId}`;
}

export function buildCheckoutCancelUrl(
  accountId: string,
  baseUrl = 'http://localhost:3000'
): string {
  return `${baseUrl}${CHECKOUT_CANCEL_PATH}?accountId=${accountId}`;
}
