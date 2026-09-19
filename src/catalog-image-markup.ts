/**
 * Mirrors public/app.js product-card and modal image tags.
 * Image URLs and alt text are interpolated into attributes with no escaping,
 * so Excel/Stripe-controlled values can break out of src/alt.
 */

export function renderCatalogProductImage(product: {
  name: string;
  images?: string[];
}): string {
  if (product.images && product.images.length > 0) {
    return `<img src="${product.images[0]}" alt="${product.name}" class="product-image">`;
  }
  return `<div class="product-image">📦</div>`;
}

export function renderCatalogModalImage(product: {
  name: string;
  images?: string[];
}): string {
  if (product.images && product.images.length > 0) {
    return `<img src="${product.images[0]}" alt="${product.name}">`;
  }
  return `<div style="background: #f5f5f5; height: 300px; display: flex; align-items: center; justify-content: center; font-size: 3em; border-radius: 5px;">📦</div>`;
}
