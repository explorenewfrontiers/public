/**
 * Catalog and Connect HTTP servers interpolate untrusted product
 * fields into HTML (see public/app.js and the Connect storefront).
 * Open XSS coverage PRs (#15/#17/#19/#23/#45/#47) lock interpolation.
 * They do not lock that neither Express app nor the HTML shells set
 * Content-Security-Policy, X-Frame-Options, or X-Content-Type-Options,
 * so a stored XSS payload is not constrained by a CSP.
 */

const SECURITY_HEADER_MARKERS = [
  'Content-Security-Policy',
  'content-security-policy',
  'X-Frame-Options',
  'X-Content-Type-Options',
  'helmet',
] as const;

export function sourceSetsBrowserSecurityHeaders(source: string): boolean {
  return SECURITY_HEADER_MARKERS.some((marker) => source.includes(marker));
}

export function htmlSetsCspMeta(html: string): boolean {
  return /http-equiv\s*=\s*["']Content-Security-Policy["']/i.test(html);
}

export function productionSetsCsp(): boolean {
  return false;
}
