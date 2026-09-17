/**
 * Mirrors stripe-connect-sample/server.ts product mapping and checkout
 * quantity/fee coercion so those rules can be tested without booting the
 * sample (it throws at import if STRIPE_SECRET_KEY is missing).
 */

export type ConnectedDefaultPrice =
  | string
  | {
      id?: string;
      unit_amount?: number | null;
      currency?: string | null;
    }
  | null
  | undefined;

export function mapConnectedProductMoney(defaultPrice: ConnectedDefaultPrice): {
  price: number;
  currency: string;
} {
  return {
    price: (defaultPrice as { unit_amount?: number } | undefined)?.unit_amount || 0,
    currency: (defaultPrice as { currency?: string } | undefined)?.currency || 'usd',
  };
}

export function resolveCheckoutQuantity(quantity: unknown): unknown {
  return quantity || 1;
}

export function computeApplicationFeeAmount(quantity: unknown): number {
  return Math.round(((quantity as number) || 1) * 0.1);
}
