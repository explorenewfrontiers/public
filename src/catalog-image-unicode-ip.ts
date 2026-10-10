/**
 * Mirrors catalog Excel Image URL ingest in src/catalog.ts.
 *
 * Open PRs #46/#48 lock ASCII dotted-decimal and obfuscated IPv4
 * (2130706433, 0x7f000001, [::ffff:127.0.0.1]). They do not lock
 * Unicode/fullwidth dots, circled-digit IPs, or bare IPv6 loopback /
 * link-local / unique-local literals. WHATWG URL parsing maps the
 * Unicode forms to 127.0.0.1; production never calls new URL() and
 * stores the raw cell as Product.images.
 */

export const UNICODE_LOOPBACK_IMAGE_URLS = [
  'http://127。0。0。1/img.png',
  'http://127．0．0．1/img.png',
  'http://127｡0｡0｡1/img.png',
  'http://①②⑦.⓪.⓪.①/img.png',
] as const;

export const IPV6_PRIVATE_IMAGE_URLS = [
  'http://[::1]/img.png',
  'http://[fe80::1]/img.png',
  'http://[fc00::1]/img.png',
  'http://[fd12:3456:789a:1::1]/img.png',
] as const;

export function whatwgHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function isIpv6LoopbackLinkLocalOrUla(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === '::1') {
    return true;
  }
  if (host.startsWith('fe80:')) {
    return true;
  }
  if (host.startsWith('fc') || host.startsWith('fd')) {
    return true;
  }
  return false;
}

export function isUnicodeOrIpv6PrivateImageUrl(url: string): boolean {
  const hostname = whatwgHostname(url);
  if (hostname === null) {
    return false;
  }
  if (hostname === '127.0.0.1' || hostname === '0.0.0.0') {
    return true;
  }
  return isIpv6LoopbackLinkLocalOrUla(hostname);
}

export function stripeImagesFromCatalogRow(
  imageUrl: string
): string[] | undefined {
  return imageUrl ? [imageUrl] : undefined;
}

export function productionCanonicalizesUnicodeOrIpv6Hosts(): boolean {
  return false;
}
