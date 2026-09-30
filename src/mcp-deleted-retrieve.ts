/**
 * Mirrors MCP retrieve tools that return Stripe objects without checking
 * the deleted flag.
 *
 * Open PR #10 locks get_customer / get_invoice / get_payment_intent field
 * mapping. Open PR #19 locks missing call_tool params. Those tests treat a
 * successful retrieve as a live object.
 *
 * Stripe retrieve of a deleted customer, charge, payment intent, invoice,
 * or product returns `{ id, object, deleted: true }` (and omits most
 * fields). The handlers return that payload as a JSON-RPC result, so an
 * agent can treat a deleted customer as chargeable or a deleted product
 * as still in the catalog. get_product then reads `.name` / `.images` on
 * the deleted stub and lists prices anyway.
 */

export type StripeRetrieveResult = {
  id: string;
  object: string;
  deleted?: boolean;
  name?: string;
};

export function mcpRetrieveTreatsAsLive(resource: StripeRetrieveResult): boolean {
  return resource.deleted !== true;
}

export function mcpRetrieveChecksDeletedFlag(): boolean {
  return false;
}

export const MCP_RETRIEVE_TOOLS = [
  'get_customer',
  'get_charge',
  'get_payment_intent',
  'get_invoice',
  'get_product',
] as const;

export function mapDeletedProductForTool(product: StripeRetrieveResult): {
  id: string;
  name: string | undefined;
  deleted?: boolean;
} {
  return {
    id: product.id,
    name: product.name,
    deleted: product.deleted,
  };
}
