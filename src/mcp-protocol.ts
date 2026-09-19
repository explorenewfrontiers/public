/**
 * Mirrors src/index.ts JSON-RPC method dispatch.
 * MCP clients speak tools/list and tools/call; this server only handles
 * list_tools and call_tool. The README curl example uses method list_customers.
 */

export const MCP_HANDLED_METHODS = ['initialize', 'list_tools', 'call_tool'] as const;

export const MCP_SPEC_TOOL_METHODS = ['tools/list', 'tools/call'] as const;

export const README_CURL_RPC_METHOD = 'list_customers';

export function isHandledMcpMethod(method: string): boolean {
  return (MCP_HANDLED_METHODS as readonly string[]).includes(method);
}

export function classifyMcpMethod(
  method: string
): 'handled' | 'spec-only' | 'tool-as-method' | 'unknown' {
  if (isHandledMcpMethod(method)) {
    return 'handled';
  }
  if ((MCP_SPEC_TOOL_METHODS as readonly string[]).includes(method)) {
    return 'spec-only';
  }
  if (method === README_CURL_RPC_METHOD) {
    return 'tool-as-method';
  }
  return 'unknown';
}
