/**
 * Central API Client for CodeAlpha E-Commerce Store
 * Manages communication with the Node.js / Express.js REST API.
 */

// Dynamically determine the backend API base URL
// Allows configuration via window.API_BASE_OVERRIDE if specified
const API_BASE = (() => {
  if (window.API_BASE_OVERRIDE) {
    return window.API_BASE_OVERRIDE;
  }
  // When running on Live Server (e.g. port 5500) or file://, route to backend port 5000
  if (
    window.location.protocol === 'file:' ||
    (window.location.port !== '5000' && window.location.hostname === '127.0.0.1') ||
    (window.location.port !== '5000' && window.location.hostname === 'localhost')
  ) {
    return 'http://localhost:5000/api';
  }
  return '/api';
})();

const Storage = {
  TOKEN_KEY: 'codealpha_token',
  USER_KEY: 'codealpha_user',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  getUser() {
    try {
      const u = localStorage.getItem(this.USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  // Save JWT token and basic user profile (NEVER stores passwords)
  setAuth(token, user) {
    if (token) localStorage.setItem(this.TOKEN_KEY, token);
    if (user) {
      // Sanitize: ensure no password fields ever touch localStorage
      const safeUser = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        createdAt: user.createdAt
      };
      localStorage.setItem(this.USER_KEY, JSON.stringify(safeUser));
    }
  },

  clearAuth() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },

  isAuthenticated() {
    return !!this.getToken();
  }
};

/**
 * Core HTTP Request Method
 * Injects JWT Authorization header, parses JSON, and handles HTTP status codes.
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = Storage.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // 401 Unauthorized handling (expired or invalid token)
      if (response.status === 401 && Storage.isAuthenticated()) {
        Storage.clearAuth();
        if (typeof showToast === 'function') {
          showToast('Session expired. Please log in again.', 'warning');
        }
        // Redirect to login if on a protected page
        const protectedPages = ['checkout.html', 'orders.html', 'profile.html', 'cart.html'];
        const currentPage = window.location.pathname.split('/').pop();
        if (protectedPages.includes(currentPage)) {
          setTimeout(() => {
            window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
          }, 800);
        }
      }

      const errorMessage = data.message || `Request failed with status ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    // Distinguish network/server offline errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const netError = new Error('Cannot connect to backend server. Please verify Express server is running on port 5000.');
      netError.isNetworkError = true;
      throw netError;
    }
    throw error;
  }
}

// REST API Endpoints Object
const API = {
  BASE_URL: API_BASE,

  // Authentication API
  auth: {
    register: (userData) =>
      apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      }),

    login: (credentials) =>
      apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      }),

    getProfile: () => apiRequest('/auth/profile'),

    updateProfile: (profileData) =>
      apiRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      })
  },

  // Products API (Live MongoDB)
  products: {
    getAll: (params = {}) => {
      const query = new URLSearchParams();
      if (params.keyword && params.keyword.trim() !== '') query.append('keyword', params.keyword.trim());
      if (params.category && params.category !== 'All') query.append('category', params.category);
      if (params.sort) query.append('sort', params.sort);
      if (params.minPrice) query.append('minPrice', params.minPrice);
      if (params.maxPrice) query.append('maxPrice', params.maxPrice);

      const qs = query.toString();
      return apiRequest(`/products${qs ? `?${qs}` : ''}`);
    },

    getFeatured: () => apiRequest('/products/featured'),

    getCategories: () => apiRequest('/products/categories'),

    getById: (id) => apiRequest(`/products/${id}`)
  },

  // Shopping Cart API (Live MongoDB)
  cart: {
    get: () => apiRequest('/cart'),

    add: (productId, quantity = 1) =>
      apiRequest('/cart', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity })
      }),

    update: (productId, quantity) =>
      apiRequest(`/cart/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity })
      }),

    remove: (productId) =>
      apiRequest(`/cart/${productId}`, {
        method: 'DELETE'
      }),

    clear: () =>
      apiRequest('/cart', {
        method: 'DELETE'
      })
  },

  // Orders API (Live MongoDB)
  orders: {
    create: (orderData) =>
      apiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
      }),

    getMyOrders: () => apiRequest('/orders/myorders'),

    getById: (id) => apiRequest(`/orders/${id}`)
  }
};

window.API = API;
window.Storage = Storage;
