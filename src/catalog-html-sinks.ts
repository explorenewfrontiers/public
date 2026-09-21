/**
 * Mirrors remaining catalog HTML sinks in public/app.js and checkout
 * line-item mapping in src/web-server.ts.
 *
 * Cart rows interpolate item.name and item.priceId into innerHTML.
 * The product modal interpolates name/description as HTML, then reads
 * price.id in the same template even when the displayed amount was N/A.
 * Checkout forwards quantity with no integer / positivity check.
 */

export interface CatalogCartItem {
  name: string;
  priceId: string;
  quantity: number;
  amount: number;
}

export function renderCatalogCartItem(item: CatalogCartItem): string {
  return `
    <div class="cart-item">
      <div>
        <div class="cart-item-name">${item.name}</div>
        <div style="font-size: 0.9em; color: #999;">Qty: ${item.quantity}</div>
      </div>
      <div>
        <span class="cart-item-price">$${((item.amount * item.quantity) / 100).toFixed(2)}</span>
        <button class="remove-item" onclick="removeFromCart('${item.priceId}')">Remove</button>
      </div>
    </div>
  `;
}

export function renderCatalogModalCopy(
  product: { name: string; description?: string | null },
  productId: string,
  price: { id: string; unit_amount: number | null } | undefined
): string {
  const amount = price ? (price.unit_amount as number / 100).toFixed(2) : 'N/A';

  return `
      <h2>${product.name}</h2>
      <p>${product.description || 'No description available'}</p>
      <div class="modal-price">$${amount}</div>
      <button class="add-to-cart-btn" onclick="addToCart('${productId}', '${price!.id}', '${product.name}', ${price!.unit_amount})">Add to Cart</button>
  `;
}

export function mapCatalogCheckoutLineItems(
  items: Array<{ priceId: string; quantity: number }>
): Array<{ price: string; quantity: number }> {
  return items.map((item) => ({
    price: item.priceId,
    quantity: item.quantity,
  }));
}
