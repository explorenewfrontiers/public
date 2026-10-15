/**
 * Connect POST /api/accounts calls v2.core.accounts.create with no
 * idempotencyKey. The dashboard createAccountForm submit handler never
 * sets the button disabled, so a double click (or retried fetch) opens
 * two connected accounts and starts two KYC emails.
 *
 * Open coverage PR #25 locks missing idempotency on MCP money creates
 * and the storefront Buy Now button. It does not lock account-create
 * retries, which have a larger blast radius than a duplicate PaymentIntent.
 */

export function stripeCreateSetsIdempotencyKey(handlerSource: string): boolean {
  return /idempotencyKey/.test(handlerSource);
}

export function handlerDisablesSubmit(handlerSource: string): boolean {
  return /\.disabled\s*=\s*true/.test(handlerSource);
}

export function extractRouteHandler(source: string, route: string): string {
  const start = source.indexOf(route);
  if (start < 0) {
    return '';
  }
  const fromRoute = source.slice(start);
  const nextAppCall = fromRoute.search(/\napp\.(get|post|use|listen)\(/);
  if (nextAppCall < 0) {
    return fromRoute;
  }
  return fromRoute.slice(0, nextAppCall);
}

export function extractDashboardFormHandler(html: string, formId: string): string {
  const marker = `getElementById('${formId}')`;
  const start = html.indexOf(marker);
  if (start < 0) {
    return '';
  }
  const fromMarker = html.slice(start);
  const nextSection = fromMarker.search(/\n\s*\/\/ SECTION \d+/);
  if (nextSection < 0) {
    return fromMarker.slice(0, 2500);
  }
  return fromMarker.slice(0, nextSection);
}

export function duplicateAccountCreatesWouldDiverge(args: {
  hasIdempotencyKey: boolean;
  submitDisabled: boolean;
}): boolean {
  return !args.hasIdempotencyKey && !args.submitDisabled;
}
