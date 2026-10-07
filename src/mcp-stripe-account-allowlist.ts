/**
 * Mirrors MCP Stripe-Account header handling in src/index.ts.
 *
 * Open PR #3 locks that a Stripe-Account header is forwarded onto the
 * Stripe client. It does not lock that any truthy value is accepted —
 * there is no allowlist of connected account IDs and no `acct_` format
 * check — so a caller who can reach the MCP can operate on any
 * connected account the platform secret can access.
 */

export function stripeAccountOptionFromHeader(
  header: string | undefined
): string | undefined {
  return header || undefined;
}

export function isLikelyConnectedAccountId(value: string): boolean {
  return /^acct_[A-Za-z0-9]+$/.test(value);
}

export function isStripeAccountAllowlisted(
  header: string,
  allowlist: ReadonlySet<string>
): boolean {
  return allowlist.has(header);
}

export function productionEnforcesStripeAccountAllowlist(): boolean {
  return false;
}

export function productionRequiresAcctPrefix(): boolean {
  return false;
}
