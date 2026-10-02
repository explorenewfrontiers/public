/**
 * Mirrors src/index.ts `initialize` handling. The handler ignores
 * `request.params` (including the client's protocolVersion) and always
 * returns a fixed handshake.
 *
 * Open PR #17 locks method *names* (`tools/list` vs `list_tools`).
 * Open PR #31 locks `notifications/initialized` / `ping`.
 * This locks the initialize *payload* contract.
 */

export const MCP_PROTOCOL_VERSION = '2024-11-05';

export type InitializeParams = {
  protocolVersion?: string;
  capabilities?: Record<string, unknown>;
  clientInfo?: { name?: string; version?: string };
};

export type InitializeResult = {
  protocolVersion: string;
  capabilities: { tools: Record<string, never> };
  serverInfo: { name: string; version: string };
};

export function initializeResult(_params: InitializeParams | undefined): InitializeResult {
  return {
    protocolVersion: MCP_PROTOCOL_VERSION,
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: 'stripe-mcp',
      version: '1.0.0',
    },
  };
}

export function negotiatedProtocolVersion(
  clientParams: InitializeParams | undefined
): string {
  void clientParams;
  return MCP_PROTOCOL_VERSION;
}
