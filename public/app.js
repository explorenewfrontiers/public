let products = [];
let cart = [];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const productsContainer = document.getElementById('productsContainer');
const cartItemsContainer = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const searchInput = document.getElementById('searchInput');
const modal = document.getElementById('productModal');
const modalBody = document.getElementById('modalBody');
const closeBtn = document.querySelector('.close');

// Load products on page load
async function loadProducts() {
  try {
    const response = await fetch('/api/products?limit=50');
    const data = await response.json();
    products = data.products || [];
    renderProducts(products);
  } catch (error) {
    console.error('Error loading products:', error);
    productsContainer.innerHTML = '<p class="error">Failed to load products</p>';
  }
}

function renderProducts(productsToShow) {
  if (productsToShow.length === 0) {
    productsContainer.innerHTML = '<p class="empty">No products found</p>';
    return;
  }

  productsContainer.innerHTML = productsToShow
    .map(
      (product) => `
    <div class="product-card" data-product-id="${escapeHtml(product.id)}" onclick="showProductDetails('${escapeHtml(product.id)}')">
      ${
        product.images && product.images.length > 0
          ? `<img src="${escapeHtml(product.images[0])}" alt="${escapeHtml(product.name)}" class="product-image">`
          : `<div class="product-image">📦</div>`
      }
      <div class="product-info">
        <div class="product-name">${escapeHtml(product.name)}</div>
        <div class="product-description">${escapeHtml(product.description || 'No description')}</div>
        <div class="product-price" id="price-${escapeHtml(product.id)}">Loading...</div>
        <button class="add-to-cart-btn" onclick="quickAddToCart(event, '${escapeHtml(product.id)}')">Add to Cart</button>
      </div>
    </div>
  `
    )
    .join('');

  // Load prices for each product
  productsToShow.forEach((product) => {
    loadProductPrice(product.id);
  });
}

async function loadProductPrice(productId) {
  try {
    const response = await fetch(`/api/products/${productId}`);
    const data = await response.json();
    const price = data.prices[0];
    if (price) {
      const amount = (price.unit_amount / 100).toFixed(2);
      document.getElementById(`price-${productId}`).textContent = `$${amount}`;
    }
  } catch (error) {
    console.error('Error loading product price:', error);
  }
}

async function showProductDetails(productId) {
  try {
    const response = await fetch(`/api/products/${productId}`);
    const data = await response.json();
    const product = data.product;
    const price = data.prices[0];

    const amount = price ? (price.unit_amount / 100).toFixed(2) : 'N/A';

    modalBody.innerHTML = `
      ${
        product.images && product.images.length > 0
          ? `<img src="${escapeHtml(product.images[0])}" alt="${escapeHtml(product.name)}">`
          : `<div style="background: #f5f5f5; height: 300px; display: flex; align-items: center; justify-content: center; font-size: 3em; border-radius: 5px;">📦</div>`
      }
      <h2>${escapeHtml(product.name)}</h2>
      <p>${escapeHtml(product.description || 'No description available')}</p>
      <div class="modal-price">$${amount}</div>
      <button class="add-to-cart-btn" ${price ? '' : 'disabled'}>${price ? 'Add to Cart' : 'Unavailable'}</button>
    `;

    const addButton = modalBody.querySelector('.add-to-cart-btn');
    if (price && addButton) {
      addButton.addEventListener('click', () => {
        addToCart(productId, price.id, product.name, price.unit_amount);
      });
    }

    modal.style.display = 'block';
  } catch (error) {
    console.error('Error loading product details:', error);
  }
}

function quickAddToCart(event, productId) {
  event.stopPropagation();
  const card = event.target.closest('.product-card');
  const name = card.querySelector('.product-name').textContent;

  fetch(`/api/products/${productId}`)
    .then((res) => res.json())
    .then((data) => {
      const price = data.prices[0];
      if (price) {
        addToCart(productId, price.id, name, price.unit_amount);
      }
    });
}

function addToCart(productId, priceId, productName, unitAmount) {
  const existingItem = cart.find((item) => item.priceId === priceId);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      productId,
      priceId,
      name: productName,
      amount: unitAmount,
      quantity: 1,
    });
  }

  updateCart();
  modal.style.display = 'none';
  showNotification(`${productName} added to cart!`);
}

function removeFromCart(priceId) {
  cart = cart.filter((item) => item.priceId !== priceId);
  updateCart();
}

function updateCart() {
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p class="empty">Your cart is empty</p>';
    cartTotalEl.textContent = '$0.00';
    checkoutBtn.disabled = true;
    return;
  }

  cartItemsContainer.innerHTML = cart
    .map(
      (item) => `
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
  `
    )
    .join('');

  const total = cart.reduce((sum, item) => sum + (item.amount * item.quantity) / 100, 0);
  cartTotalEl.textContent = `$${total.toFixed(2)}`;
  checkoutBtn.disabled = false;
}

async function checkout() {
  if (cart.length === 0) return;

  checkoutBtn.disabled = true;
  checkoutBtn.textContent = 'Processing...';

  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart.map((item) => ({
          priceId: item.priceId,
          quantity: item.quantity,
        })),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create checkout session');
    }

    if (!data.url) {
      throw new Error('Checkout session did not return a redirect URL');
    }

    window.location.href = data.url;
  } catch (error) {
    console.error('Checkout error:', error);
    alert('Error during checkout');
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = 'Checkout';
  }
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #667eea;
    color: white;
    padding: 15px 20px;
    border-radius: 5px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Search functionality
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query)
  );
  renderProducts(filtered);
});

// Modal controls
closeBtn.addEventListener('click', () => {
  modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});

checkoutBtn.addEventListener('click', checkout);

// Initialize
loadProducts();
