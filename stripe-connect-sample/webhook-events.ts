export interface SubscriptionWebhookEvent {
  type: string;
  data: {
    object: {
      id?: string;
      cancel_at_period_end?: boolean;
      items?: { data?: Array<{ price?: { id?: string } | string }> };
    };
    previous_attributes?: {
      items?: { data?: Array<{ price?: unknown }> };
      cancel_at_period_end?: boolean;
    };
  };
}

export function getSubscriptionNewPriceId(
  subscription: SubscriptionWebhookEvent['data']['object']
): string | undefined {
  const price = subscription.items?.data?.[0]?.price;
  if (price && typeof price === 'object') {
    return price.id;
  }
  return typeof price === 'string' ? price : undefined;
}

export function didSubscriptionPriceChange(
  event: Pick<SubscriptionWebhookEvent, 'data'>
): boolean {
  if (!event.data.previous_attributes?.items?.data) {
    return false;
  }

  const oldPrice = event.data.previous_attributes.items.data[0]?.price;
  const newPrice = getSubscriptionNewPriceId(event.data.object);
  return oldPrice !== newPrice;
}

export function isSubscriptionScheduledForCancellation(
  event: Pick<SubscriptionWebhookEvent, 'data'>
): boolean {
  return (
    event.data.previous_attributes?.cancel_at_period_end === false &&
    event.data.object.cancel_at_period_end === true
  );
}

export type ConnectWebhookKind =
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_succeeded'
  | 'unhandled';

export function classifyConnectWebhookType(eventType: string): ConnectWebhookKind {
  switch (eventType) {
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'invoice.payment_succeeded':
      return eventType;
    default:
      return 'unhandled';
  }
}

export type ThinWebhookKind =
  | 'v2.core.account[requirements].updated'
  | 'v2.core.account[configuration.merchant].capability_status_updated'
  | 'unhandled';

export function classifyThinWebhookType(eventType: string): ThinWebhookKind {
  switch (eventType) {
    case 'v2.core.account[requirements].updated':
    case 'v2.core.account[configuration.merchant].capability_status_updated':
      return eventType;
    default:
      return 'unhandled';
  }
}
