/**
 * MCP, catalog, and Connect construct Stripe clients with no timeout
 * and no maxNetworkRetries. Money tools (create_payment_intent,
 * checkout.sessions.create) and catalog sync then await those calls.
 * A hung Stripe API leaves the HTTP request open indefinitely; MCP
 * also never aborts on client disconnect (see coverage notes on #39).
 */

export function sourceConfiguresStripeTimeoutOrRetries(source: string): boolean {
  return (
    /timeout\s*:/.test(source) ||
    source.includes('maxNetworkRetries') ||
    source.includes('maxNetworkRetries:')
  );
}

export function productionSetsStripeTimeout(): boolean {
  return false;
}
