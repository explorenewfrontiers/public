/**
 * Mirrors src/index.ts JSON-RPC dispatch for the MCP HTTP handshake.
 *
 * Open PR #17 locks tools/list and tools/call as Method not found. Spec
 * clients also send notifications/initialized after initialize, and ping
 * as a liveness check. Those methods are likewise unhandled.
 *
 * JSON-RPC 2.0 notifications omit id (or use null) and must not receive a
 * response. The HTTP handler always JSON.stringifies handleRequest's
 * return value, so a handshake notification still gets Method not found.
 */

export const MCP_DISPATCHED_METHODS = ['initialize', 'list_tools', 'call_tool'] as const;

export const MCP_HANDSHAKE_METHODS = [
  'notifications/initialized',
  'notifications/cancelled',
  'ping',
] as const;

export function mcpDispatchesMethod(method: string): boolean {
  return (MCP_DISPATCHED_METHODS as readonly string[]).includes(method);
}

export function mcpHandshakeError(): { code: number; message: string } {
  return { code: -32601, message: 'Method not found' };
}

export function jsonRpcNotificationGetsHttpBody(
  id: string | number | null | undefined
): boolean {
  void id;
  return true;
}
