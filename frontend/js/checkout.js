/**
 * Checkout Page Logic
 * Submits order to MongoDB and redirects to Order History
 */

let checkoutCart = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Enforce authentication on checkout page
  if (!Storage.isAuthenticated()) {
    showToast('Please sign in to proceed to checkout.', 'warning');
    const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
    setTimeout(() => {
      window.location.href = `login.html?redirect=${redirectUrl}`;
    }, 800);
    return;
  }

  await loadCheckoutData();
});

async function loadCheckoutData() {
  const container = document.getElementById('checkout-main-container');
  if (!container) return;

  try {
    const res = await API.cart.get();

    if (!res.success || !res.data || res.data.items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🛒</div>
          <h3>Your Cart is Empty</h3>
          <p>Please add products to your cart before proceeding to checkout.</p>
          <a href="products.html" class="btn btn-primary btn-md">Explore Products &rarr;</a>
        </div>
      `;
      return;
    }

    checkoutCart = res.data;
    const user = Storage.getUser() || {};
    renderCheckoutView(container, checkoutCart, user);
    setupCheckoutEvents();
  } catch (error) {
    console.error('Checkout load error:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Failed to Load Checkout</h3>
        <p>${error.message || 'Error loading checkout items from MongoDB.'}</p>
        <a href="cart.html" class="btn btn-outline btn-sm">Return to Cart</a>
      </div>
    `;
  }
}

function renderCheckoutView(container, cart, user) {
  const totals = cart.totals || {
    subtotal: 0,
    shipping: 0,
    tax: 0,
    total: 0,
    totalItems: 0
  };

  container.innerHTML = `
    <div class="checkout-layout">
      <!-- Checkout Form Column -->
      <div>
        <form id="checkout-form">
          <!-- Shipping Address Card -->
          <div class="checkout-card">
            <h2 class="checkout-card-title">
              <span>📍</span> 1. Shipping Address
            </h2>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="full-name">Full Name *</label>
                <input type="text" id="full-name" class="form-control" value="${user.name || ''}" placeholder="e.g. John Doe" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="phone">Phone Number *</label>
                <input type="tel" id="phone" class="form-control" placeholder="e.g. +91 9876543210" required>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="address">Street Address *</label>
              <input type="text" id="address" class="form-control" placeholder="House / Flat No., Street, Landmark" required>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="city">City *</label>
                <input type="text" id="city" class="form-control" placeholder="City" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="state">State / Province *</label>
                <input type="text" id="state" class="form-control" placeholder="State" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="postal-code">Postal / PIN Code *</label>
                <input type="text" id="postal-code" class="form-control" placeholder="Postal Code" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="country">Country *</label>
                <input type="text" id="country" class="form-control" value="India" required>
              </div>
            </div>
          </div>

          <!-- Payment Method Card -->
          <div class="checkout-card">
            <h2 class="checkout-card-title">
              <span>💳</span> 2. Payment Method
            </h2>

            <div class="payment-options">
              <label class="payment-option-label">
                <input type="radio" name="paymentMethod" value="Cash on Delivery" checked>
                <div class="payment-content">
                  <strong>💵 Cash on Delivery (COD)</strong>
                  <div style="font-size: 0.8rem; color: var(--gray-500);">Pay in cash when order is safely delivered to your doorstep (Payment: Pending)</div>
                </div>
              </label>

              <label class="payment-option-label">
                <input type="radio" name="paymentMethod" value="Credit/Debit Card">
                <div class="payment-content">
                  <strong>💳 Credit / Debit Card (Demo Simulation)</strong>
                  <div style="font-size: 0.8rem; color: var(--gray-500);">Simulated demo card payment. No real card numbers or CVV collected.</div>
                </div>
              </label>

              <label class="payment-option-label">
                <input type="radio" name="paymentMethod" value="UPI / Online">
                <div class="payment-content">
                  <strong>⚡ Instant UPI / Net Banking (Demo Simulation)</strong>
                  <div style="font-size: 0.8rem; color: var(--gray-500);">Simulated instant payment. No UPI ID, bank account, or PIN collected.</div>
                </div>
              </label>
            </div>

            <!-- Demo Card Payment Notice (No financial data collected) -->
            <div id="card-fields" style="display: none; margin-top: 1.25rem; background: #eff6ff; padding: 1.15rem; border-radius: var(--radius-md); border: 1px solid #bfdbfe; font-size: 0.85rem; color: #1e40af;">
              <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 700; margin-bottom: 0.35rem;">
                <span>💳</span> Demo Card Payment Simulation
              </div>
              <p style="margin: 0; font-size: 0.82rem; color: #2563eb; line-height: 1.5;">
                This is a simulated demo payment option. No real card number, CVV, or OTP is collected. Your payment status will be recorded as <strong>"Demo Payment Successful"</strong> upon placing the order.
              </p>
            </div>

            <!-- Demo UPI Payment Notice (No financial data collected) -->
            <div id="upi-fields" style="display: none; margin-top: 1.25rem; background: #f0fdf4; padding: 1.15rem; border-radius: var(--radius-md); border: 1px solid #bbf7d0; font-size: 0.85rem; color: #166534;">
              <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 700; margin-bottom: 0.35rem;">
                <span>⚡</span> Demo UPI Payment Simulation
              </div>
              <p style="margin: 0; font-size: 0.82rem; color: #16a34a; line-height: 1.5;">
                This is a simulated demo payment option. No real UPI ID, bank account, or PIN is collected. Your payment status will be recorded as <strong>"Demo Payment Successful"</strong> upon placing the order.
              </p>
            </div>
          </div>

          <button type="submit" id="btn-submit-order" class="btn btn-primary btn-lg btn-block">
            <span>Confirm & Place Order (${formatPrice(totals.total)}) &rarr;</span>
          </button>
        </form>
      </div>

      <!-- Order Review Sidebar -->
      <div>
        <div class="order-summary-card">
          <h3 class="summary-title">Order Items (${totals.totalItems})</h3>

          <div style="max-height: 280px; overflow-y: auto; margin-bottom: 1.25rem; display: flex; flex-direction: column; gap: 0.85rem; padding-right: 0.25rem;">
            ${cart.items
              .map((item) => {
                const prod = item.product || {};
                const name = prod.name || item.name || 'Product';
                const image = prod.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800';
                return `
                <div style="display: flex; gap: 0.75rem; align-items: center;">
                  <img src="${image}" alt="${name}" style="width: 48px; height: 48px; border-radius: var(--radius-sm); object-fit: cover; background: var(--gray-100);">
                  <div style="flex-grow: 1;">
                    <div style="font-size: 0.88rem; font-weight: 700; color: var(--secondary); display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">${name}</div>
                    <div style="font-size: 0.78rem; color: var(--gray-500);">Qty: ${item.quantity} × ${formatPrice(item.price)}</div>
                  </div>
                  <strong style="font-size: 0.9rem; color: var(--secondary);">${formatPrice(item.price * item.quantity)}</strong>
                </div>
              `;
              })
              .join('')}
          </div>

          <div class="summary-row">
            <span>Subtotal</span>
            <span>${formatPrice(totals.subtotal)}</span>
          </div>
          <div class="summary-row">
            <span>Shipping</span>
            <span>${totals.shipping === 0 ? '<strong style="color:var(--success);">FREE</strong>' : formatPrice(totals.shipping)}</span>
          </div>
          <div class="summary-row">
            <span>Tax (8%)</span>
            <span>${formatPrice(totals.tax)}</span>
          </div>
          <div class="summary-row total-row">
            <span>Order Total</span>
            <span style="color: var(--primary);">${formatPrice(totals.total)}</span>
          </div>

          <div style="margin-top: 1.5rem; background: var(--primary-light); padding: 0.85rem; border-radius: var(--radius-sm); font-size: 0.8rem; color: var(--primary-text);">
            🔒 <strong>MongoDB Persistence:</strong> Once placed, order details are permanently stored in your MongoDB database and cart is cleared.
          </div>
        </div>
      </div>
    </div>
  `;
}

function setupCheckoutEvents() {
  const paymentRadios = document.querySelectorAll('input[name="paymentMethod"]');
  const cardFields = document.getElementById('card-fields');
  const upiFields = document.getElementById('upi-fields');

  paymentRadios.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      const selected = e.target.value;
      if (cardFields) {
        cardFields.style.display = selected === 'Credit/Debit Card' ? 'block' : 'none';
      }
      if (upiFields) {
        upiFields.style.display = selected === 'UPI / Online' ? 'block' : 'none';
      }
    });
  });

  const form = document.getElementById('checkout-form');
  const submitBtn = document.getElementById('btn-submit-order');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const shippingAddress = {
        fullName: document.getElementById('full-name').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        address: document.getElementById('address').value.trim(),
        city: document.getElementById('city').value.trim(),
        state: document.getElementById('state').value.trim(),
        postalCode: document.getElementById('postal-code').value.trim(),
        country: document.getElementById('country').value.trim()
      };

      const selectedPayment = document.querySelector('input[name="paymentMethod"]:checked');
      const paymentMethod = selectedPayment ? selectedPayment.value : 'Cash on Delivery';

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Processing Order in MongoDB... ⏳</span>';

      try {
        const orderPayload = {
          shippingAddress,
          paymentMethod
        };

        const res = await API.orders.create(orderPayload);

        if (res.success && res.data) {
          const isCOD =
            paymentMethod.toLowerCase().includes('cash') ||
            paymentMethod.toLowerCase().includes('cod');

          if (isCOD) {
            showToast('Order placed successfully! Payment status: Pending.', 'info');
          } else {
            showToast('Demo Payment Successful! Order placed successfully. 🎉', 'success');
          }

          updateCartBadge();

          setTimeout(() => {
            window.location.href = `orders.html?newOrder=${res.data._id}&method=${encodeURIComponent(paymentMethod)}`;
          }, 900);
        }
      } catch (error) {
        console.error('Order creation error:', error);
        showToast(error.message || 'Failed to place order. Please check inputs.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Confirm & Place Order &rarr;</span>';
      }
    });
  }
}
