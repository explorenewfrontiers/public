/**
 * Mirrors public/app.js catalog search filtering.
 *
 * Search lowercases `p.name` without optional chaining. A product with a
 * missing name throws and aborts rendering for the whole result set.
 * Description is optional-chained.
 */

export function catalogMatchesQuery(
  product: { name?: string | null; description?: string | null },
  query: string
): boolean {
  const needle = query.toLowerCase();
  return (
    (product.name as string).toLowerCase().includes(needle) ||
    Boolean(product.description?.toLowerCase().includes(needle))
  );
}
