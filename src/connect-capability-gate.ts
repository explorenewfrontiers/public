/**
 * Mirrors Connect money-movement gates in stripe-connect-sample/server.ts.
 *
 * Open PRs #24/#28 lock how onboardingComplete is computed from requirements
 * summary (missing / eventually_due / restricted still count as complete).
 * They do not lock that write paths never read readyToProcessPayments —
 * the status endpoint computes it, then checkout, subscriptions, product
 * create, and billing portal proceed with only a truthy accountId/priceId.
 */

export const CONNECT_MONEY_ROUTES = [
  'POST /api/products',
  'POST /api/checkout',
  'POST /api/subscriptions',
  'POST /api/billing-portal',
] as const;

export type AccountPaymentStatus = {
  readyToProcessPayments?: boolean;
  onboardingComplete?: boolean;
};

export function shouldBlockMoneyMovement(status: AccountPaymentStatus): boolean {
  return status.readyToProcessPayments !== true;
}

export function productionWriteRouteChecksReadyToProcessPayments(): boolean {
  return false;
}

export function productionWriteRouteChecksOnboardingComplete(): boolean {
  return false;
}

export function productionStatusReturnsReadyToProcessPayments(): boolean {
  return true;
}
