/**
 * Catalog and Connect Checkout put `{CHECKOUT_SESSION_ID}` in success_url
 * query strings. After pay, the browser requests Stripe.js and any
 * product Image URLs with that URL as Referer unless Referrer-Policy is set.
 *
 * Open coverage PRs #12/#13 lock missing success pages, #31/#40 lock
 * session.url vs redirectToCheckout, #48 locks CSP/X-Frame/nosniff.
 * They do not lock Strict-Transport-Security, Referrer-Policy, or
 * Permissions-Policy on MCP, the Express apps, HTML shells, or vercel.json
 * (which already sets X-Frame-Options / nosniff but not HSTS).
 */

const TRANSPORT_HEADER_MARKERS = [
  'Strict-Transport-Security',
  'strict-transport-security',
  'Referrer-Policy',
  'referrer-policy',
  'Permissions-Policy',
  'permissions-policy',
] as const;

export const CHECKOUT_SESSION_ID_PLACEHOLDER = 'session_id={CHECKOUT_SESSION_ID}';

export function sourceSetsTransportSecurityHeaders(source: string): boolean {
  return TRANSPORT_HEADER_MARKERS.some((marker) => source.includes(marker));
}

export function htmlSetsReferrerPolicy(html: string): boolean {
  return (
    /http-equiv\s*=\s*["']Referrer-Policy["']/i.test(html) ||
    /name\s*=\s*["']referrer["']/i.test(html)
  );
}

export function sourcePutsCheckoutSessionIdInQuery(source: string): boolean {
  return source.includes(CHECKOUT_SESSION_ID_PLACEHOLDER);
}

export function vercelHeaderNames(vercelJson: string): string[] {
  const parsed: unknown = JSON.parse(vercelJson);
  if (typeof parsed !== 'object' || parsed === null || !('headers' in parsed)) {
    return [];
  }
  const blocks = (parsed as { headers?: unknown }).headers;
  if (!Array.isArray(blocks)) {
    return [];
  }
  const names: string[] = [];
  for (const block of blocks) {
    if (typeof block !== 'object' || block === null || !('headers' in block)) {
      continue;
    }
    const headers = (block as { headers?: unknown }).headers;
    if (!Array.isArray(headers)) {
      continue;
    }
    for (const header of headers) {
      if (typeof header !== 'object' || header === null || !('key' in header)) {
        continue;
      }
      const key = (header as { key?: unknown }).key;
      if (typeof key === 'string') {
        names.push(key);
      }
    }
  }
  return names;
}

export function productionSetsHsts(): boolean {
  return false;
}
