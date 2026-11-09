/**
 * Products Catalog Logic
 */

let currentFilters = {
  keyword: '',
  category: 'All',
  sort: '',
  minPrice: '',
  maxPrice: ''
};

let searchTimeout = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Parse initial query params from URL
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('category')) {
    currentFilters.category = urlParams.get('category');
  }
  if (urlParams.has('keyword')) {
    currentFilters.keyword = urlParams.get('keyword');
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = currentFilters.keyword;
  }

  setupEventListeners();
  updateCategoryUI();
  await fetchProducts();
});

function setupEventListeners() {
  // Search Input with Debouncing
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentFilters.keyword = e.target.value.trim();
        fetchProducts();
      }, 350);
    });
  }

  // Category Filter Buttons
  const categoryBtns = document.querySelectorAll('.category-filter-btn');
  categoryBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      currentFilters.category = btn.getAttribute('data-category');
      updateCategoryUI();
      fetchProducts();
    });
  });

  // Reset category
  const resetCatBtn = document.getElementById('reset-category-btn');
  if (resetCatBtn) {
    resetCatBtn.addEventListener('click', () => {
      currentFilters.category = 'All';
      updateCategoryUI();
      fetchProducts();
    });
  }

  // Sort Dropdown
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentFilters.sort = e.target.value;
      fetchProducts();
    });
  }

  // Price Filter
  const applyPriceBtn = document.getElementById('apply-price-btn');
  if (applyPriceBtn) {
    applyPriceBtn.addEventListener('click', () => {
      const min = document.getElementById('min-price').value;
      const max = document.getElementById('max-price').value;
      currentFilters.minPrice = min;
      currentFilters.maxPrice = max;
      fetchProducts();
    });
  }

  // Reset All Filters
  const resetAllBtn = document.getElementById('reset-all-filters');
  if (resetAllBtn) {
    resetAllBtn.addEventListener('click', () => {
      currentFilters = {
        keyword: '',
        category: 'All',
        sort: '',
        minPrice: '',
        maxPrice: ''
      };
      if (searchInput) searchInput.value = '';
      if (sortSelect) sortSelect.value = '';
      document.getElementById('min-price').value = '';
      document.getElementById('max-price').value = '';
      updateCategoryUI();
      fetchProducts();
    });
  }
}

function updateCategoryUI() {
  const categoryBtns = document.querySelectorAll('.category-filter-btn');
  categoryBtns.forEach((btn) => {
    const cat = btn.getAttribute('data-category');
    if (cat.toLowerCase() === currentFilters.category.toLowerCase()) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

async function fetchProducts() {
  const container = document.getElementById('catalog-products-container');
  const countEl = document.getElementById('product-count');
  if (!container) return;

  container.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
      <p style="color: var(--gray-500);">Searching products in MongoDB...</p>
    </div>
  `;

  try {
    const res = await API.products.getAll(currentFilters);

    if (!res.success || !res.data || res.data.length === 0) {
      if (countEl) countEl.textContent = '0 products found';
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">🔍</div>
          <h3>No Products Found</h3>
          <p>We couldn't find any products matching your current filters. Try resetting search or selecting another category.</p>
          <button class="btn btn-primary btn-sm" onclick="document.getElementById('reset-all-filters').click()">
            Reset All Filters
          </button>
        </div>
      `;
      return;
    }

    if (countEl) {
      countEl.textContent = `Showing ${res.data.length} ${res.data.length === 1 ? 'product' : 'products'}`;
    }

    container.innerHTML = res.data
      .map((product) => renderCatalogProductCard(product))
      .join('');
  } catch (error) {
    console.error('Failed to fetch products:', error);
    if (countEl) countEl.textContent = 'Error loading';
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
        <p style="color: var(--danger);">⚠️ Error communicating with MongoDB API.</p>
        <p style="color: var(--gray-500); font-size: 0.9rem; margin-top: 0.5rem;">${error.message}</p>
      </div>
    `;
  }
}

function renderCatalogProductCard(product) {
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

