/**
 * Mirrors catalog website checkout: web-server always creates Checkout in
 * `mode: 'payment'`, and public/app.js always uses `data.prices[0]` (not
 * `product.default_price` and not a recurring-aware pick).
 *
 * Open PR #33 locks Connect *one-time* prices sent to *subscription* mode.
 * This locks the opposite catalog-website contract: a recurring `prices[0]`
 * is still sent to payment-mode Checkout, which Stripe rejects.
 */

export type CatalogPrice = {
  id: string;
  unit_amount: number | null;
  recurring: { interval: string } | null;
};

export type CatalogProduct = {
  id: string;
  default_price?: string | { id: string } | null;
};

export function selectWebsitePrice<T>(prices: T[]): T | undefined {
  return prices[0];
}

export function catalogCheckoutSessionParams(
  items: Array<{ priceId: string; quantity: number }>
): {
  payment_method_types: ['card'];
  line_items: Array<{ price: string; quantity: number }>;
  mode: 'payment';
} {
  return {
    payment_method_types: ['card'],
    line_items: items.map((item) => ({
      price: item.priceId,
      quantity: item.quantity,
    })),
    mode: 'payment',
  };
}

export function isRecurringPrice(price: CatalogPrice): boolean {
  return price.recurring !== null && price.recurring !== undefined;
}

export function stripeAllowsPriceInCheckoutMode(
  mode: 'payment' | 'subscription',
  price: CatalogPrice
): boolean {
  const recurring = isRecurringPrice(price);
  if (mode === 'payment') {
    return !recurring;
  }
  return recurring;
}

export function defaultPriceIdOf(product: CatalogProduct): string | undefined {
  const value = product.default_price;
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (value !== null && typeof value === 'object' && 'id' in value) {
    return value.id;
  }
  return undefined;
}
