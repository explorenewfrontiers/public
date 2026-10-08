/**
 * Mirrors JSON-RPC id handling in src/index.ts handleRequest.
 *
 * JSON-RPC 2.0 requires id to be a String, Number, or Null. Production
 * types the field that way but never checks the parsed value, so an
 * object or array id is echoed in the response. Open PR #28 locks that
 * 401/parse-error bodies omit id; it does not lock that a successful
 * initialize/call_tool forwards a non-scalar id.
 */

export type SpecJsonRpcId = string | number | null;

export function isSpecLegalJsonRpcId(id: unknown): id is SpecJsonRpcId {
  return id === null || typeof id === 'string' || typeof id === 'number';
}

export function echoJsonRpcId(id: unknown): unknown {
  return id;
}

export function productionRejectsNonScalarJsonRpcId(): boolean {
  return false;
}
