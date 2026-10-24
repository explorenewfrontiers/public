/**
 * Catalog `prices.create` (create path and fallback-create path) and
 * Connect `default_price_data` never set `lookup_key` or `nickname`.
 * Catalog sync also never attaches the new Price as `default_price`.
 *
 * Excel SKU is stored only in `metadata.sku` (#33). Without
 * `lookup_key`, later checkout / MCP callers cannot resolve
 * `prices.list({ lookup_keys })` from that SKU — they need a Price id
 * the Connect storefront often does not have (#10). Without
 * `nickname`, Dashboard and multi-price products have no human label.
 * Catalog `products.create` + `prices.create` never follows with
 * `products.update({ default_price })`, so `product.default_price`
 * stays null after a successful sync (distinct from the ID-hit path
 * that never writes a Price at all — #27).
 *
 * Open coverage PRs lock tax_behavior (#59), tax_code (#61), and
 * numeric SKU metadata (#33). They do not lock lookup_key, nickname,
 * or attaching default_price after catalog create.
 */

export interface PriceLookupNicknameFields {
  hasLookupKey: boolean;
  hasNickname: boolean;
}

export function sourceSetsLookupKey(source: string): boolean {
  return /lookup_key\s*:/.test(source);
}

export function sourceSetsNickname(source: string): boolean {
  return /nickname\s*:/.test(source);
}

export function inspectPriceLookupNickname(
  source: string
): PriceLookupNicknameFields {
  return {
    hasLookupKey: sourceSetsLookupKey(source),
    hasNickname: sourceSetsNickname(source),
  };
}

export function priceCannotBeLookedUpBySku(hasLookupKey: boolean): boolean {
  return !hasLookupKey;
}

export function priceHasNoDashboardLabel(hasNickname: boolean): boolean {
  return !hasNickname;
}

export function catalogAttachesPriceAsDefault(source: string): boolean {
  return (
    /products\.update\s*\([\s\S]{0,400}default_price\s*:/.test(source) ||
    /products\.create\s*\([\s\S]{0,500}default_price_data\s*:/.test(source)
  );
}

export function catalogDefaultPriceStaysNull(
  attachesDefaultPrice: boolean
): boolean {
  return !attachesDefaultPrice;
}

export function extractPricesCreates(source: string): string {
  const chunks: string[] = [];
  const re = /prices\.create\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    chunks.push(source.slice(match.index, match.index + 400));
  }
  return chunks.join('\n---\n');
}

export function extractDefaultPriceData(source: string): string {
  const chunks: string[] = [];
  const re = /default_price_data\s*:\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    chunks.push(source.slice(match.index, match.index + 280));
  }
  return chunks.join('\n---\n');
}
