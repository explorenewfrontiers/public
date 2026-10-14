/**
 * Catalog and Connect catch Stripe/SDK failures and return
 * `error.message` in the HTTP JSON body. MCP call_tool does the same in
 * JSON-RPC error.message. Stripe messages include Invalid API Key
 * prefixes, "No such price: price_…", and account ids — useful to an
 * unauthenticated Connect or catalog client (#31 / default cors()).
 *
 * Open coverage PRs lock PII in retrieve-tool dumps (#44) and PaymentIntent
 * client_secret stringifying (#40). They do not lock that raw Error.message
 * is echoed on money and catalog routes.
 */

export function clientErrorBody(error: unknown): { error: string } {
  return {
    error: error instanceof Error ? error.message : 'Unknown error',
  };
}

export function jsonRpcToolErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Internal error';
}

export function sourceReflectsErrorMessage(source: string): boolean {
  return /error instanceof Error \? error\.message/.test(source);
}

export function messageLooksLikeStripeInternals(message: string): boolean {
  return (
    /Invalid API Key provided/i.test(message) ||
    /sk_test_|sk_live_/.test(message) ||
    /No such price:/i.test(message) ||
    /No such customer:/i.test(message) ||
    /acct_[A-Za-z0-9]+/.test(message)
  );
}

export function productionSanitizesStripeErrors(): boolean {
  return false;
}
