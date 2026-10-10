/**
 * Mirrors catalog Excel Image URL ingest in src/catalog.ts.
 *
 * Open PRs #46/#48 classify dotted-decimal, obfuscated IPv4, and
 * IPv4-mapped IPv6 hosts. They do not lock wildcard DNS names that
 * resolve to loopback or link-local (127.0.0.1.nip.io, sslip.io,
 * localhost.localtest.me). Production stores the raw cell and never
 * calls dns.lookup or matches rebinding suffixes before writing
 * Product.images.
 */

export const DNS_REBIND_IMAGE_URLS = [
  'http://127.0.0.1.nip.io/img.png',
  'http://127.0.0.1.sslip.io/img.png',
  'http://169.254.169.254.nip.io/latest/meta-data/',
  'http://localhost.localtest.me/img.png',
  'http://10.0.0.1.nip.io/admin',
] as const;

const REBIND_SUFFIXES = ['.nip.io', '.sslip.io', '.localtest.me'] as const;

export function nodeHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function hostnameLooksLikeDnsRebind(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return REBIND_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

export function isDnsRebindImageUrl(url: string): boolean {
  const hostname = nodeHostname(url);
  if (hostname === null) {
    return false;
  }
  return hostnameLooksLikeDnsRebind(hostname);
}

export function stripeImagesFromCatalogRow(
  imageUrl: string
): string[] | undefined {
  return imageUrl ? [imageUrl] : undefined;
}

export function productionResolvesOrBlocksRebindHosts(): boolean {
  return false;
}
