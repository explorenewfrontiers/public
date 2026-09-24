/**
 * Mirrors stripe-connect-sample/server.ts Stripe redirect URL construction
 * and the dashboard status fetch that previous coverage PRs do not lock down.
 *
 * Open PR #12 locks missing success/cancel/dashboard pages. Open PR #23
 * locks client storefront `?accountId=` query concatenation. Production
 * still interpolates the raw `accountId` into onboarding, checkout,
 * subscription, and billing-portal return URLs with no encodeURIComponent.
 * A crafted id such as `acct_1&to=https://evil.test` injects extra query
 * params into Stripe-hosted redirects. The dashboard status GET also
 * concatenates the raw id into the path.
 */

export function buildConnectRedirectUrls(baseUrl: string, accountId: string): {
  onboardingRefresh: string;
  onboardingReturn: string;
  checkoutSuccess: string;
  checkoutCancel: string;
  subscriptionSuccess: string;
  subscriptionCancel: string;
  billingPortalReturn: string;
} {
  return {
    onboardingRefresh: `${baseUrl}/onboarding?accountId=${accountId}`,
    onboardingReturn: `${baseUrl}/dashboard?accountId=${accountId}`,
    checkoutSuccess: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&accountId=${accountId}`,
    checkoutCancel: `${baseUrl}/storefront?accountId=${accountId}`,
    subscriptionSuccess: `${baseUrl}/subscription-success?session_id={CHECKOUT_SESSION_ID}&accountId=${accountId}`,
    subscriptionCancel: `${baseUrl}/dashboard?accountId=${accountId}`,
    billingPortalReturn: `${baseUrl}/dashboard?accountId=${accountId}`,
  };
}

export function dashboardAccountStatusPath(accountId: string): string {
  return `/api/accounts/${accountId}/status`;
}

export function redirectUrlsEncodeAccountId(): boolean {
  return false;
}
