/**
 * Mirrors Connect account-status and account-create contracts that
 * prior coverage PRs do not lock down.
 *
 * onboardingComplete is only false for `currently_due` and `past_due`.
 * Open PR #24 locks a missing requirements summary as complete. Any
 * other status string — `eventually_due`, `pending_verification`,
 * `restricted`, `disabled` — is also treated as complete, so the
 * dashboard skips the onboarding link (and claims the account can
 * accept payments).
 *
 * Account create hardcodes `identity.country: 'us'`. A non-US merchant
 * cannot onboard; there is no country argument.
 *
 * Product create forwards `currency` without lowercasing, so `USD`
 * is sent to Stripe as-is.
 */

export function isOnboardingComplete(
  requirementsStatus: string | undefined
): boolean {
  return (
    requirementsStatus !== 'currently_due' &&
    requirementsStatus !== 'past_due'
  );
}

export const CONNECT_ACCOUNT_COUNTRY = 'us';

export function connectProductCurrency(currency: unknown): string {
  return (currency as string) || 'usd';
}
