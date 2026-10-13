/**
 * Catalog and Connect storefront load Stripe.js from the floating
 * https://js.stripe.com/v3/ major channel. That URL's bytes change as
 * Stripe ships v3 updates, so it cannot be pinned with a stable SRI
 * hash. A versioned file URL (or npm @stripe/stripe-js pin) is required
 * before integrity= is meaningful.
 *
 * Open coverage PR #52 locks the missing integrity/crossorigin
 * attributes. It does not lock that src is the unpinned /v3/ channel
 * rather than a content-addressed or versioned script URL.
 */

export const FLOATING_STRIPE_JS_SRC = 'https://js.stripe.com/v3/';

const STRIPE_SCRIPT_SRC =
  /<script\b[^>]*\bsrc\s*=\s*["'](https:\/\/js\.stripe\.com\/[^"']+)["'][^>]*>/gi;

export function stripeJsScriptSrcs(html: string): string[] {
  const srcs: string[] = [];
  const matches = html.matchAll(STRIPE_SCRIPT_SRC);
  for (const match of matches) {
    const src = match[1];
    if (typeof src === 'string') {
      srcs.push(src);
    }
  }
  return srcs;
}

export function htmlUsesFloatingStripeJsChannel(html: string): boolean {
  const srcs = stripeJsScriptSrcs(html);
  if (srcs.length === 0) {
    return false;
  }
  return srcs.every(
    (src) => src === FLOATING_STRIPE_JS_SRC || src === 'https://js.stripe.com/v3'
  );
}

export function htmlPinsStripeJsVersionedUrl(html: string): boolean {
  const srcs = stripeJsScriptSrcs(html);
  if (srcs.length === 0) {
    return false;
  }
  return srcs.every((src) => {
    if (src === FLOATING_STRIPE_JS_SRC || src === 'https://js.stripe.com/v3') {
      return false;
    }
    return (
      /js\.stripe\.com\/v3\/stripe\.js/i.test(src) ||
      /[?&]v=/.test(src) ||
      /js\.stripe\.com\/(clover|basil|acacia)\//i.test(src)
    );
  });
}

export function productionPinsStripeJsVersion(): boolean {
  return false;
}
