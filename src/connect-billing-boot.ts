/**
 * Mirrors Connect billing-portal session create and module-load boot in
 * stripe-connect-sample/server.ts.
 *
 * Open PRs #17/#31 lock /get-session and unauthenticated POSTs. They do
 * not lock: billingPortal.sessions.create has no `configuration` (Stripe
 * rejects first-time portals), or STRIPE_SECRET_KEY missing throwing
 * before app.listen so Docker HEALTHCHECK never sees a process.
 */

export function connectBillingPortalParams(input: {
  accountId: string;
  domain: string;
}): {
  customer_account: string;
  return_url: string;
  configuration?: string;
} {
  return {
    customer_account: input.accountId,
    return_url: `${input.domain}/dashboard?accountId=${input.accountId}`,
  };
}

export function connectSecretKeyBootError(
  stripeSecretKey: string | undefined
): string | undefined {
  if (!stripeSecretKey) {
    return (
      'STRIPE_SECRET_KEY is not set. Please add it to your .env file. ' +
      'Get your key from https://dashboard.stripe.com/apikeys'
    );
  }
  return undefined;
}
