/**
 * Catalog and Connect Checkout put session_id={CHECKOUT_SESSION_ID} in
 * success_url query strings (locked by #52). Without
 * Cross-Origin-Opener-Policy: same-origin, a page that opened the
 * storefront as a popup keeps window.opener and can read location.href
 * after pay — stealing the Checkout session id.
 *
 * Cross-Origin-Resource-Policy and Cross-Origin-Embedder-Policy are
 * also unset on MCP, both Express apps, HTML shells, and Connect
 * vercel.json (which already sets X-Frame-Options / nosniff).
 *
 * Open coverage PRs #48/#52 lock CSP/X-Frame/nosniff and HSTS/Referrer-
 * Policy. They do not lock COOP / CORP / COEP.
 */

const CROSS_ORIGIN_HEADER_MARKERS = [
  'Cross-Origin-Opener-Policy',
  'cross-origin-opener-policy',
  'Cross-Origin-Resource-Policy',
  'cross-origin-resource-policy',
  'Cross-Origin-Embedder-Policy',
  'cross-origin-embedder-policy',
] as const;

export const CHECKOUT_SESSION_ID_QUERY = 'session_id={CHECKOUT_SESSION_ID}';

export function sourceSetsCrossOriginIsolationHeaders(source: string): boolean {
  return CROSS_ORIGIN_HEADER_MARKERS.some((marker) => source.includes(marker));
}

export function htmlSetsCrossOriginIsolationMeta(html: string): boolean {
  return (
    /http-equiv\s*=\s*["']Cross-Origin-Opener-Policy["']/i.test(html) ||
    /http-equiv\s*=\s*["']Cross-Origin-Resource-Policy["']/i.test(html) ||
    /http-equiv\s*=\s*["']Cross-Origin-Embedder-Policy["']/i.test(html)
  );
}

export function sourcePutsCheckoutSessionIdInQuery(source: string): boolean {
  return source.includes(CHECKOUT_SESSION_ID_QUERY);
}

export function openerCanReadCheckoutSessionId(args: {
  setsCoop: boolean;
  sessionIdInQuery: boolean;
}): boolean {
  return !args.setsCoop && args.sessionIdInQuery;
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

export function productionSetsCoop(): boolean {
  return false;
}
