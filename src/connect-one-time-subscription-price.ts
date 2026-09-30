/**
 * Mirrors Connect product create vs subscription checkout.
 *
 * Open PR #17 locks customer_account billing and the missing /get-session
 * route. Open PR #12 locks parseInt(priceInCents). Open PR #27 locks the
 * missing application_fee_percent on subscriptions.
 *
 * Product create still sends default_price_data with only unit_amount and
 * currency — no `recurring`. Every dashboard-created price is one-time.
 * The dashboard then tells operators to paste that "Price ID (from product
 * creation)" into /api/subscriptions, which builds mode: 'subscription'.
 * Stripe rejects one-time prices in subscription mode, so the documented
 * path cannot create a recurring charge. The product-created UI also never
 * shows default_price / a price id, so operators are more likely to paste
 * a prod_ id instead.
 */

export function buildConnectedProductPriceData(
  priceInCents: unknown,
  currency?: string
): { unit_amount: number; currency: string; recurring?: { interval: string } } {
  return {
    unit_amount: parseInt(priceInCents as string),
    currency: currency || 'usd',
  };
}

export function productPriceDataIsRecurring(
  priceData: ReturnType<typeof buildConnectedProductPriceData>
): boolean {
  return priceData.recurring !== undefined;
}

export function buildSubscriptionLineItem(priceId: string): {
  mode: 'subscription';
  line_items: Array<{ price: string; quantity: number }>;
} {
  return {
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
  };
}

export function productCreatedUiShowsPriceId(): boolean {
  return false;
}
