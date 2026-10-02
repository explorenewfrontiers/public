/**
 * Mirrors syncProductsToStripe: Excel rows are created or updated, but
 * Stripe products that are missing from the spreadsheet are never
 * archived (`active: false`).
 *
 * Open PR #16 / #27 lock duplicate creates and stale unit_amount on ID
 * hit. This locks the missing *deactivate discontinued SKUs* path.
 */

export function stripeIdsMissingFromExcel(
  excelProductIds: Iterable<string>,
  stripeProductIds: Iterable<string>
): string[] {
  const excel = new Set(excelProductIds);
  const missing: string[] = [];
  for (const id of stripeProductIds) {
    if (!excel.has(id)) {
      missing.push(id);
    }
  }
  return missing;
}

export function idsSyncWouldArchive(
  excelProductIds: Iterable<string>,
  stripeProductIds: Iterable<string>
): string[] {
  void excelProductIds;
  void stripeProductIds;
  return [];
}
