/**
 * Mirrors stripe-connect-sample/public/index.html merchant dashboard
 * contracts that previous coverage PRs do not lock down.
 *
 * After GET /api/accounts/:id/status, the dashboard only branches on
 * `onboardingComplete`. The else copy claims the account is ready to
 * accept payments and never consults `readyToProcessPayments`, so an
 * account with inactive card_payments still skips the onboarding link.
 *
 * POST /api/products success runs `createProductForm.reset()`, which
 * clears `productAccountId` (the field autofilled at account creation).
 * Product names are interpolated into innerHTML without escaping.
 *
 * POST /api/accounts accepts any truthy contactEmail (no format check).
 */

export interface DashboardAccountStatus {
  onboardingComplete: boolean;
  readyToProcessPayments: boolean;
}

export const DASHBOARD_ONBOARDING_READY_COPY =
  '✓ Onboarding complete! This account is ready to accept payments.';

export function shouldOfferOnboardingLink(status: DashboardAccountStatus): boolean {
  return !status.onboardingComplete;
}

export function dashboardClaimsReadyToAcceptPayments(
  status: DashboardAccountStatus
): boolean {
  return status.onboardingComplete;
}

export const PRODUCT_ACCOUNT_FIELD_ID = 'productAccountId';

export function productAccountIdSurvivesSuccessfulCreate(): boolean {
  // Production calls createProductForm.reset() after success.
  return false;
}

export function renderProductCreatedInfo(
  product: { id: string; name: string },
  priceLabel: string,
  currency: string
): string {
  return (
    `<strong>Product ID:</strong> ${product.id}<br>` +
    `<strong>Name:</strong> ${product.name}<br>` +
    `<strong>Price:</strong> ${priceLabel} ${currency}`
  );
}

export function accountCreateFieldsAccepted(
  displayName: unknown,
  contactEmail: unknown
): boolean {
  return Boolean(displayName && contactEmail);
}
