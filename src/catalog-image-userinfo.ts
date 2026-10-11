/**
 * Mirrors catalog Image URL ingest in src/catalog.ts.
 *
 * Open PRs #46/#48/#50 lock dotted-decimal, obfuscated IP, and DNS-rebind
 * hostnames. They do not lock userinfo @-trick URLs such as
 * https://cdn.example.com@169.254.169.254/img.png. WHATWG parsing uses
 * the host after `@` (link-local metadata) while the raw cell still
 * looks like a public CDN. Production stores the raw string on
 * Product.images without calling `new URL`.
 */

export const USERINFO_PRIVATE_IMAGE_URLS = [
  'https://cdn.example.com@169.254.169.254/latest/meta-data/',
  'https://images.stripe.com@127.0.0.1/img.png',
  'http://trusted.example@10.0.0.5/logo.png',
] as const;

export function nodeHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function isUserinfoPrivateImageUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (!parsed.username) {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  if (host === '127.0.0.1' || host === 'localhost' || host === '0.0.0.0') {
    return true;
  }
  const octets = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!octets) {
    return false;
  }
  const a = Number(octets[1]);
  const b = Number(octets[2]);
  if (a === 10 || a === 127 || a === 0) {
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

export function stripeImagesFromCatalogRow(
  imageUrl: string
): string[] | undefined {
  return imageUrl ? [imageUrl] : undefined;
}

export function productionCanonicalizesUserinfoImageUrls(): boolean {
  return false;
}
