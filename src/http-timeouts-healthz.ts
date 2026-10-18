/**
 * MCP (`http.createServer`), the catalog website (`app.listen`), and
 * Connect (`app.listen`) never set `requestTimeout`, `headersTimeout`,
 * or `keepAliveTimeout`, and none expose `/health` or `/healthz`.
 * The root MCP Dockerfile also omits `NODE_ENV=production`.
 *
 * Node 18 defaults `requestTimeout` to 300s. Combined with the uncapped
 * MCP body accumulator (#28) a slow client holds a worker for the full
 * window. Express `app.listen` returns a server that is discarded, so
 * catalog and Connect cannot tighten those timeouts later. Without a
 * dedicated health route, orchestrators probe `/` — Connect's GET `/`
 * uses ESM `__dirname` (#14) so the published HEALTHCHECK flaps.
 *
 * Open coverage PRs lock listen bind addresses (#42), SIGTERM drain
 * (#59), Docker HEALTHCHECK `require('http')` under ESM (#46), and
 * root-as-root (#44). They do not lock HTTP timeouts, a /healthz probe,
 * or the MCP image's missing NODE_ENV.
 */

export const NODE18_DEFAULT_REQUEST_TIMEOUT_MS = 300_000;

export type HttpServerTimeoutProperty =
  | 'requestTimeout'
  | 'headersTimeout'
  | 'keepAliveTimeout'
  | 'timeout';

export function sourceSetsServerTimeout(
  source: string,
  property: HttpServerTimeoutProperty
): boolean {
  switch (property) {
    case 'requestTimeout':
      return /\.requestTimeout\s*=/.test(source) || /requestTimeout\s*:/.test(source);
    case 'headersTimeout':
      return /\.headersTimeout\s*=/.test(source) || /headersTimeout\s*:/.test(source);
    case 'keepAliveTimeout':
      return /\.keepAliveTimeout\s*=/.test(source) || /keepAliveTimeout\s*:/.test(source);
    case 'timeout':
      return /(?:server|httpServer|listener)\.timeout\s*=/.test(source);
    default: {
      const _exhaustive: never = property;
      return _exhaustive;
    }
  }
}

export function sourceSetsAnyHttpTimeout(source: string): boolean {
  return (
    sourceSetsServerTimeout(source, 'requestTimeout') ||
    sourceSetsServerTimeout(source, 'headersTimeout') ||
    sourceSetsServerTimeout(source, 'keepAliveTimeout') ||
    sourceSetsServerTimeout(source, 'timeout')
  );
}

export function sourceDefinesHealthEndpoint(source: string): boolean {
  return /['"`]\/health(?:z)?['"`]/.test(source);
}

export function dockerfileSetsNodeEnvProduction(dockerfile: string): boolean {
  return /ENV\s+NODE_ENV\s*=\s*production/.test(dockerfile);
}

export function listenReturnValueIsDiscarded(source: string): boolean {
  if (!/(?:app|server)\.listen\s*\(/.test(source)) {
    return false;
  }
  return !/(?:const|let|var)\s+\w+\s*=\s*(?:app|server)\.listen\s*\(/.test(source);
}

export function slowClientHoldsDefaultRequestWindow(args: {
  hasCustomRequestTimeout: boolean;
}): boolean {
  return !args.hasCustomRequestTimeout;
}

export function orchestratorLacksDedicatedHealthProbe(args: {
  hasHealthRoute: boolean;
}): boolean {
  return !args.hasHealthRoute;
}

export function extractListenAndTimeoutConfig(source: string): string {
  const listenIdx = source.search(/(?:server|app)\.listen\s*\(/);
  if (listenIdx < 0) {
    return '';
  }
  return source.slice(Math.max(0, listenIdx - 200), listenIdx + 400);
}
