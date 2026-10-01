/**
 * Mirrors src/index.ts JSON-RPC request handling and call_tool result wrapping.
 *
 * Open PR #17 locks method names (tools/list vs list_tools). This locks the
 * *result envelope* official MCP clients still cannot parse, and that a JSON-RPC
 * batch (array) is treated as a single request with an undefined method.
 */

export function wrapCallToolResult(payload: unknown): {
  type: 'text';
  text: string;
} {
  return {
    type: 'text',
    text: JSON.stringify(payload, null, 2),
  };
}

export function isMcpSpecCallToolResult(result: unknown): boolean {
  if (typeof result !== 'object' || result === null) {
    return false;
  }
  if (!('content' in result)) {
    return false;
  }
  const content = (result as { content: unknown }).content;
  return Array.isArray(content);
}

export function jsonRpcMethodOf(parsed: unknown): unknown {
  if (parsed !== null && typeof parsed === 'object' && 'method' in parsed) {
    return (parsed as { method: unknown }).method;
  }
  return undefined;
}

export function isJsonRpcBatch(parsed: unknown): boolean {
  return Array.isArray(parsed);
}

export function jsonRpcVersionOf(parsed: unknown): unknown {
  if (parsed !== null && typeof parsed === 'object' && 'jsonrpc' in parsed) {
    return (parsed as { jsonrpc: unknown }).jsonrpc;
  }
  return undefined;
}
