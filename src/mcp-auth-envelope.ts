/**
 * Mirrors MCP HTTP auth and JSON-RPC envelope handling in src/index.ts.
 *
 * Open PRs #3/#28 lock Bearer-required-when-set and duplicate Stripe-Account
 * arrays. They do not lock: empty MCP_API_KEY still enables auth and matches
 * an empty Bearer token; duplicate Authorization headers are arrays and
 * .split throws (uncaught 500); jsonrpc version and Content-Type are not
 * checked before dispatch.
 */

export function isMcpAuthEnabled(mcpApiKey: string | undefined): boolean {
  return mcpApiKey !== undefined;
}

export function validateMcpAuth(
  authHeader: string | string[] | undefined,
  mcpApiKey: string | undefined
): boolean {
  if (!isMcpAuthEnabled(mcpApiKey)) {
    return true;
  }

  if (!authHeader) {
    return false;
  }

  const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (typeof header !== 'string') {
    return false;
  }

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer') {
    return false;
  }

  return token === mcpApiKey;
}

/** Current production path: cast Authorization as string and split. */
export function validateMcpAuthAsProduction(
  authHeader: string | string[] | undefined,
  mcpApiKey: string | undefined
): boolean {
  if (!isMcpAuthEnabled(mcpApiKey)) {
    return true;
  }

  if (!authHeader) {
    return false;
  }

  const [scheme, token] = (authHeader as string).split(' ');
  if (scheme !== 'Bearer') {
    return false;
  }

  return token === mcpApiKey;
}

export function isJsonRpcV2(request: { jsonrpc?: unknown }): boolean {
  return request.jsonrpc === '2.0';
}

export function isJsonContentType(contentType: string | undefined): boolean {
  if (!contentType) {
    return false;
  }
  return contentType.toLowerCase().includes('application/json');
}
