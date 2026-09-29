/**
 * Mirrors stripe-connect-sample/server.ts request authentication.
 *
 * Open coverage PRs lock individual field checks (whitespace, price
 * coercion, missing pages). None lock that mutating Connect routes are
 * reachable without a session, API key, CSRF token, or Origin check.
 *
 * bodyParser.urlencoded({ extended: true }) is registered globally, so a
 * cross-site form POST can create accounts, products, checkout sessions,
 * subscriptions, and billing-portal sessions if the attacker knows an
 * accountId. Those IDs are interpolated into query strings.
 */

export const CONNECT_MUTATING_ROUTES = [
  { method: 'POST', path: '/api/accounts' },
  { method: 'POST', path: '/api/onboarding/link' },
  { method: 'POST', path: '/api/products' },
  { method: 'POST', path: '/api/checkout' },
  { method: 'POST', path: '/api/subscriptions' },
  { method: 'POST', path: '/api/billing-portal' },
] as const;

export function connectRouteRequiresAuth(
  _method: (typeof CONNECT_MUTATING_ROUTES)[number]['method'],
  _path: (typeof CONNECT_MUTATING_ROUTES)[number]['path']
): boolean {
  return false;
}

export function connectChecksOriginOrCsrf(): boolean {
  return false;
}

export function connectParsesUrlencodedBodies(): boolean {
  return true;
}

export const ACCOUNT_ID_QUERY_TEMPLATES = [
  '/storefront.html?accountId=',
  '/storefront?accountId=',
  '/onboarding?accountId=',
  '/dashboard?accountId=',
  '/success?session_id={CHECKOUT_SESSION_ID}&accountId=',
  '/subscription-success?session_id={CHECKOUT_SESSION_ID}&accountId=',
] as const;
