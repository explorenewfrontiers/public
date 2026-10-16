/**
 * Catalog and Connect Express apps are documented for Heroku, Railway,
 * Vercel, and Docker behind TLS terminators (DEPLOYMENT.md). None of the
 * servers call `app.set('trust proxy', ...)`, so `req.ip` is the proxy,
 * `req.secure` is false, and `X-Forwarded-For` / `X-Forwarded-Proto` are
 * ignored. Rate limits, HTTPS redirects, and secure cookies keyed off
 * those fields would see the load balancer, not the client.
 *
 * Open coverage PRs lock listen() binding all interfaces (#42) and
 * Host-header rebinding on MCP (#51). They do not lock that Express is
 * deployed behind a reverse proxy with trust proxy unset.
 */

export function expressTrustsProxy(source: string): boolean {
  return (
    /app\.set\(\s*['"]trust proxy['"]/.test(source) ||
    /app\.enable\(\s*['"]trust proxy['"]/.test(source)
  );
}

export function sourceReadsForwardedClientIp(source: string): boolean {
  return (
    /req\.ip\b/.test(source) ||
    /req\.ips\b/.test(source) ||
    /x-forwarded-for/i.test(source) ||
    /x-forwarded-proto/i.test(source)
  );
}

export function reverseProxyWouldHideClient(args: {
  trustsProxy: boolean;
  deployedBehindProxy: boolean;
}): boolean {
  return args.deployedBehindProxy && !args.trustsProxy;
}

export function deploymentDocsRecommendProxyPlatforms(docs: string): boolean {
  const heroku = /heroku/i.test(docs);
  const railway = /railway/i.test(docs);
  const vercel = /vercel/i.test(docs);
  return heroku && railway && vercel;
}
