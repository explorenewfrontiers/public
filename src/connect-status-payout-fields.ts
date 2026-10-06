/**
 * Mirrors GET /api/accounts/:accountId/status in stripe-connect-sample.
 *
 * Open PRs #24/#28 lock onboardingComplete when requirements are missing
 * or eventually_due. PR #40 locks that write paths ignore
 * readyToProcessPayments. They do not lock that the status JSON omits
 * payouts_enabled and disabled_reason — the dashboard can show "ready
 * to accept payments" while payouts are blocked or the account is
 * disabled for a reason the UI never sees.
 */

export type AccountStatusJson = {
  onboardingComplete: boolean;
  readyToProcessPayments: boolean;
  payouts_enabled?: boolean;
  disabled_reason?: string | null;
};

export function statusExposesPayoutBlockers(status: AccountStatusJson): boolean {
  return Object.prototype.hasOwnProperty.call(status, 'payouts_enabled')
    && Object.prototype.hasOwnProperty.call(status, 'disabled_reason');
}

export function productionStatusIncludesPayoutFields(): boolean {
  return false;
}
