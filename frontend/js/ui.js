/**
 * UI Utilities & Shared Component Logic
 */

// Format price to USD currency string
function formatPrice(amount) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return '$' + num.toFixed(2);
}

// Generate star rating HTML
function renderRatingStars(rating = 4.5, count = 0) {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = Math.max(0, 5 - fullStars - halfStar);

  let starsHtml = `<div class="star-rating" title="${rating} out of 5 stars">`;
  for (let i = 0; i < fullStars; i++) {
    starsHtml += '<span class="star filled">★</span>';
  }
  if (halfStar) {
    starsHtml += '<span class="star half">★</span>';
  }
  for (let i = 0; i < emptyStars; i++) {
    starsHtml += '<span class="star empty">☆</span>';
  }
  if (count > 0) {
    starsHtml += `<span class="rating-count">(${count})</span>`;
  }
  starsHtml += '</div>';
  return starsHtml;
}

// Toast Notification System
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <span class="toast-icon">${iconMap[type] || 'ℹ'}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  // Auto-dismiss after 3.2 seconds
  setTimeout(() => {
    toast.classList.add('toast-fadeout');
    setTimeout(() => toast.remove(), 400);
  }, 3200);
}

// Update Cart Badge in Navbar from MongoDB
async function updateCartBadge() {
  const badges = document.querySelectorAll('.cart-badge');
  if (badges.length === 0) return;

  if (!Storage.isAuthenticated()) {
    badges.forEach((b) => {
      b.textContent = '0';
      b.style.display = 'none';
    });
    return;
  }

  try {
    const res = await API.cart.get();
    if (res.success && res.data) {
      const count = res.data.totals ? res.data.totals.totalItems : res.data.items.length;
      badges.forEach((b) => {
        b.textContent = count;
        b.style.display = count > 0 ? 'inline-flex' : 'none';
      });
    }
  } catch (err) {
    // If unauthenticated or token expired, hide badge
    badges.forEach((b) => {
      b.style.display = 'none';
    });
  }
}

// Update Navbar Authentication State
function updateNavbarAuth() {
  const authNav = document.getElementById('auth-nav-container');
  if (!authNav) return;

  const user = Storage.getUser();
  const isAuth = Storage.isAuthenticated() && user;

  if (isAuth) {
    const initial = (user.name || 'U').charAt(0).toUpperCase();
    const firstName = (user.name || 'User').split(' ')[0];

    authNav.innerHTML = `
      <div class="user-menu-dropdown">
        <button class="btn btn-ghost user-profile-btn" id="user-menu-btn" title="Account Menu">
          <span class="user-avatar">${initial}</span>
          <span class="user-name">${firstName}</span>
          <span class="caret">▾</span>
        </button>
        <div class="dropdown-menu" id="user-dropdown-menu">
          <div class="dropdown-header">
            <strong>${user.name}</strong>
            <small>${user.email}</small>
          </div>
          <a href="profile.html" class="dropdown-item">
            <span class="item-icon">👤</span> My Profile
          </a>
          <a href="orders.html" class="dropdown-item">
            <span class="item-icon">📦</span> My Orders
          </a>
          <button id="logout-btn" class="dropdown-item text-danger">
            <span class="item-icon">🚪</span> Sign Out
          </button>
        </div>
      </div>
    `;

    // Dropdown toggle
    const menuBtn = document.getElementById('user-menu-btn');
    const dropdown = document.getElementById('user-dropdown-menu');
    if (menuBtn && dropdown) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
      });

      document.addEventListener('click', () => {
        dropdown.classList.remove('show');
      });
    }

    // Logout action
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        Storage.clearAuth();
        showToast('Signed out successfully.', 'info');
        updateNavbarAuth();
        updateCartBadge();
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 600);
      });
    }
  } else {
    authNav.innerHTML = `
      <a href="login.html" class="btn btn-outline btn-sm">Log In</a>
      <a href="register.html" class="btn btn-primary btn-sm">Sign Up</a>
    `;
  }
}

// Setup Mobile Navigation Drawer
function setupMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const navMenu = document.getElementById('nav-menu');
  if (!toggleBtn || !navMenu) return;

  toggleBtn.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    toggleBtn.classList.toggle('open');
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
      navMenu.classList.remove('active');
      toggleBtn.classList.remove('open');
    }
  });
}

// Add to Cart Helper Function with Auth Verification
async function handleAddToCart(productId, quantity = 1, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  // Check login state
  if (!Storage.isAuthenticated()) {
    showToast('Please log in to add items to your cart.', 'warning');
    const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
    setTimeout(() => {
      window.location.href = `login.html?redirect=${redirectUrl}`;
    }, 1000);
    return;
  }

  try {
    const res = await API.cart.add(productId, quantity);
    if (res.success) {
      showToast(res.message || 'Added to cart! 🛒', 'success');
      updateCartBadge();
    }
  } catch (error) {
    console.error('Add to cart error:', error);
    showToast(error.message || 'Failed to add item to cart', 'error');
  }
}

// Run layout initialization on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  updateNavbarAuth();
  updateCartBadge();
  setupMobileMenu();
});

window.formatPrice = formatPrice;
window.renderRatingStars = renderRatingStars;
window.showToast = showToast;
window.updateCartBadge = updateCartBadge;
window.handleAddToCart = handleAddToCart;
