/**
 * Product Details Page Logic
 */

let currentProduct = null;
let selectedQuantity = 1;

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    showErrorState('No product ID specified.');
    return;
  }

  await loadProductDetails(productId);
});

async function loadProductDetails(productId) {
  const container = document.getElementById('product-detail-container');
  const breadcrumbName = document.getElementById('breadcrumb-product-name');
  const relatedContainer = document.getElementById('related-products-container');

  try {
    const res = await API.products.getById(productId);

    if (!res.success || !res.data) {
      showErrorState('Product could not be found.');
      return;
    }

    currentProduct = res.data;
    selectedQuantity = 1;

    // Update Page Title and Breadcrumb
    document.title = `${currentProduct.name} - CodeAlpha Store`;
    if (breadcrumbName) {
      breadcrumbName.textContent = currentProduct.name;
    }

    // Render Product Detail Section
    container.innerHTML = renderProductView(currentProduct);

    // Setup Quantity Stepper & Add to Cart events
    setupDetailInteractions();

    // Render Related Products
    if (res.related && res.related.length > 0 && relatedContainer) {
      relatedContainer.innerHTML = res.related
        .map((p) => renderRelatedCard(p))
        .join('');
    } else if (relatedContainer) {
      relatedContainer.parentElement.style.display = 'none';
    }
  } catch (error) {
    console.error('Failed to load product:', error);
    showErrorState(error.message || 'Error fetching product from MongoDB.');
  }
}

function renderProductView(p) {
  const inStock = p.stock > 0;
  const stockClass = inStock ? (p.stock < 5 ? 'low-stock' : 'in-stock') : 'out-of-stock';
  const stockText = inStock
    ? (p.stock < 5 ? `⚠️ Low Stock - Only ${p.stock} left in stock!` : `✓ In Stock (${p.stock} available)`)
    : '✕ Currently Out of Stock';

  const discountPercent = p.originalPrice && p.originalPrice > p.price
    ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
    : 0;

  return `
    <div class="product-detail-grid">
      <!-- Product Gallery / Image -->
      <div class="detail-gallery">
        <img src="${p.image}" alt="${p.name}" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'">
      </div>

      <!-- Product Information -->
      <div class="detail-info">
        <span class="detail-brand">${p.brand || p.category}</span>
        <h1 class="detail-title">${p.name}</h1>
        
        ${renderRatingStars(p.rating, p.numReviews)}

        <div class="detail-price-box">
          <span class="detail-price">${formatPrice(p.price)}</span>
          ${p.originalPrice ? `<span class="detail-original-price">${formatPrice(p.originalPrice)}</span>` : ''}
          ${discountPercent > 0 ? `<span class="detail-discount-badge">Save ${discountPercent}%</span>` : ''}
        </div>

        <div class="stock-status ${stockClass}">
          <span>${stockText}</span>
        </div>

        <p class="detail-desc">${p.description}</p>

        <!-- Value features -->
        <div style="background: var(--gray-50); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.85rem;">
          <div>🚚 <strong>Free Shipping:</strong> On orders over $50</div>
          <div>🛡️ <strong>Authenticity:</strong> 100% Genuine product guaranteed</div>
          <div>🔄 <strong>Return Policy:</strong> 30 days hassle-free returns</div>
        </div>

        <!-- Add To Cart Form -->
        ${
          inStock
            ? `
          <div class="detail-actions">
            <div class="qty-control">
              <button class="qty-btn" id="btn-qty-minus" aria-label="Decrease quantity">-</button>
              <input type="number" id="detail-qty-input" class="qty-input" value="1" min="1" max="${p.stock}" readonly>
              <button class="qty-btn" id="btn-qty-plus" aria-label="Increase quantity">+</button>
            </div>

            <button class="btn btn-primary btn-lg" id="btn-add-to-cart-detail" style="flex: 1;">
              <span>🛒 Add to Cart</span>
            </button>
          </div>
        `
            : `
          <button class="btn btn-secondary btn-lg btn-block" disabled>
            Out of Stock
          </button>
        `
        }

      </div>
    </div>
  `;
}

function setupDetailInteractions() {
  const btnMinus = document.getElementById('btn-qty-minus');
  const btnPlus = document.getElementById('btn-qty-plus');
  const qtyInput = document.getElementById('detail-qty-input');
  const btnAddToCart = document.getElementById('btn-add-to-cart-detail');

  if (btnMinus && btnPlus && qtyInput) {
    btnMinus.addEventListener('click', () => {
      if (selectedQuantity > 1) {
        selectedQuantity--;
        qtyInput.value = selectedQuantity;
      }
    });

    btnPlus.addEventListener('click', () => {
      if (selectedQuantity < currentProduct.stock) {
        selectedQuantity++;
        qtyInput.value = selectedQuantity;
      } else {
        showToast(`Maximum available stock is ${currentProduct.stock}`, 'warning');
      }
    });
  }

  if (btnAddToCart) {
    btnAddToCart.addEventListener('click', async () => {
      await handleAddToCart(currentProduct._id, selectedQuantity);
    });
  }
}

function renderRelatedCard(product) {
  return `
    <div class="product-card">
      <div class="product-thumb">
        <a href="product-details.html?id=${product._id}">
          <img src="${product.image}" alt="${product.name}" loading="lazy">
        </a>
      </div>
      <div class="product-details">
        <span class="product-category">${product.category}</span>
        <h3 class="product-title">
          <a href="product-details.html?id=${product._id}">${product.name}</a>
        </h3>
        <div class="product-bottom">
          <span class="product-price">${formatPrice(product.price)}</span>
          <a href="product-details.html?id=${product._id}" class="btn btn-outline btn-sm">View</a>
        </div>
      </div>
    </div>
  `;
}

function showErrorState(message) {
  const container = document.getElementById('product-detail-container');
  if (!container) return;

  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <h3>Product Not Available</h3>
      <p>${message}</p>
      <a href="products.html" class="btn btn-primary btn-sm">Back to Products Catalog</a>
    </div>
  `;
}

