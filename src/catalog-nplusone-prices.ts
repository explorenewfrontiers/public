/**
 * Catalog `GET /api/products` calls `getStripeProducts`, which lists
 * products with no `expand` of default_price or prices. The storefront
 * (`public/app.js`) then calls `loadProductPrice` for every card, and
 * each hit runs `getProductWithPrices` (`products.retrieve` +
 * `prices.list`). A page of 50 products is 1 list + 100 detail Stripe
 * calls (101 total) before the shop renders.
 *
 * Stripe live-mode read limits are typically 100 requests / second per
 * account. A few concurrent shoppers exhaust that budget and 429 the
 * money path (`POST /api/checkout` shares the same key). Connect's
 * storefront does a single expanded list and does not N+1.
 *
 * Open coverage PRs lock missing `has_more` / `starting_after` (#37)
 * and unordered `prices[0]` (#37). They do not lock the per-card
 * price fetch fan-out.
 */

export const CATALOG_STOREFRONT_PRODUCT_LIMIT = 50;

export function getStripeProductsExpandsPrices(source: string): boolean {
  const start = source.indexOf('export async function getStripeProducts');
  if (start < 0) {
    return false;
  }
  const next = source.indexOf('export async function', start + 1);
  const body = next < 0 ? source.slice(start) : source.slice(start, next);
  return /expand\s*:/.test(body);
}

export function getProductWithPricesStripeCalls(): number {
  return 2;
}

export function storefrontFetchesPricePerProduct(appJs: string): boolean {
  return (
    /loadProductPrice\s*\(/.test(appJs) &&
    /productsToShow\.forEach\s*\(\s*\(product\)\s*=>\s*\{?\s*loadProductPrice/.test(
      appJs
    )
  );
}

export function storefrontListLimit(appJs: string): number | null {
  const match = appJs.match(/\/api\/products\?limit=(\d+)/);
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

export function stripeApiCallsForCatalogPageLoad(args: {
  productCount: number;
  listExpandsPrices: boolean;
  detailStripeCallsPerProduct: number;
}): number {
  if (args.listExpandsPrices) {
    return 1;
  }
  return 1 + args.productCount * args.detailStripeCallsPerProduct;
}

export function catalogPageLoadExceedsTypicalReadBudget(args: {
  stripeCalls: number;
  readBudgetPerSecond: number;
}): boolean {
  return args.stripeCalls > args.readBudgetPerSecond;
}

export function extractProductListCall(source: string): string {
  const idx = source.search(/products\.list\s*\(/);
  if (idx < 0) {
    return '';
  }
  return source.slice(idx, idx + 250);
}
