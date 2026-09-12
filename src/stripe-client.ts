/**
 * Shared Stripe client options. Connected-account routing is opt-in via
 * stripeAccount (the Stripe-Account header).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createStripeClientOptions(stripeAccount?: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options: any = {
    apiVersion: '2024-11-20',
  };

  if (stripeAccount) {
    options.stripeAccount = stripeAccount;
  }

  return options;
}
