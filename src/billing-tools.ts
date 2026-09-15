import type Stripe from 'stripe';

export const BILLING_TOOLS = [
  'list_customers',
  'get_customer',
  'list_invoices',
  'get_invoice',
  'get_payment_intent',
] as const;

export type BillingToolName = (typeof BILLING_TOOLS)[number];

export function isBillingTool(name: string): name is BillingToolName {
  return (BILLING_TOOLS as readonly string[]).includes(name);
}

export function listCustomersParams(input: Record<string, unknown>): {
  limit: number;
  starting_after: string | undefined;
} {
  return {
    limit: (input.limit as number) || 10,
    starting_after: input.starting_after as string | undefined,
  };
}

export function listInvoicesParams(input: Record<string, unknown>): {
  limit: number;
  customer: string | undefined;
} {
  return {
    limit: (input.limit as number) || 10,
    customer: input.customer as string | undefined,
  };
}

export async function handleBillingToolCall(
  stripe: Stripe,
  toolName: BillingToolName,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case 'list_customers':
      return await stripe.customers.list(listCustomersParams(input));
    case 'get_customer':
      return await stripe.customers.retrieve(input.customer_id as string);
    case 'list_invoices':
      return await stripe.invoices.list(listInvoicesParams(input));
    case 'get_invoice':
      return await stripe.invoices.retrieve(input.invoice_id as string);
    case 'get_payment_intent':
      return await stripe.paymentIntents.retrieve(input.payment_intent_id as string);
  }
}
