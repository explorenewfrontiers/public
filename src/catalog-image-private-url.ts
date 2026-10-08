/**
 * Mirrors catalog Excel Image URL ingest in src/catalog.ts.
 *
 * Open PR #42 locks javascript:/data:/file:/vbscript: schemes. It does
 * not lock http(s) URLs that target loopback, link-local metadata
 * (169.254.169.254), or RFC1918 hosts. parseProductCatalog stores
 * those strings and syncProductsToStripe passes them as
 * Product.images, which Stripe and later storefronts may fetch
 * (SSRF / browser-side request to internal services).
 */

export function isPrivateOrLinkLocalImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.startsWith('//')) {
    return hostLooksPrivate(trimmed.slice(2).split('/')[0] ?? '');
  }

  let hostname: string;
  try {
    hostname = new URL(trimmed).hostname;
  } catch {
    return hostLooksPrivate(trimmed);
  }
  return hostLooksPrivate(hostname);
}

export function stripeImagesFromCatalogRow(
  imageUrl: string
): string[] | undefined {
  return imageUrl ? [imageUrl] : undefined;
}

export function productionRejectsPrivateImageUrls(): boolean {
  return false;
}

function hostLooksPrivate(hostname: string): boolean {
  let host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(host)) {
    host = host.split(':')[0] ?? host;
  }
  if (
    host === 'localhost' ||
    host === '::1' ||
    host === '0.0.0.0' ||
    host === 'metadata.google.internal' ||
    host.endsWith('.localhost') ||
    host.endsWith('.internal')
  ) {
    return true;
  }

  const octets = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!octets) {
    return false;
  }
  const a = Number(octets[1]);
  const b = Number(octets[2]);
  if (a === 127 || a === 0) {
    return true;
  }
  if (a === 10) {
    return true;
  }
  if (a === 169 && b === 254) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  return false;
}
