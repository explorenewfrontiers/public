/**
 * Connect registers bodyParser.urlencoded({ extended: true }) (qs nested
 * objects/arrays) and bodyParser.json() with no type checks. Required-field
 * guards are truthy-only (`if (!displayName || !contactEmail)`), so a nested
 * form key such as displayName[legal]=Acme or a JSON object/array still
 * reaches v2.core.accounts.create and stripeAccount.
 *
 * Open coverage PRs lock whitespace-only required strings (#27) and
 * unauthenticated POSTs / CSRF (#31). They do not lock bracket-notation
 * nested objects from extended urlencoded (or JSON objects) bypassing
 * those guards.
 */

export function requiredAccountFieldsPresent(args: {
  displayName?: unknown;
  contactEmail?: unknown;
}): boolean {
  const { displayName, contactEmail } = args;
  if (!displayName || !contactEmail) {
    return false;
  }
  return true;
}

export function requiredCheckoutFieldsPresent(args: {
  accountId?: unknown;
  priceId?: unknown;
}): boolean {
  const { accountId, priceId } = args;
  if (!accountId || !priceId) {
    return false;
  }
  return true;
}

export function accountCreateStripePayload(args: {
  displayName: unknown;
  contactEmail: unknown;
}): { display_name: unknown; contact_email: unknown } {
  return {
    display_name: args.displayName,
    contact_email: args.contactEmail,
  };
}

export function stripeAccountRequestOption(accountId: unknown): {
  stripeAccount: unknown;
} {
  return { stripeAccount: accountId };
}

export function sourceUsesExtendedUrlencoded(source: string): boolean {
  return /urlencoded\(\s*\{\s*extended:\s*true\s*\}\s*\)/.test(source);
}

export function sourceUsesJsonBodyParser(source: string): boolean {
  return /bodyParser\.json\(\)/.test(source) || /express\.json\(\)/.test(source);
}

export function handlerRequiresStringFields(handlerSource: string): boolean {
  return /typeof\s+\w+\s*===\s*['"]string['"]/.test(handlerSource);
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
