/**
 * Connect account helpers that use the v1 Accounts API.
 * stripe@15 (this sample's dependency) has no `stripe.v2` namespace —
 * calling v2.core.accounts would throw before any Stripe request is sent.
 */

export interface AccountCreateSpec {
  type: 'express';
  country: 'US';
  email: string;
  business_profile: { name: string };
  capabilities: {
    card_payments: { requested: true };
    transfers: { requested: true };
  };
}

export interface AccountLinkSpec {
  account: string;
  type: 'account_onboarding';
  refresh_url: string;
  return_url: string;
}

export interface AccountStatusInput {
  id: string;
  details_submitted?: boolean | null;
  capabilities?: { card_payments?: string | null } | null;
  requirements?: {
    currently_due?: string[] | null;
    past_due?: string[] | null;
  } | null;
}

export interface AccountStatusResponse {
  success: true;
  accountId: string;
  onboardingComplete: boolean;
  readyToProcessPayments: boolean;
  currentlyDueRequirements: string[];
  pastDueRequirements: string[];
}

export function buildExpressAccountCreateParams(
  displayName: string,
  contactEmail: string
): AccountCreateSpec {
  if (!displayName || typeof displayName !== 'string') {
    throw new Error('displayName is required');
  }
  if (!contactEmail || typeof contactEmail !== 'string') {
    throw new Error('contactEmail is required');
  }

  return {
    type: 'express',
    country: 'US',
    email: contactEmail,
    business_profile: { name: displayName },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  };
}

export function buildAccountOnboardingLinkParams(
  accountId: string,
  baseUrl: string
): AccountLinkSpec {
  if (!accountId || typeof accountId !== 'string') {
    throw new Error('accountId is required');
  }
  if (!baseUrl || typeof baseUrl !== 'string') {
    throw new Error('baseUrl is required');
  }

  const origin = baseUrl.replace(/\/$/, '');
  const accountQuery = encodeURIComponent(accountId);

  // Return to the existing index page. /dashboard and /onboarding are not served.
  return {
    account: accountId,
    type: 'account_onboarding',
    refresh_url: `${origin}/?accountId=${accountQuery}`,
    return_url: `${origin}/?accountId=${accountQuery}`,
  };
}

export function mapAccountStatus(
  account: AccountStatusInput
): AccountStatusResponse {
  const currentlyDue = account.requirements?.currently_due ?? [];
  const pastDue = account.requirements?.past_due ?? [];

  return {
    success: true,
    accountId: account.id,
    onboardingComplete:
      Boolean(account.details_submitted) &&
      currentlyDue.length === 0 &&
      pastDue.length === 0,
    readyToProcessPayments: account.capabilities?.card_payments === 'active',
    currentlyDueRequirements: currentlyDue,
    pastDueRequirements: pastDue,
  };
}
