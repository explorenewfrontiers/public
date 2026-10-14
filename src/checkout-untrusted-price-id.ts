/**
 * Catalog POST /api/checkout and Connect POST /api/checkout plus
 * POST /api/subscriptions take client-supplied price IDs and pass them
 * to Checkout with no prices.retrieve, catalog membership check, or
 * amount verification.
 *
 * Open coverage PRs lock quantity coercion (#25), missing session.url
 * (#31), Checkout mode vs recurring prices (#37), and unauthenticated
 * Connect POSTs (#31). They do not lock that an attacker can substitute
 * any Price on the Stripe account (for example a $0.50 price in place
 * of the $50 product shown in the storefront).
 */

export interface CheckoutLineItemInput {
  priceId: string;
  quantity: number;
}

export function catalogCheckoutLineItems(
  items: CheckoutLineItemInput[]
): Array<{ price: string; quantity: number }> {
  return items.map((item) => ({
    price: item.priceId,
    quantity: item.quantity,
  }));
}

export function connectCheckoutLineItem(args: {
  priceId: string;
  quantity?: number;
}): { price: string; quantity: number } {
  return {
    price: args.priceId,
    quantity: args.quantity || 1,
  };
}

export function connectSubscriptionLineItem(priceId: string): {
  price: string;
  quantity: number;
} {
  return { price: priceId, quantity: 1 };
}

export function checkoutHandlerLooksUpPrice(handlerSource: string): boolean {
  return (
    /prices\.retrieve/.test(handlerSource) ||
    /getProductWithPrices/.test(handlerSource) ||
    /products\.retrieve/.test(handlerSource)
  );
}

export function extractRouteHandler(source: string, route: string): string {
  const start = source.indexOf(route);
  if (start < 0) {
    return '';
  }
  const fromRoute = source.slice(start);
  const nextAppCall = fromRoute.search(/\napp\.(get|post|use|listen)\(/);
  if (nextAppCall < 0) {
    return fromRoute;
  }
  return fromRoute.slice(0, nextAppCall);
}

export function attackerCanSubstituteListedPrice(args: {
  listedPriceId: string;
  requestedPriceId: string;
}): boolean {
  const [line] = catalogCheckoutLineItems([
    { priceId: args.requestedPriceId, quantity: 1 },
  ]);
  if (!line) {
    return false;
  }
  return (
    line.price === args.requestedPriceId &&
    args.requestedPriceId !== args.listedPriceId
  );
}
