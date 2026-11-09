/**
 * Orders History Page Logic
 * Retrieves user's orders from MongoDB REST API
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Enforce authentication on order history page
  if (!Storage.isAuthenticated()) {
    showToast('Please sign in to view your order history.', 'warning');
    const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
    setTimeout(() => {
      window.location.href = `login.html?redirect=${redirectUrl}`;
    }, 800);
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('newOrder')) {
    const banner = document.getElementById('new-order-banner');
    if (banner) banner.style.display = 'block';
  }

  await loadOrders();
});

async function loadOrders() {
  const container = document.getElementById('orders-content-container');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 4rem;">
      <p style="color: var(--gray-500);">Fetching your orders from MongoDB... ⏳</p>
    </div>
  `;

  try {
    const res = await API.orders.getMyOrders();

    if (!res.success || !res.data || res.data.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <h3>No Orders Placed Yet</h3>
          <p>You haven't placed any orders yet. Once you make a purchase, it will appear here permanently in MongoDB!</p>
          <a href="products.html" class="btn btn-primary btn-md">Browse Catalog &rarr;</a>
        </div>
      `;
      return;
    }

    renderOrdersList(container, res.data);
  } catch (error) {
    console.error('Failed to load orders:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Could Not Load Orders</h3>
        <p>${error.message || 'Error communicating with MongoDB backend.'}</p>
        <button class="btn btn-outline btn-sm" onclick="loadOrders()">Try Again</button>
      </div>
    `;
  }
}

function renderOrdersList(container, orders) {
  container.innerHTML = `
    <div class="orders-list">
      ${orders
        .map((order) => {
          const date = new Date(order.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          const statusClass = (order.status || 'Confirmed').toLowerCase();
          const itemsCount = (order.items || []).reduce((sum, i) => sum + i.quantity, 0);
          const orderIdDisplay = order._id.length > 8 ? order._id.substring(order._id.length - 8).toUpperCase() : order._id.toUpperCase();

          const shipping = order.shippingAddress || {
            fullName: 'Customer',
            phone: 'N/A',
            address: 'Standard Delivery Address',
            city: 'City',
            state: 'State',
            postalCode: '000000'
          };

          return `
          <div class="order-card">
            <!-- Header -->
            <div class="order-card-header">
              <div class="order-meta">
                <div class="order-meta-item">
                  <span>Order Placed</span>
                  <strong>${date}</strong>
                </div>
                <div class="order-meta-item">
                  <span>Order ID</span>
                  <strong>#${orderIdDisplay}</strong>
                </div>
                <div class="order-meta-item">
                  <span>Total Amount</span>
                  <strong style="color: var(--primary);">${formatPrice(order.totalPrice)}</strong>
                </div>
                <div class="order-meta-item">
                  <span>Payment</span>
                  <strong>${order.paymentMethod}</strong>
                </div>
              </div>

              <div>
                <span class="status-pill ${statusClass}">${order.status}</span>
              </div>
            </div>

            <!-- Body -->
            <div class="order-card-body">
              <div style="margin-bottom: 1rem; font-size: 0.85rem; color: var(--gray-600); border-bottom: 1px solid var(--gray-100); padding-bottom: 0.75rem; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
                <div>
                  <strong>Deliver To:</strong> ${shipping.fullName} (${shipping.phone})
                  <div style="color: var(--gray-500);">${shipping.address}, ${shipping.city}, ${shipping.state} - ${shipping.postalCode}</div>
                </div>
                <div style="text-align: right;">
                  <span style="font-size: 0.8rem; background: var(--gray-100); padding: 4px 8px; border-radius: var(--radius-sm);">
                    ${itemsCount} ${itemsCount === 1 ? 'item' : 'items'}
                  </span>
                </div>
              </div>

              <!-- Ordered Items List -->
              <div class="order-items-sublist">
                ${(order.items || [])
                  .map((item) => {
                    const img = item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800';
                    return `
                    <div class="order-subitem">
                      <div class="order-subitem-left">
                        <img src="${img}" alt="${item.name}" class="order-subitem-thumb">
                        <div>
                          <div style="font-weight: 700; color: var(--secondary); font-size: 0.92rem;">${item.name}</div>
                          <div style="font-size: 0.82rem; color: var(--gray-500);">Qty: ${item.quantity} × ${formatPrice(item.price)}</div>
                        </div>
                      </div>
                      <div>
                        <span style="font-weight: 700; color: var(--secondary); font-size: 0.95rem;">
                          ${formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  `;
                  })
                  .join('')}
              </div>
            </div>
          </div>
        `;
        })
        .join('')}
    </div>
  `;
}
