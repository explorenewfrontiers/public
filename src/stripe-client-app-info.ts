/**
 * Stripe documents `appInfo` on the client so Dashboard and support can
 * attribute API traffic to this integration (name/version/url/partner_id).
 * MCP constructs Stripe with only `apiVersion` / `stripeAccount`. Catalog
 * and Connect call `new Stripe(key)` with no options. None of the three
 * clients set appInfo, so Connect application fees and MCP PaymentIntents
 * show up as anonymous SDK traffic.
 *
 * Open coverage PRs lock the unpublished apiVersion pin (#25/#20) and
 * missing timeout/maxNetworkRetries (#48). They do not lock that appInfo
 * is omitted on every Stripe client.
 */

export interface StripeAppInfo {
  name: string;
  version?: string;
  url?: string;
  partner_id?: string;
}

export interface StripeClientOptions {
  apiVersion?: string;
  stripeAccount?: string;
  appInfo?: StripeAppInfo;
  timeout?: number;
  maxNetworkRetries?: number;
}

export function stripeClientSetsAppInfo(
  options: StripeClientOptions | undefined
): boolean {
  if (options === undefined || options.appInfo === undefined) {
    return false;
  }
  return typeof options.appInfo.name === 'string' && options.appInfo.name.length > 0;
}

export function sourceConstructsStripeWithAppInfo(source: string): boolean {
  return /appInfo\s*:/.test(source);
}

export function stripeConstructorCallCount(source: string): number {
  const matches = source.match(/new Stripe\s*\(/g);
  if (matches === null) {
    return 0;
  }
  return matches.length;
}

export function anonymousSdkTrafficWouldBeUnattributed(args: {
  setsAppInfo: boolean;
  constructsStripe: boolean;
}): boolean {
  return args.constructsStripe && !args.setsAppInfo;
}
