/**
 * User Profile Page Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  await loadUserProfile();
});

async function loadUserProfile() {
  const container = document.getElementById('profile-content-container');
  if (!container) return;

  if (!Storage.isAuthenticated()) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">👤</div>
        <h3>Account Profile</h3>
        <p>You can sign in to view your profile settings, or explore with the demo customer profile.</p>
        <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
          <a href="login.html?redirect=profile.html" class="btn btn-primary btn-md">Log In to Your Account</a>
          <button id="btn-load-demo-profile" class="btn btn-outline btn-md">⚡ Load Demo Profile</button>
        </div>
      </div>
    `;

    const demoBtn = document.getElementById('btn-load-demo-profile');
    if (demoBtn) {
      demoBtn.addEventListener('click', async () => {
        const demoUser = {
          _id: 'usr_demo_101',
          name: 'Demo Customer',
          email: 'demo@codealpha.com',
          role: 'user',
          createdAt: '2026-01-15T10:00:00.000Z'
        };
        Storage.setAuth('mock_jwt_token_demo', demoUser);
        updateNavbarAuth();
        showToast('Demo profile loaded!', 'success');
        await loadUserProfile();
      });
    }
    return;
  }

  try {
    const res = await API.auth.getProfile();
    const user = res.data;

    let ordersCount = 0;
    try {
      const ordersRes = await API.orders.getMyOrders();
      if (ordersRes.success) ordersCount = ordersRes.count || (ordersRes.data ? ordersRes.data.length : 0);
    } catch {
      ordersCount = 0;
    }

    renderProfile(container, user, ordersCount);
  } catch (error) {
    console.error('Failed to load profile:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Could Not Load Profile</h3>
        <p>${error.message || 'Error fetching user profile.'}</p>
        <button class="btn btn-outline btn-sm" onclick="loadUserProfile()">Retry</button>
      </div>
    `;
  }
}

function renderProfile(container, user, ordersCount) {
  const joinedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'January 15, 2026';

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: 320px 1fr; gap: 2.5rem; align-items: start;">
      <!-- Profile Sidebar Card -->
      <div class="checkout-card" style="text-align: center;">
        <div style="width: 80px; height: 80px; border-radius: var(--radius-full); background: var(--primary); color: #fff; font-size: 2rem; font-weight: 800; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
          ${(user.name || 'U').charAt(0).toUpperCase()}
        </div>
        <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--secondary); margin-bottom: 0.25rem;">
          ${user.name}
        </h2>
        <p style="color: var(--gray-500); font-size: 0.9rem; word-break: break-all; margin-bottom: 0.75rem;">
          ${user.email}
        </p>
        <span style="background: var(--primary-light); color: var(--primary); font-size: 0.78rem; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: var(--radius-full); letter-spacing: 0.5px;">
          ${user.role === 'admin' ? '🛡️ Administrator' : '👤 Verified Customer'}
        </span>

        <div style="margin-top: 1.75rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem;">
          <a href="orders.html" class="btn btn-outline btn-sm btn-block">
            📦 View Order History
          </a>
          <a href="cart.html" class="btn btn-outline btn-sm btn-block">
            🛒 View Shopping Cart
          </a>
          <button id="profile-logout-btn" class="btn btn-danger btn-sm btn-block" style="margin-top: 0.5rem;">
            🚪 Sign Out
          </button>
        </div>
      </div>

      <!-- Account Activity & Details -->
      <div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; margin-bottom: 1.75rem;">
          <div class="checkout-card" style="margin-bottom: 0; padding: 1.5rem;">
            <div style="font-size: 0.8rem; color: var(--gray-500); text-transform: uppercase; font-weight: 700;">Orders Placed</div>
            <div style="font-size: 2rem; font-weight: 800; color: var(--primary); margin: 0.25rem 0;">${ordersCount}</div>
            <small style="color: var(--gray-400);">Permanently Tracked</small>
          </div>

          <div class="checkout-card" style="margin-bottom: 0; padding: 1.5rem;">
            <div style="font-size: 0.8rem; color: var(--gray-500); text-transform: uppercase; font-weight: 700;">Account Created</div>
            <div style="font-size: 1.15rem; font-weight: 700; color: var(--secondary); margin: 0.5rem 0 0.25rem;">${joinedDate}</div>
            <small style="color: var(--success); font-weight: 600;">✓ Verified Member</small>
          </div>
        </div>

        <!-- Account Security Information -->
        <div class="checkout-card">
          <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--secondary); margin-bottom: 1rem;">
            🔒 Security & Authentication
          </h3>
          <div style="display: flex; flex-direction: column; gap: 0.85rem; font-size: 0.92rem;">
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.75rem; border-bottom: 1px solid var(--gray-100);">
              <span style="color: var(--gray-500);">Password Hashing:</span>
              <strong style="color: var(--success);">bcryptjs (10 Salt Rounds)</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.75rem; border-bottom: 1px solid var(--gray-100);">
              <span style="color: var(--gray-500);">Session Token:</span>
              <strong>JSON Web Token (JWT)</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.75rem; border-bottom: 1px solid var(--gray-100);">
              <span style="color: var(--gray-500);">Database Engine:</span>
              <strong>MongoDB with Mongoose ORM</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--gray-500);">User ID:</span>
              <code style="background: var(--gray-100); padding: 2px 6px; border-radius: 4px; font-size: 0.82rem;">${user._id || 'usr_demo_101'}</code>
            </div>
          </div>
        </div>

        <!-- Edit Profile Form -->
        <div class="checkout-card" style="margin-top: 1.75rem;">
          <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--secondary); margin-bottom: 1rem;">
            ✏️ Update Personal Details
          </h3>
          <form id="profile-edit-form">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="edit-name">Display Name</label>
                <input type="text" id="edit-name" class="form-control" value="${user.name || ''}" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="edit-email">Email Address</label>
                <input type="email" id="edit-email" class="form-control" value="${user.email || ''}" required>
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-sm">
              Save Changes
            </button>
          </form>
        </div>
      </div>
    </div>
  `;

  // Attach profile edit handler
  const editForm = document.getElementById('profile-edit-form');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const updatedName = document.getElementById('edit-name').value.trim();
      const updatedEmail = document.getElementById('edit-email').value.trim();
      if (!updatedName || !updatedEmail) {
        showToast('Please fill out all fields', 'warning');
        return;
      }
      try {
        const res = await API.auth.updateProfile({ name: updatedName, email: updatedEmail });
        if (res && res.data) {
          Storage.setAuth(res.data.token || Storage.getToken(), res.data);
          updateNavbarAuth();
          showToast('Profile updated successfully! ✨', 'success');
          renderProfile(container, res.data, ordersCount);
        } else {
          showToast('Profile updated successfully! ✨', 'success');
        }
      } catch (err) {
        console.error('Update profile error:', err);
        showToast(err.message || 'Failed to update profile.', 'error');
      }
    });
  }

  // Attach logout handler
  const logoutBtn = document.getElementById('profile-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      Storage.clearAuth();
      showToast('Signed out successfully.', 'info');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 700);
    });
  }
}
