export type ResolvedMethod =
  | { kind: 'initialize' }
  | { kind: 'list_tools' }
  | { kind: 'call_tool'; name: string; args: Record<string, unknown> }
  | { kind: 'notification' }
  | { kind: 'unknown' };

function asRecord(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asToolCallParams(params: unknown): { name: string; args: Record<string, unknown> } {
  const parsed = asRecord(params);
  const name = typeof parsed.name === 'string' ? parsed.name : '';
  return {
    name,
    args: asRecord(parsed.arguments),
  };
}

/**
 * Map an incoming JSON-RPC method to a protocol action.
 *
 * The server historically only accepted `list_tools` / `call_tool`, but:
 * - official MCP clients send `tools/list` and `tools/call`
 * - the README curl example sends the tool name as the JSON-RPC method
 */
export function resolveJsonRpcMethod(
  method: string,
  params: unknown,
  toolNames: ReadonlySet<string>
): ResolvedMethod {
  if (method === 'initialize') {
    return { kind: 'initialize' };
  }
  if (method === 'list_tools' || method === 'tools/list') {
    return { kind: 'list_tools' };
  }
  if (method === 'notifications/initialized' || method === 'initialized') {
    return { kind: 'notification' };
  }
  if (method === 'call_tool' || method === 'tools/call') {
    const parsed = asToolCallParams(params);
    return { kind: 'call_tool', name: parsed.name, args: parsed.args };
  }
  if (toolNames.has(method)) {
    return { kind: 'call_tool', name: method, args: asRecord(params) };
  }
  return { kind: 'unknown' };
}

export function formatToolResult(result: unknown): {
  content: Array<{ type: 'text'; text: string }>;
  type: 'text';
  text: string;
} {
  const text = JSON.stringify(result, null, 2);
  return {
    content: [{ type: 'text', text }],
    type: 'text',
    text,
  };
}
