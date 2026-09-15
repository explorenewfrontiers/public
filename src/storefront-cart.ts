export interface CartItem {
  productId: string;
  priceId: string;
  name: string;
  amount: number;
  quantity: number;
}

export interface CatalogProduct {
  id: string;
  name: string;
  description?: string;
}

export function addToCart(
  cart: CartItem[],
  productId: string,
  priceId: string,
  productName: string,
  unitAmount: number
): CartItem[] {
  const existingItem = cart.find((item) => item.priceId === priceId);

  if (existingItem) {
    existingItem.quantity += 1;
    return cart;
  }

  cart.push({
    productId,
    priceId,
    name: productName,
    amount: unitAmount,
    quantity: 1,
  });
  return cart;
}

export function removeFromCart(cart: CartItem[], priceId: string): CartItem[] {
  return cart.filter((item) => item.priceId !== priceId);
}

export function cartTotalDollars(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + (item.amount * item.quantity) / 100, 0);
}

export function toCheckoutItems(cart: CartItem[]): Array<{ priceId: string; quantity: number }> {
  return cart.map((item) => ({
    priceId: item.priceId,
    quantity: item.quantity,
  }));
}

export function filterProducts(products: CatalogProduct[], query: string): CatalogProduct[] {
  const normalized = query.toLowerCase();
  return products.filter(
    (product) =>
      product.name.toLowerCase().includes(normalized) ||
      product.description?.toLowerCase().includes(normalized)
  );
}

export function formatUnitAmount(unitAmount: number | undefined): string {
  if (unitAmount === undefined) {
    return 'N/A';
  }
  return (unitAmount / 100).toFixed(2);
}
