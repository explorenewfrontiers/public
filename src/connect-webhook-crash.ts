/**
 * Mirrors stripe-connect-sample/server.ts customer.subscription.updated
 * price-change detection that previous coverage PRs do not lock down.
 *
 * Open PR #10 extracts a safe getSubscriptionNewPriceId helper on that
 * branch. Production still reads `subscription.items.data[0]?.price.id`
 * with optional chaining only on `[0]`. A payload that includes
 * previous_attributes.items.data (the only gate) but omits items/price
 * throws before res.json({ received: true }), so Stripe retries forever
 * and access updates never ack.
 */

export interface SparseSubscription {
  items?: { data?: Array<{ price?: { id?: string } | string }> };
}

export function readUpdatedSubscriptionNewPriceId(
  subscription: SparseSubscription
): string | undefined {
  // Production: subscription.items.data[0]?.price.id
  return (
    subscription as { items: { data: Array<{ price: { id: string } }> } }
  ).items.data[0]?.price.id;
}

export function subscriptionUpdatedHandlerThrows(
  subscription: SparseSubscription,
  previousAttributes?: { items?: { data?: unknown } }
): boolean {
  if (!previousAttributes?.items?.data) {
    return false;
  }

  try {
    readUpdatedSubscriptionNewPriceId(subscription);
    return false;
  } catch {
    return true;
  }
}

export function webhookAcknowledgesAfterHandlerThrow(): boolean {
  return false;
}
