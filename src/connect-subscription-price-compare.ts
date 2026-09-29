/**
 * Mirrors stripe-connect-sample/server.ts customer.subscription.updated
 * upgrade/downgrade detection.
 *
 * Open PR #24 locks the throw when items/price are missing. Production
 * still compares:
 *   oldPrice = previous_attributes.items.data[0]?.price   // object or id
 *   newPrice = subscription.items.data[0]?.price.id       // always an id
 *   if (oldPrice !== newPrice) { log modified }
 *
 * When previous_attributes.price is the expanded Price object, object !==
 * string is always true, so quantity-only item updates are treated as
 * plan changes and access grant/revoke logic (still TODO) would fire on
 * every such event.
 */

export function subscriptionPriceChanged(
  previousPrice: unknown,
  currentPriceId: unknown
): boolean {
  return previousPrice !== currentPriceId;
}

export function readPreviousItemPrice(
  previousAttributes: { items?: { data?: Array<{ price?: unknown }> } }
): unknown {
  return previousAttributes.items?.data?.[0]?.price;
}

export function readCurrentItemPriceId(subscription: {
  items?: { data?: Array<{ price?: { id?: string } | string }> };
}): string | undefined {
  const price = subscription.items?.data?.[0]?.price;
  if (price && typeof price === 'object') {
    return price.id;
  }
  return undefined;
}
