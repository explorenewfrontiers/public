/**
 * MCP call_tool forwards create_payment_intent / create_customer with
 * no per-key or per-IP rate limit. Catalog and Connect checkout POSTs
 * are likewise unbounded. Combined with no auth on Connect mutating
 * POSTs (PR #31) and optional MCP auth, a client can mint unbounded
 * Stripe API traffic and payment intents.
 */

const RATE_LIMIT_MARKERS = [
  'rateLimit',
  'rate-limit',
  'RateLimiter',
  'express-rate-limit',
  'tokenBucket',
  'maxRequests',
] as const;

export function sourceHasRateLimiter(source: string): boolean {
  return RATE_LIMIT_MARKERS.some((marker) => source.includes(marker));
}

export function productionRateLimitsMoneyTools(): boolean {
  return false;
}
