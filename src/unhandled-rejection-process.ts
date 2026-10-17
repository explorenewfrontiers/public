/**
 * Node 15+ converts an unhandled promise rejection into an uncaught
 * exception and exits. None of MCP, the catalog website, or Connect
 * register `process.on('unhandledRejection')` or `uncaughtException`.
 * Express 4 also does not catch rejected async route handlers.
 *
 * Connect's thin webhook retrieves the full V2 event *outside* the
 * `constructEvent`/`parseThinEvent` try/catch (#15). A Stripe retrieve
 * failure there rejects the async handler, becomes an unhandledRejection,
 * and takes down Checkout + `/webhook` with the process.
 *
 * Open coverage PRs lock that retrieve-outside-try (#15) and missing
 * Stripe client timeouts (#48). They do not lock the process-level
 * rejection handlers that would keep the payment server alive.
 */

export const NODE_UNHANDLED_REJECTION_THROWS_MAJOR = 15;

export function sourceRegistersUnhandledRejectionHandler(source: string): boolean {
  return /process\.on\(\s*['"`]unhandledRejection['"`]/.test(source);
}

export function sourceRegistersUncaughtExceptionHandler(source: string): boolean {
  return /process\.on\(\s*['"`]uncaughtException['"`]/.test(source);
}

export function sourceRegistersRejectionHandledHandler(source: string): boolean {
  return /process\.on\(\s*['"`]rejectionHandled['"`]/.test(source);
}

export function unhandledRejectionCrashesProcess(args: {
  hasUnhandledRejectionHandler: boolean;
  nodeMajor: number;
}): boolean {
  if (args.hasUnhandledRejectionHandler) {
    return false;
  }
  return args.nodeMajor >= NODE_UNHANDLED_REJECTION_THROWS_MAJOR;
}

export function asyncRouteRejectionIsUnhandledByExpress4(args: {
  expressCatchesAsync: boolean;
  hasUnhandledRejectionHandler: boolean;
}): boolean {
  return !args.expressCatchesAsync && !args.hasUnhandledRejectionHandler;
}

export function thinWebhookRetrieveIsOutsideVerifyTry(source: string): boolean {
  const thin = source.match(
    /app\.post\(\s*['"]\/webhook\/thin['"][\s\S]*?res\.json\(\s*\{\s*received:\s*true/
  );
  if (!thin) {
    return false;
  }
  const handler = thin[0];
  const retrieveIdx = handler.search(/v2\.core\.events\.retrieve/);
  const tryIdx = handler.search(/try\s*\{/);
  const catchIdx = handler.search(/catch\s*\(/);
  if (retrieveIdx < 0 || tryIdx < 0 || catchIdx < 0) {
    return retrieveIdx >= 0;
  }
  return retrieveIdx > catchIdx;
}
