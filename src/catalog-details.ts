export interface CatalogPrice {
  id: string;
  unit_amount: number;
}

export function formatCatalogPrice(price: CatalogPrice | undefined): string {
  return price ? (price.unit_amount / 100).toFixed(2) : 'N/A';
}

export function buildAddToCartArgs(
  productId: string,
  productName: string,
  price: CatalogPrice | undefined
): { productId: string; priceId: string; name: string; unitAmount: number } {
  // public/app.js interpolates price.id after only guarding the display amount.
  const unchecked = price as CatalogPrice;
  return {
    productId,
    priceId: unchecked.id,
    name: productName,
    unitAmount: unchecked.unit_amount,
  };
}

export function shouldRedirectToCheckout(data: { sessionId?: string }): boolean {
  return Boolean(data.sessionId);
}
