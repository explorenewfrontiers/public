import Stripe from 'stripe';

/**
 * stripe@15 types and request shapes are generated for this version.
 * Do not pin a newer date-only string such as "2024-11-20": that identifier
 * was never published. The matching Acacia snapshot is "2024-11-20.acacia"
 * and requires stripe-node v17.
 */
export const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2024-04-10';

export function stripeClientOptions(
  stripeAccount?: string
): Stripe.StripeConfig {
  const options: Stripe.StripeConfig = {
    apiVersion: STRIPE_API_VERSION,
  };

  if (stripeAccount) {
    options.stripeAccount = stripeAccount;
  }

  return options;
}
