/**
 * Stripe unit_amount conversion.
 * Most currencies use 2 decimal places (cents). Zero-decimal currencies
 * (JPY, KRW, …) use the major unit. Three-decimal currencies use 0.001
 * with Stripe requiring the last digit to be 0.
 * @see https://docs.stripe.com/currencies
 */

const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif',
  'clp',
  'djf',
  'gnf',
  'jpy',
  'kmf',
  'krw',
  'mga',
  'pyg',
  'rwf',
  'ugx',
  'vnd',
  'vuv',
  'xaf',
  'xof',
  'xpf',
]);

const THREE_DECIMAL_CURRENCIES = new Set(['bhd', 'jod', 'kwd', 'omr', 'tnd']);

function normalizeCurrency(currency: string | undefined): string {
  if (typeof currency !== 'string' || currency.trim() === '') {
    return 'usd';
  }
  return currency.trim().toLowerCase();
}

/**
 * Convert a catalog/spreadsheet major-unit amount into Stripe unit_amount.
 * USD 10.00 → 1000; JPY 500 → 500; KWD 5.000 → 5000.
 */
export function toStripeUnitAmount(
  amount: number,
  currency?: string
): number {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new Error('Price must be a finite number');
  }
  if (amount < 0) {
    throw new Error('Price must not be negative');
  }

  const code = normalizeCurrency(currency);

  if (ZERO_DECIMAL_CURRENCIES.has(code)) {
    return Math.round(amount);
  }

  if (THREE_DECIMAL_CURRENCIES.has(code)) {
    // Stripe requires three-decimal amounts with a trailing 0 (fil increments of 10).
    return Math.round(amount * 100) * 10;
  }

  return Math.round(amount * 100);
}

/**
 * Convert a Stripe unit_amount back to major units for display.
 */
export function fromStripeUnitAmount(
  unitAmount: number,
  currency?: string
): number {
  if (typeof unitAmount !== 'number' || !Number.isFinite(unitAmount)) {
    throw new Error('unit_amount must be a finite number');
  }

  const code = normalizeCurrency(currency);

  if (ZERO_DECIMAL_CURRENCIES.has(code)) {
    return unitAmount;
  }

  if (THREE_DECIMAL_CURRENCIES.has(code)) {
    return unitAmount / 1000;
  }

  return unitAmount / 100;
}
