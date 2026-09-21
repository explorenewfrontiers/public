/**
 * Mirrors src/index.ts JSON-RPC call_tool param access and list-tool limits.
 *
 * call_tool does `const params = request.params as { name; arguments }` then
 * reads `params.name`. A missing params object throws and is mapped to
 * JSON-RPC -32603 Internal error (not Invalid params).
 *
 * list_customers / list_charges / list_invoices / list_products use
 * `(input.limit as number) || 10`, so 0, NaN, and other falsy values become 10.
 */

export const MCP_LIST_LIMIT_FALLBACK = 10;

export function resolveMcpListLimit(limit: unknown, fallback = MCP_LIST_LIMIT_FALLBACK): number {
  return (limit as number) || fallback;
}

export function readCallToolName(params: unknown): string {
  const typed = params as { name: string; arguments: Record<string, unknown> };
  return typed.name;
}

export function readCallToolArguments(params: unknown): Record<string, unknown> {
  const typed = params as { name: string; arguments: Record<string, unknown> };
  return typed.arguments || {};
}

export function jsonRpcErrorForCallToolParams(
  params: unknown,
  knownTools: ReadonlySet<string>
): { code: number; message: string } | null {
  try {
    const name = readCallToolName(params);
    if (!name || !knownTools.has(name)) {
      return { code: -32601, message: 'Tool not found' };
    }
    return null;
  } catch (error) {
    return {
      code: -32603,
      message: error instanceof Error ? error.message : 'Internal error',
    };
  }
}

export function buildCreateCustomerParams(input: Record<string, unknown>): {
  email: unknown;
  name: unknown;
  description: unknown;
} {
  return {
    email: input.email as string,
    name: input.name as string,
    description: input.description as string,
  };
}
