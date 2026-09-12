/**
 * Pure helpers for the Stripe Connect sample.
 * Kept separate from server.ts so they can be unit-tested without a Stripe key.
 */

export interface ConnectedProductPrice {
  id: string;
  unit_amount?: number | null;
  currency?: string;
}

export interface ConnectedProductInput {
  id: string;
  name: string;
  description?: string | null;
  default_price?: string | ConnectedProductPrice | null;
}

export interface ConnectedProductResponse {
  id: string;
  name: string;
  description: string | null | undefined;
  price: number;
  currency: string;
  priceId: string;
  default_price: string;
}

const APPLICATION_FEE_RATE = 0.1;

/**
 * Platform application fee in cents: 10% of (unit amount × quantity).
 * Quantity defaults to 1 when omitted, zero, or not finite.
 */
export function computeApplicationFeeCents(
  unitAmountCents: number,
  quantity?: number
): number {
  if (!Number.isFinite(unitAmountCents) || unitAmountCents < 0) {
    throw new Error('Price unit_amount must be a non-negative number');
  }

  const qty =
    quantity !== undefined && Number.isFinite(quantity) && quantity > 0
      ? quantity
      : 1;

  return Math.round(unitAmountCents * qty * APPLICATION_FEE_RATE);
}

/**
 * Map a Stripe product (optionally with expanded default_price) to the
 * storefront payload. Always includes priceId so checkout can create a session.
 */
export function mapConnectedProduct(
  product: ConnectedProductInput
): ConnectedProductResponse {
  const defaultPrice = product.default_price;

  if (typeof defaultPrice === 'string' && defaultPrice.length > 0) {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: 0,
      currency: 'usd',
      priceId: defaultPrice,
      default_price: defaultPrice,
    };
  }

  if (defaultPrice && typeof defaultPrice === 'object' && defaultPrice.id) {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: defaultPrice.unit_amount ?? 0,
      currency: defaultPrice.currency || 'usd',
      priceId: defaultPrice.id,
      default_price: defaultPrice.id,
    };
  }

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: 0,
    currency: 'usd',
    priceId: '',
    default_price: '',
  };
}

/**
 * Webhook routes must skip JSON body parsing so Stripe signature verification
 * can use the raw request bytes.
 */
export function isWebhookPath(urlPath: string): boolean {
  const pathOnly = urlPath.split('?')[0];
  return pathOnly === '/webhook' || pathOnly === '/webhook/thin';
}
