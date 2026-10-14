/**
 * Catalog and Connect serve checkout HTML/JS with express.static('public')
 * and no setHeaders / maxAge / Cache-Control options. Express then emits
 * ETag and Last-Modified, so browsers and CDNs can reuse a storefront that
 * still has an empty window.STRIPE_KEY (catalog) or the hardcoded
 * pk_test_51234567890 (Connect) after a key rotation.
 *
 * Open coverage PRs lock missing publishable-key injection (#15) and
 * unpinned Stripe.js (#54). They do not lock Cache-Control: no-store on
 * those payment pages.
 */

export const STATIC_PUBLIC_CALL = "express.static('public')";

export function sourceSetsNoStoreOnStatic(source: string): boolean {
  return (
    /Cache-Control/i.test(source) ||
    /no-store/.test(source) ||
    /setHeaders/.test(source)
  );
}

export function expressStaticHasOptions(source: string): boolean {
  return /express\.static\(\s*['"]public['"]\s*,/.test(source);
}

export function htmlReferencesCheckoutAssets(html: string): boolean {
  return (
    /js\.stripe\.com/.test(html) ||
    /src=["']\/app\.js["']/.test(html) ||
    /redirectToCheckout/.test(html)
  );
}

export function productionSetsNoStoreOnCheckoutAssets(): boolean {
  return false;
}
