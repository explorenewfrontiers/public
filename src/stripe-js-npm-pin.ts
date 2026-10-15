/**
 * Catalog and Connect storefronts load Stripe.js from the floating CDN
 * URL https://js.stripe.com/v3/. Neither package.json depends on
 * @stripe/stripe-js, so a compromised or unexpectedly updated CDN
 * script is what Checkout actually executes. There is no npm-pinned,
 * SRI-hashed, or bundler-resolved Stripe.js.
 *
 * Open coverage PRs lock missing SRI (#52) and the unversioned /v3/
 * channel (#54). They do not lock that the npm package is absent, so a
 * later "pin Stripe.js" change that only versions the CDN URL would
 * still leave the checkout pages on an unsigned remote script.
 */

export const STRIPE_JS_NPM_PACKAGE = '@stripe/stripe-js';
export const CDN_STRIPE_JS_SRC = 'https://js.stripe.com/v3/';

export function packageJsonPinsStripeJs(packageJson: string): boolean {
  const parsed: unknown = JSON.parse(packageJson);
  if (typeof parsed !== 'object' || parsed === null) {
    return false;
  }
  const record = parsed as {
    dependencies?: unknown;
    devDependencies?: unknown;
  };
  return (
    objectHasPackage(record.dependencies, STRIPE_JS_NPM_PACKAGE) ||
    objectHasPackage(record.devDependencies, STRIPE_JS_NPM_PACKAGE)
  );
}

function objectHasPackage(deps: unknown, name: string): boolean {
  return typeof deps === 'object' && deps !== null && name in deps;
}

export function htmlLoadsCdnStripeJs(html: string): boolean {
  return /https:\/\/js\.stripe\.com\/v3\/?/.test(html);
}

export function htmlImportsNpmStripeJs(html: string): boolean {
  return /@stripe\/stripe-js/.test(html);
}

export function checkoutUsesRemoteStripeJs(args: {
  htmlLoadsCdn: boolean;
  packagePinsNpm: boolean;
}): boolean {
  return args.htmlLoadsCdn && !args.packagePinsNpm;
}
