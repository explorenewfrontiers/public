/**
 * Mirrors catalog Excel image ingest in src/catalog.ts.
 *
 * Open PRs #15/#17 lock that catalog HTML interpolates images[0] into
 * src/alt without escaping. They do not lock that parseProductCatalog
 * and syncProductsToStripe accept javascript:/data:/file: Image URL
 * cells and persist them as Stripe Product.images — stored XSS that
 * later storefronts render as img src.
 */

export const UNSAFE_IMAGE_SCHEMES = [
  'javascript:',
  'data:',
  'file:',
  'vbscript:',
] as const;

export function isUnsafeImageUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  return UNSAFE_IMAGE_SCHEMES.some((scheme) => trimmed.startsWith(scheme));
}

export function stripeImagesFromCatalogRow(
  imageUrl: string
): string[] | undefined {
  return imageUrl ? [imageUrl] : undefined;
}

export function productionRejectsUnsafeImageUrls(): boolean {
  return false;
}
