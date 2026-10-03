/**
 * Mirrors catalog and Connect Checkout session bodies.
 *
 * Open PRs #10/#14/#31 lock sessionId-only responses and missing success
 * pages. They do not lock the missing fulfillment identity: neither
 * Checkout create sets metadata or client_reference_id, so a later
 * checkout.session.completed handler cannot map the payment to an order.
 */

export type CatalogCheckoutBody = {
  payment_method_types: string[];
  line_items: Array<{ price: string; quantity: number }>;
  mode: string;
  success_url: string;
  cancel_url: string;
  metadata?: Record<string, string>;
  client_reference_id?: string;
};

export type ConnectCheckoutBody = {
  line_items: Array<{ price: string; quantity: number }>;
  mode: string;
  payment_intent_data: { application_fee_amount: number };
  success_url: string;
  cancel_url: string;
  metadata?: Record<string, string>;
  client_reference_id?: string;
};

export function catalogCheckoutSession(input: {
  items: Array<{ priceId: string; quantity: number }>;
  domain: string;
}): CatalogCheckoutBody {
  return {
    payment_method_types: ['card'],
    line_items: input.items.map((item) => ({
      price: item.priceId,
      quantity: item.quantity,
    })),
    mode: 'payment',
    success_url: `${input.domain}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.domain}/cancel`,
  };
}

export function connectCheckoutSession(input: {
  accountId: string;
  priceId: string;
  quantity: number;
  domain: string;
}): ConnectCheckoutBody {
  const quantity = input.quantity || 1;
  return {
    line_items: [
      {
        price: input.priceId,
        quantity,
      },
    ],
    mode: 'payment',
    payment_intent_data: {
      application_fee_amount: Math.round(quantity * 0.1),
    },
    success_url: `${input.domain}/success?session_id={CHECKOUT_SESSION_ID}&accountId=${input.accountId}`,
    cancel_url: `${input.domain}/storefront?accountId=${input.accountId}`,
  };
}

export function hasFulfillmentIdentity(session: {
  metadata?: Record<string, string>;
  client_reference_id?: string;
}): boolean {
  const metadataKeys = session.metadata ? Object.keys(session.metadata) : [];
  return metadataKeys.length > 0 || Boolean(session.client_reference_id);
}
