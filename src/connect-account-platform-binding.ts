/**
 * Mirrors Connect account create in stripe-connect-sample/server.ts.
 *
 * Open PRs #28/#31 lock identity.country hardcoding and missing CSRF on
 * POSTs. They do not lock that v2.core.accounts.create takes only
 * display_name / contact_email / identity / dashboard / defaults /
 * configuration — no metadata.platform_user_id (or any metadata) — so
 * the platform cannot bind a Stripe account to a user if the in-memory
 * dashboard is lost.
 */

export type AccountCreatePayload = {
  display_name: string;
  contact_email: string;
  metadata?: Record<string, string>;
};

export function hasPlatformUserBinding(payload: AccountCreatePayload): boolean {
  const userId = payload.metadata?.platform_user_id;
  return typeof userId === 'string' && userId.trim().length > 0;
}

export function productionAccountCreateSetsMetadata(): boolean {
  return false;
}
