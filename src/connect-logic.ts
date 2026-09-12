/**
 * Pure helpers that match the Stripe Connect sample's onboarding and fee
 * rules (stripe-connect-sample/server.ts). Extracted so those rules can be
 * tested without booting the sample server or requiring STRIPE_SECRET_KEY.
 */

export interface AccountStatusInput {
  configuration?: {
    merchant?: {
      capabilities?: {
        card_payments?: {
          status?: string;
        };
      };
    };
  };
  requirements?: {
    summary?: {
      minimum_deadline?: {
        status?: string;
      };
      currently_due?: unknown[];
      past_due?: unknown[];
    };
  };
}

export interface AccountStatus {
  onboardingComplete: boolean;
  readyToProcessPayments: boolean;
  requirementsStatus: string | undefined;
  currentlyDueRequirements: unknown[];
  pastDueRequirements: unknown[];
}

export function computeAccountStatus(account: AccountStatusInput): AccountStatus {
  const readyToProcessPayments =
    account.configuration?.merchant?.capabilities?.card_payments?.status === 'active';

  const requirementsStatus = account.requirements?.summary?.minimum_deadline?.status;

  // Missing/unknown status is treated as complete — same as server.ts.
  const onboardingComplete =
    requirementsStatus !== 'currently_due' && requirementsStatus !== 'past_due';

  return {
    onboardingComplete,
    readyToProcessPayments,
    requirementsStatus,
    currentlyDueRequirements: account.requirements?.summary?.currently_due || [],
    pastDueRequirements: account.requirements?.summary?.past_due || [],
  };
}

/**
 * Sample formula: 10% of quantity (not of the charge), rounded to cents.
 * quantity defaults to 1 when omitted or 0.
 */
export function computeApplicationFeeAmount(quantity?: number): number {
  return Math.round((quantity || 1) * 0.1);
}
