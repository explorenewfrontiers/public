export function isPresent(value: unknown): boolean {
  return Boolean(value);
}

export function validateAccountCreate(input: {
  displayName?: string;
  contactEmail?: string;
}): string | null {
  if (!input.displayName || !input.contactEmail) {
    return 'displayName and contactEmail are required';
  }
  return null;
}

export function validateProductCreate(input: {
  accountId?: string;
  name?: string;
  priceInCents?: unknown;
}): string | null {
  if (!input.accountId || !input.name || !input.priceInCents) {
    return 'accountId, name, and priceInCents are required';
  }
  return null;
}

export function parseConnectedProductPriceInCents(priceInCents: unknown): number {
  return parseInt(priceInCents as string);
}

export function productCreateCurrency(currency?: string): string {
  return currency || 'usd';
}

export function productCreateDescription(description?: string): string {
  return description || '';
}
