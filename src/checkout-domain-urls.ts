/**
 * Mirrors catalog and Connect Checkout/onboarding return URL construction.
 * Prior coverage PRs lock missing /success and /cancel pages and raw
 * accountId interpolation, but not DOMAIN joining.
 *
 * Production concatenates `${DOMAIN}/path` with no slash normalize and
 * no absolute-URL check:
 *   DOMAIN=https://shop.example.com/  →  https://shop.example.com//success
 *   DOMAIN=shop.example.com           →  shop.example.com/success
 *
 * Stripe Checkout requires an absolute https? URL. A trailing slash or
 * a protocol-less DOMAIN sends a paid customer to a 404 or fails session
 * create. Connect onboarding, subscription, and billing-portal returns
 * use the same join.
 */

export function joinDomainPath(domain: string, suffix: string): string {
  return `${domain}/${suffix.replace(/^\//, '')}`;
}

export function catalogSuccessUrl(domain: string): string {
  return `${domain}/success?session_id={CHECKOUT_SESSION_ID}`;
}

export function catalogCancelUrl(domain: string): string {
  return `${domain}/cancel`;
}

export function connectOnboardingRefreshUrl(domain: string, accountId: string): string {
  return `${domain}/onboarding?accountId=${accountId}`;
}

export function connectCheckoutSuccessUrl(domain: string, accountId: string): string {
  return `${domain}/success?session_id={CHECKOUT_SESSION_ID}&accountId=${accountId}`;
}

export function isAbsoluteHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function hasDoubleSlashInPath(url: string): boolean {
  return /https?:\/\/[^/]+\/\//.test(url);
}
