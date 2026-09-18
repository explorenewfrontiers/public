/**
 * Mirrors public/app.js and Connect storefront.html product-card HTML.
 * Names, descriptions, and IDs are interpolated without escaping.
 */

export function renderCatalogProductCard(product: {
  id: string;
  name: string;
  description?: string;
}): string {
  return `
    <div class="product-card" onclick="showProductDetails('${product.id}')">
      <div class="product-name">${product.name}</div>
      <div class="product-description">${product.description || 'No description'}</div>
      <button class="add-to-cart-btn" onclick="quickAddToCart(event, '${product.id}')">Add to Cart</button>
    </div>
  `;
}

export function renderConnectProductCard(product: {
  id: string;
  name: string;
  description?: string | null;
  priceId?: string;
}): string {
  return `
    <div class="product-name">${product.name}</div>
    <div class="product-description">${product.description || 'No description'}</div>
    <button class="buy-button" data-product-id="${product.id}" data-price-id="${product.priceId || ''}">
      Buy Now
    </button>
  `;
}

export function catalogSearchMatches(
  products: Array<{ name: string; description?: string }>,
  query: string
): Array<{ name: string; description?: string }> {
  const normalized = query.toLowerCase();
  return products.filter(
    (product) =>
      product.name.toLowerCase().includes(normalized) ||
      product.description?.toLowerCase().includes(normalized)
  );
}
