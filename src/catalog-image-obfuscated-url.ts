/**
 * Mirrors catalog Excel Image URL ingest in src/catalog.ts.
 *
 * Open PR #46 classifies dotted-decimal loopback / RFC1918 / 169.254.169.254
 * hostnames. It does not lock obfuscated forms that WHATWG URL parsing
 * (and many HTTP clients) still resolve to loopback or link-local:
 * decimal IPv4 (2130706433), hex IPv4 (0x7f000001), octal/short forms
 * (0177.0.0.1, 127.1), IPv4-mapped IPv6 ([::ffff:127.0.0.1]), and
 * `http://0/` → 0.0.0.0. Production stores the raw cell and never
 * canonicalizes the host before writing Product.images.
 */

export function nodeCanonicalHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function isIpv4MappedLoopbackOrLinkLocal(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return (
    host === '::ffff:7f00:1' ||
    host === '::ffff:a9fe:a9fe' ||
    host.startsWith('::ffff:7f') ||
    host === '::ffff:127.0.0.1' ||
    host === '::ffff:169.254.169.254'
  );
}

export function isObfuscatedPrivateImageUrl(url: string): boolean {
  const hostname = nodeCanonicalHostname(url);
  if (hostname === null) {
    return false;
  }
  if (isIpv4MappedLoopbackOrLinkLocal(hostname)) {
    return true;
  }
  if (hostname === '127.0.0.1' || hostname === '0.0.0.0') {
    return true;
  }
  return false;
}

export function stripeImagesFromCatalogRow(
  imageUrl: string
): string[] | undefined {
  return imageUrl ? [imageUrl] : undefined;
}

export function productionCanonicalizesImageHosts(): boolean {
  return false;
}
