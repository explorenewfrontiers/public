/**
 * Bearer-token auth for the MCP HTTP server.
 *
 * Auth is optional and env-driven: if MCP_API_KEY is unset, every request is
 * accepted (backwards compatible). An empty-string key still enables auth.
 */

export function isAuthEnabled(apiKey: string | undefined = process.env.MCP_API_KEY): boolean {
  return apiKey !== undefined;
}

export function validateAuth(
  authHeader: string | undefined,
  apiKey: string | undefined = process.env.MCP_API_KEY
): boolean {
  if (!isAuthEnabled(apiKey)) {
    return true;
  }

  if (!authHeader) {
    return false;
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer') {
    return false;
  }

  return token === apiKey;
}
