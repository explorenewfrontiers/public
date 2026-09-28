/**
 * Mirrors src/index.ts tool schemas versus handleToolCall.
 *
 * Open PR #10 locks retrieve tool wiring when IDs are present. Open PR
 * #19 locks create_customer forwarding undefined/empty email. Runtime
 * still never checks inputSchema.required before calling Stripe:
 *
 *   get_customer        → customers.retrieve(undefined)
 *   get_charge          → charges.retrieve(undefined)
 *   get_invoice         → invoices.retrieve(undefined)
 *   get_payment_intent  → paymentIntents.retrieve(undefined)
 *   get_product         → getProductWithPrices(client, undefined)
 *   create_payment_intent → amount/currency forwarded as undefined
 *   sync_catalog        → parseProductCatalog(undefined)
 *
 * JSON-RPC therefore returns Stripe/fs Internal error (-32603) instead
 * of Invalid params (-32602) when required arguments are omitted.
 */

export const MCP_RETRIEVE_ID_FIELDS = {
  get_customer: 'customer_id',
  get_charge: 'charge_id',
  get_invoice: 'invoice_id',
  get_payment_intent: 'payment_intent_id',
  get_product: 'product_id',
} as const;

export const MCP_CREATE_PAYMENT_INTENT_REQUIRED = ['amount', 'currency'] as const;

export const MCP_SYNC_CATALOG_REQUIRED = ['file_path'] as const;

export function retrieveIdFromToolInput(
  toolName: keyof typeof MCP_RETRIEVE_ID_FIELDS,
  input: Record<string, unknown>
): unknown {
  return input[MCP_RETRIEVE_ID_FIELDS[toolName]] as string;
}

export function paymentIntentCreateParams(input: Record<string, unknown>): {
  amount: unknown;
  currency: unknown;
  customer: unknown;
  description: unknown;
} {
  return {
    amount: input.amount as number,
    currency: input.currency as string,
    customer: input.customer as string,
    description: input.description as string,
  };
}

export function syncCatalogFilePath(input: Record<string, unknown>): unknown {
  return input.file_path as string;
}

export function mcpEnforcesRequiredFieldsAtRuntime(): boolean {
  return false;
}
