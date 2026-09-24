/**
 * Mirrors stripe-connect-sample/server.ts GET /api/accounts/:accountId/status
 * onboardingComplete derivation that previous coverage PRs do not lock down.
 *
 * Open PR #7 checks currently_due → incomplete and eventually_due + active
 * card_payments → complete. Production treats any other status — including
 * a missing requirements summary — as complete:
 *
 *   requirementsStatus !== 'currently_due' && !== 'past_due'
 *
 * A brand-new account whose requirements object is omitted or still empty
 * therefore reports onboardingComplete: true even though KYC has not started.
 */

export function isOnboardingComplete(requirementsStatus: string | undefined): boolean {
  return requirementsStatus !== 'currently_due' && requirementsStatus !== 'past_due';
}

export function onboardingCompleteFromAccount(account: {
  requirements?: {
    summary?: {
      minimum_deadline?: { status?: string };
    };
  };
}): boolean {
  const requirementsStatus = account.requirements?.summary?.minimum_deadline?.status;
  return isOnboardingComplete(requirementsStatus);
}
