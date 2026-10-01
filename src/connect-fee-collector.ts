/**
 * Mirrors Connect account create fee responsibilities vs Checkout
 * application_fee_amount.
 *
 * Account create sets fees_collector/losses_collector to 'stripe' and
 * dashboard: 'full' (Stripe collects processing fees from the connected
 * account). Checkout still sends payment_intent_data.application_fee_amount
 * computed from quantity, not from the charge. Stripe can reject application
 * fees on that account configuration, or the platform take stays ~0 cents.
 *
 * Open PR #3/#14 lock the quantity * 0.1 fee math. This locks the account
 * responsibility fields that sit next to that fee.
 */

export const ACCOUNT_FEES_COLLECTOR = 'stripe' as const;
export const ACCOUNT_LOSSES_COLLECTOR = 'stripe' as const;
export const ACCOUNT_DASHBOARD = 'full' as const;

export function buildAccountResponsibilities(): {
  fees_collector: typeof ACCOUNT_FEES_COLLECTOR;
  losses_collector: typeof ACCOUNT_LOSSES_COLLECTOR;
} {
  return {
    fees_collector: ACCOUNT_FEES_COLLECTOR,
    losses_collector: ACCOUNT_LOSSES_COLLECTOR,
  };
}

export function checkoutApplicationFeeAmount(quantity: number | undefined): number {
  return Math.round((quantity || 1) * 0.1);
}

export function accountCollectsStripeFeesFromConnectedAccount(
  feesCollector: string
): boolean {
  return feesCollector === 'stripe';
}

export function checkoutSendsApplicationFee(): boolean {
  return true;
}
