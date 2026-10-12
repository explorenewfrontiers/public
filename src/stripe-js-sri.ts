/**
 * Catalog checkout and the Connect storefront load Stripe.js from the
 * public CDN with no Subresource Integrity hash and no crossorigin
 * attribute. A CDN compromise or DNS hijack of js.stripe.com would run
 * attacker script on the card-entry pages.
 *
 * Open coverage PRs #15/#40 lock missing publishable keys and
 * redirectToCheckout({ sessionId }); #48 locks CSP meta absence.
 * They do not lock integrity= on the Stripe.js <script> tags.
 */

export const STRIPE_JS_SRC = 'https://js.stripe.com/v3/';

const STRIPE_SCRIPT_TAG =
  /<script\b([^>]*\bsrc\s*=\s*["']https:\/\/js\.stripe\.com\/v3\/?["'][^>]*)>/gi;

export function htmlLoadsStripeJs(html: string): boolean {
  return /https:\/\/js\.stripe\.com\/v3/.test(html);
}

export function stripeJsScriptOpenTags(html: string): string[] {
  const tags: string[] = [];
  const matches = html.matchAll(STRIPE_SCRIPT_TAG);
  for (const match of matches) {
    const open = match[1];
    if (typeof open === 'string') {
      tags.push(open);
    }
  }
  return tags;
}

export function htmlPinsStripeJsIntegrity(html: string): boolean {
  const tags = stripeJsScriptOpenTags(html);
  if (tags.length === 0) {
    return false;
  }
  return tags.every((attrs) => /\bintegrity\s*=/i.test(attrs));
}

export function htmlSetsStripeJsCrossorigin(html: string): boolean {
  const tags = stripeJsScriptOpenTags(html);
  if (tags.length === 0) {
    return false;
  }
  return tags.every((attrs) => /\bcrossorigin\s*=/i.test(attrs));
}

export function productionPinsStripeJsSri(): boolean {
  return false;
}
