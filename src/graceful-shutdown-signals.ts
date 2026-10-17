/**
 * MCP (`http.createServer` + `server.listen`), the catalog website
 * (`app.listen`), and Connect (`app.listen`) never register SIGTERM/SIGINT
 * handlers and never call `server.close()`. Heroku, Railway, and Docker
 * send SIGTERM then SIGKILL. In-flight Checkout POSTs and `/webhook`
 * handlers are dropped; Stripe retries the webhook while the client retries
 * checkout, which can create duplicate sessions.
 *
 * Open coverage PRs lock listen bind addresses (#42), Heroku/Docker boot
 * (#43, #58), and webhook replay without event.id (#39). They do not lock
 * that none of the HTTP servers drain connections on process signals.
 */

export const PLATFORM_SHUTDOWN_SIGNALS = ['SIGTERM', 'SIGINT'] as const;

export type ProcessSignal = (typeof PLATFORM_SHUTDOWN_SIGNALS)[number];

export function sourceRegistersSignalHandler(
  source: string,
  signal: ProcessSignal
): boolean {
  const re = new RegExp(`process\\.on\\(\\s*['"\`]${signal}['"\`]`);
  return re.test(source);
}

export function sourceRegistersAnyShutdownSignal(source: string): boolean {
  return PLATFORM_SHUTDOWN_SIGNALS.some((signal) =>
    sourceRegistersSignalHandler(source, signal)
  );
}

export function sourceClosesHttpServer(source: string): boolean {
  return /(?:server|httpServer|listener)\.close\s*\(/.test(source);
}

export function sourceImportsHttpTerminator(source: string): boolean {
  return /http-terminator|stoppable|terminus/.test(source);
}

export function inFlightRequestsWouldDropOnSigterm(args: {
  handlesShutdownSignal: boolean;
  closesServer: boolean;
}): boolean {
  return !args.handlesShutdownSignal || !args.closesServer;
}

export function extractListenAndBoot(source: string): string {
  const listenIdx = source.search(/(?:server|app)\.listen\s*\(/);
  if (listenIdx < 0) {
    return '';
  }
  return source.slice(Math.max(0, listenIdx - 200), listenIdx + 400);
}
