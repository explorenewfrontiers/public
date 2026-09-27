/**
 * Mirrors MCP HTTP / JSON-RPC payload handling that prior coverage PRs
 * do not lock down.
 *
 * - call_tool uses `params.arguments || {}`. A non-object truthy value
 *   (string, array, number) is forwarded into Stripe tool handlers.
 * - Optional list filters (`starting_after`, `customer`) are cast and
 *   always present on the Stripe params object, including `undefined`.
 * - create_payment_intent forwards `currency` without lowercasing.
 * - Stripe-Account is read as `req.headers['stripe-account'] as string`.
 *   Duplicate headers arrive as `string[]` and are passed through.
 * - The HTTP body is concatenated with no size cap (`body += chunk`).
 * - 401 / parse-error JSON-RPC bodies omit `id`.
 */

export function resolveToolArguments(argumentsField: unknown): unknown {
  return argumentsField || {};
}

export function listCustomersStripeParams(input: Record<string, unknown>): {
  limit: number;
  starting_after: string;
} {
  return {
    limit: (input.limit as number) || 10,
    starting_after: input.starting_after as string,
  };
}

export function paymentIntentStripeParams(input: Record<string, unknown>): {
  amount: number;
  currency: string;
  customer: string;
  description: string;
} {
  return {
    amount: input.amount as number,
    currency: input.currency as string,
    customer: input.customer as string,
    description: input.description as string,
  };
}

export function stripeAccountFromHeader(
  header: string | string[] | undefined
): string | string[] | undefined {
  return header;
}

export function unauthorizedRpcBody(): {
  jsonrpc: '2.0';
  error: { code: number; message: string };
  id?: string | number | null;
} {
  return {
    jsonrpc: '2.0',
    error: {
      code: -32600,
      message: 'Unauthorized: Missing or invalid Bearer token',
    },
  };
}

export function parseErrorRpcBody(): {
  jsonrpc: '2.0';
  error: { code: number; message: string };
  id?: string | number | null;
} {
  return {
    jsonrpc: '2.0',
    error: {
      code: -32700,
      message: 'Parse error',
    },
  };
}

export function mcpHttpCapsRequestBody(): boolean {
  return false;
}

export function jsonRpcMethodOfBody(parsed: unknown): unknown {
  return (parsed as { method?: unknown })?.method;
}
