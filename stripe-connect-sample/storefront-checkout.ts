export interface ConnectedProductInput {
  id: string;
  name: string;
  description?: string | null;
  default_price?: unknown;
}

export function mapConnectedAccountProduct(product: ConnectedProductInput): {
  id: string;
  name: string;
  description: string | null | undefined;
  price: number;
  currency: string;
} {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: (product.default_price as { unit_amount?: number } | undefined)?.unit_amount || 0,
    currency: (product.default_price as { currency?: string } | undefined)?.currency || 'usd',
  };
}

export function buildStorefrontCheckoutBody(
  accountId: string,
  product: Record<string, unknown>
): { accountId: string; priceId: unknown; quantity: number } {
  return {
    accountId,
    priceId: product.default_price,
    quantity: 1,
  };
}

export function dollarsToPriceInCents(price: string): number {
  return Math.round(parseFloat(price) * 100);
}

export function buildSubscriptionSessionLookup(sessionId: string): {
  endpoint: string;
  body: { sessionId: string };
} {
  return {
    endpoint: '/get-session',
    body: { sessionId },
  };
}
