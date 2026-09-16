export const DEFAULT_CONNECT_BASE_URL = 'http://localhost:3000';

export function resolveConnectBaseUrl(domain?: string): string {
  return domain || DEFAULT_CONNECT_BASE_URL;
}

export function buildCheckoutRedirectUrls(
  accountId: string,
  domain?: string
): { success_url: string; cancel_url: string } {
  const baseUrl = resolveConnectBaseUrl(domain);
  return {
    success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&accountId=${accountId}`,
    cancel_url: `${baseUrl}/storefront?accountId=${accountId}`,
  };
}

export function buildSubscriptionRedirectUrls(
  accountId: string,
  domain?: string
): { success_url: string; cancel_url: string } {
  const baseUrl = resolveConnectBaseUrl(domain);
  return {
    success_url: `${baseUrl}/subscription-success?session_id={CHECKOUT_SESSION_ID}&accountId=${accountId}`,
    cancel_url: `${baseUrl}/dashboard?accountId=${accountId}`,
  };
}

export function buildOnboardingRedirectUrls(
  accountId: string,
  domain?: string
): { refresh_url: string; return_url: string } {
  const baseUrl = resolveConnectBaseUrl(domain);
  return {
    refresh_url: `${baseUrl}/onboarding?accountId=${accountId}`,
    return_url: `${baseUrl}/dashboard?accountId=${accountId}`,
  };
}

export function buildBillingPortalReturnUrl(accountId: string, domain?: string): string {
  const baseUrl = resolveConnectBaseUrl(domain);
  return `${baseUrl}/dashboard?accountId=${accountId}`;
}

export function buildCheckoutSessionResponse(sessionId: string): {
  success: true;
  sessionId: string;
} {
  return {
    success: true,
    sessionId,
  };
}

export const CONNECT_REDIRECT_PATHS = [
  '/success',
  '/storefront',
  '/subscription-success',
  '/dashboard',
  '/onboarding',
] as const;
