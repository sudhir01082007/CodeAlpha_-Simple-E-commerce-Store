/**
 * Home Page Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  await loadFeaturedProducts();
});

async function loadFeaturedProducts() {
  const container = document.getElementById('featured-products-container');
  if (!container) return;

  try {
    const response = await API.products.getFeatured();

    if (!response.success || !response.data || response.data.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
          <p style="color: var(--gray-500);">No featured products available at this moment.</p>
          <a href="products.html" class="btn btn-primary btn-sm" style="margin-top: 1rem;">Browse All Products</a>
        </div>
      `;
      return;
    }

    container.innerHTML = response.data
      .map((product) => renderProductCard(product))
      .join('');
  } catch (error) {
    console.error('Failed to load featured products:', error);
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
        <p style="color: var(--danger); margin-bottom: 0.5rem;">⚠️ Could not connect to MongoDB backend server.</p>
        <p style="color: var(--gray-500); font-size: 0.9rem;">Make sure the backend is running with <code>npm start</code> in the <code>backend/</code> directory.</p>
      </div>
    `;
  }
}

function renderProductCard(product) {
  const badgeHtml = product.badge
    ? `<span class="product-badge ${product.badge.toLowerCase().includes('sale') ? 'sale' : 'popular'}">${product.badge}</span>`
    : '';

  return `
    <div class="product-card">
      <div class="product-thumb">
        ${badgeHtml}
        <a href="product-details.html?id=${product._id}">
          <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'">
        </a>
      </div>
      <div class="product-details">
        <span class="product-category">${product.category}</span>
        <h3 class="product-title">
          <a href="product-details.html?id=${product._id}">${product.name}</a>
        </h3>
        ${renderRatingStars(product.rating, product.numReviews)}
        <div class="product-bottom">
          <div class="product-price-box">
            <span class="product-price">${formatPrice(product.price)}</span>
            ${product.originalPrice ? `<span class="product-original-price">${formatPrice(product.originalPrice)}</span>` : ''}
          </div>
          <button class="btn-add-cart" onclick="handleAddToCart('${product._id}', 1, event)" title="Add to Cart">
            🛒
          </button>
        </div>
      </div>
    </div>
  `;
}

