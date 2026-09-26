/**
 * Mirrors stripe-connect-sample/server.ts required-field checks.
 * Production uses truthiness (`if (!displayName || !contactEmail)`,
 * `if (!accountId || !priceId)`, `if (!accountId || !name || !priceInCents)`).
 *
 * Open PRs lock missing/undefined/empty-string email and negative
 * priceInCents. They do not lock whitespace-only strings, which are truthy
 * and are forwarded to Stripe as the business name, contact email, account
 * id, product name, or price id.
 */

export function requiredFieldPresent(value: unknown): boolean {
  return Boolean(value);
}

export function whitespaceOnlyPassesRequiredCheck(value: string): boolean {
  return requiredFieldPresent(value) && value.trim() === '';
}

export function connectRequiredFieldsFrom(body: {
  displayName?: unknown;
  contactEmail?: unknown;
  accountId?: unknown;
  name?: unknown;
  priceInCents?: unknown;
  priceId?: unknown;
}): {
  accountCreateOk: boolean;
  productCreateOk: boolean;
  checkoutOk: boolean;
} {
  return {
    accountCreateOk: Boolean(body.displayName) && Boolean(body.contactEmail),
    productCreateOk:
      Boolean(body.accountId) && Boolean(body.name) && Boolean(body.priceInCents),
    checkoutOk: Boolean(body.accountId) && Boolean(body.priceId),
  };
}
