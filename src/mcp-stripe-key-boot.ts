/**
 * Mirrors Stripe client boot in src/index.ts and src/web-server.ts.
 *
 * Open PR #38 locks Connect throwing before listen when STRIPE_SECRET_KEY
 * is missing. It does not lock MCP/catalog: both construct Stripe with
 * `process.env.STRIPE_API_KEY || ''` and still bind a port, so authenticated
 * RPC and /api/checkout run and then fail inside Stripe calls.
 */

export function connectThrowsWithoutSecretKey(
  stripeSecretKey: string | undefined
): boolean {
  return !stripeSecretKey;
}

export function mcpStripeKeyOrEmpty(envValue: string | undefined): string {
  return envValue || '';
}

export function mcpThrowsBeforeListen(stripeApiKey: string): boolean {
  return false;
}

export function catalogWebThrowsBeforeListen(stripeApiKey: string): boolean {
  return false;
}

export function stripeClientConfigured(apiKey: string): boolean {
  return Boolean(apiKey);
}
