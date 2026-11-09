/**
 * Shopping Cart Page Logic
 * Synchronized with MongoDB Cart REST API
 */

let cartData = null;
let appliedDiscountPercent = 0; // Promotional UI discount

document.addEventListener('DOMContentLoaded', async () => {
  await loadCart();
});

async function loadCart() {
  const wrapper = document.getElementById('cart-content-wrapper');
  if (!wrapper) return;

  // Unauthenticated user prompt
  if (!Storage.isAuthenticated()) {
    wrapper.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔒</div>
        <h3>Please Sign In</h3>
        <p>Your shopping cart is securely saved in MongoDB. Please log in to view or manage your items.</p>
        <a href="login.html?redirect=cart.html" class="btn btn-primary btn-md">Sign In to View Cart &rarr;</a>
      </div>
    `;
    updateCartBadge();
    return;
  }

  wrapper.innerHTML = `
    <div style="text-align: center; padding: 4rem;">
      <p style="color: var(--gray-500);">Loading your cart from MongoDB... ⏳</p>
    </div>
  `;

  try {
    const res = await API.cart.get();

    if (!res.success || !res.data || res.data.items.length === 0) {
      wrapper.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🛒</div>
          <h3>Your Cart is Empty</h3>
          <p>Looks like you haven't added anything to your cart yet. Explore our catalog to find top products!</p>
          <a href="products.html" class="btn btn-primary btn-md">Start Shopping &rarr;</a>
        </div>
      `;
      updateCartBadge();
      return;
    }

    cartData = res.data;
    renderCartView(wrapper, cartData);
    updateCartBadge();
  } catch (error) {
    console.error('Error fetching cart:', error);
    wrapper.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Unable to Load Cart</h3>
        <p>${error.message || 'Error communicating with MongoDB backend.'}</p>
        <button class="btn btn-primary btn-sm" onclick="loadCart()">Retry</button>
      </div>
    `;
  }
}

function renderCartView(container, cart) {
  // Use authoritative server-calculated totals from MongoDB Cart model
  const serverTotals = cart.totals || {
    subtotal: 0,
    shipping: 0,
    tax: 0,
    total: 0,
    totalItems: 0
  };

  const discountAmount = Number(((serverTotals.subtotal * appliedDiscountPercent) / 100).toFixed(2));
  const effectiveTotal = Math.max(0, Number((serverTotals.total - discountAmount).toFixed(2)));

  container.innerHTML = `
    <div class="cart-layout">
      <!-- Items Table -->
      <div class="cart-items-box">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h2 style="font-size: 1.2rem; font-weight: 700; color: var(--secondary);">
            Items in Cart (${serverTotals.totalItems})
          </h2>
          <button class="btn btn-ghost btn-sm" id="btn-clear-cart" style="color: var(--danger);">
            Clear All
          </button>
        </div>

        <table class="cart-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${cart.items
              .map((item) => {
                const prod = item.product || {};
                const prodId = prod._id || item.productId || item._id;
                const prodName = prod.name || item.name || 'Product';
                const prodImg = prod.image || item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800';
                const prodCategory = prod.category || 'Store Item';

                return `
                <tr data-product-id="${prodId}">
                  <td>
                    <div class="cart-item-product">
                      <img src="${prodImg}" alt="${prodName}" class="cart-item-thumb">
                      <div class="cart-item-info">
                        <h4><a href="product-details.html?id=${prodId}">${prodName}</a></h4>
                        <span>${prodCategory}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="cart-item-price">${formatPrice(item.price)}</span>
                  </td>
                  <td>
                    <div class="qty-control" style="width: fit-content;">
                      <button class="qty-btn" onclick="updateItemQuantity('${prodId}', ${item.quantity - 1})">-</button>
                      <input type="text" class="qty-input" value="${item.quantity}" readonly>
                      <button class="qty-btn" onclick="updateItemQuantity('${prodId}', ${item.quantity + 1})">+</button>
                    </div>
                  </td>
                  <td>
                    <span class="cart-item-price" style="color: var(--primary);">
                      ${formatPrice(item.price * item.quantity)}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <button class="btn-remove-item" onclick="removeItem('${prodId}')" title="Remove item">
                      🗑️
                    </button>
                  </td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>

        <div style="margin-top: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
          <a href="products.html" class="btn btn-outline btn-sm">&larr; Continue Shopping</a>
        </div>
      </div>

      <!-- Order Summary Card -->
      <div class="order-summary-card">
        <h3 class="summary-title">Order Summary</h3>

        <div class="summary-row">
          <span>Subtotal</span>
          <span>${formatPrice(serverTotals.subtotal)}</span>
        </div>

        ${
          appliedDiscountPercent > 0
            ? `
          <div class="summary-row" style="color: var(--success); font-weight: 600;">
            <span>Discount (${appliedDiscountPercent}%)</span>
            <span>-${formatPrice(discountAmount)}</span>
          </div>
        `
            : ''
        }

        <div class="summary-row">
          <span>Shipping</span>
          <span>${serverTotals.shipping === 0 ? '<strong style="color:var(--success);">FREE</strong>' : formatPrice(serverTotals.shipping)}</span>
        </div>

        <div class="summary-row">
          <span>Estimated Tax (8%)</span>
          <span>${formatPrice(serverTotals.tax)}</span>
        </div>

        <div class="summary-row total-row">
          <span>Total</span>
          <span style="color: var(--primary);">${formatPrice(effectiveTotal)}</span>
        </div>

        <!-- Promo Code Input -->
        <div style="margin: 1.5rem 0;">
          <label style="font-size: 0.8rem; font-weight: 600; color: var(--gray-600); display: block; margin-bottom: 0.35rem;">Promo Code</label>
          <div style="display: flex; gap: 0.5rem;">
            <input type="text" id="promo-input" class="form-control" placeholder="ALPHA2026" value="${appliedDiscountPercent > 0 ? 'ALPHA2026' : ''}" style="padding: 0.45rem 0.75rem; font-size: 0.85rem; text-transform: uppercase;">
            <button class="btn btn-outline btn-sm" id="btn-apply-promo">Apply</button>
          </div>
          <small style="color: var(--gray-400); font-size: 0.75rem; margin-top: 0.25rem; display: block;">Try code: <strong>ALPHA2026</strong> for 10% off</small>
        </div>

        <a href="checkout.html" class="btn btn-primary btn-lg btn-block">
          Proceed to Checkout &rarr;
        </a>

        <div style="text-align: center; margin-top: 1rem; color: var(--gray-400); font-size: 0.78rem;">
          🔒 256-Bit SSL Encrypted MongoDB Checkout
        </div>
      </div>
    </div>
  `;

  // Clear Cart Listener
  const btnClear = document.getElementById('btn-clear-cart');
  if (btnClear) {
    btnClear.addEventListener('click', async () => {
      if (confirm('Are you sure you want to empty your cart?')) {
        try {
          await API.cart.clear();
          showToast('Cart cleared', 'info');
          await loadCart();
        } catch (err) {
          showToast(err.message || 'Failed to clear cart', 'error');
        }
      }
    });
  }

  // Promo Code listener
  const btnPromo = document.getElementById('btn-apply-promo');
  const promoInput = document.getElementById('promo-input');
  if (btnPromo && promoInput) {
    btnPromo.addEventListener('click', () => {
      const code = promoInput.value.trim().toUpperCase();
      if (code === 'ALPHA2026') {
        appliedDiscountPercent = 10;
        showToast('Promo code ALPHA2026 applied! 10% discount added.', 'success');
        renderCartView(container, cartData);
      } else {
        showToast('Invalid promo code. Use ALPHA2026', 'warning');
      }
    });
  }
}

// Update item quantity via MongoDB PUT /api/cart/:productId
async function updateItemQuantity(productId, newQty) {
  try {
    const res = await API.cart.update(productId, newQty);
    if (res.success && res.data) {
      cartData = res.data;
      const wrapper = document.getElementById('cart-content-wrapper');
      if (cartData.items.length === 0) {
        await loadCart();
      } else {
        renderCartView(wrapper, cartData);
      }
      updateCartBadge();
    }
  } catch (error) {
    showToast(error.message || 'Failed to update quantity', 'error');
  }
}

// Remove item via MongoDB DELETE /api/cart/:productId
async function removeItem(productId) {
  try {
    const res = await API.cart.remove(productId);
    if (res.success && res.data) {
      showToast('Item removed from cart', 'info');
      cartData = res.data;
      const wrapper = document.getElementById('cart-content-wrapper');
      if (cartData.items.length === 0) {
        await loadCart();
      } else {
        renderCartView(wrapper, cartData);
      }
      updateCartBadge();
    }
  } catch (error) {
    showToast(error.message || 'Failed to remove item', 'error');
  }
}

window.updateItemQuantity = updateItemQuantity;
window.removeItem = removeItem;
window.loadCart = loadCart;
