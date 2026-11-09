/**
 * Authentication Logic (Login & Register)
 * Connects to Express JWT & bcrypt endpoints
 */

document.addEventListener('DOMContentLoaded', () => {
  // If user is already logged in, redirect away from login/register
  if (Storage.isAuthenticated()) {
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect') || 'index.html';
    window.location.href = redirect;
    return;
  }

  setupLoginForm();
  setupRegisterForm();
  setupDemoFiller();
  setupPasswordToggles();
});

// Setup Login Form Handlers
function setupLoginForm() {
  const form = document.getElementById('login-form');
  const submitBtn = document.getElementById('btn-login-submit');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const loginInput = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!loginInput || !password) {
      showToast('Please enter both email/username and password', 'warning');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Signing in... ⏳';

    try {
      const res = await API.auth.login({
        email: loginInput,
        username: loginInput,
        password
      });

      if (res.success && res.data) {
        Storage.setAuth(res.data.token, {
          _id: res.data._id,
          name: res.data.name,
          email: res.data.email,
          role: res.data.role
        });

        showToast(`Welcome back, ${res.data.name}! 👋`, 'success');

        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect') || 'index.html';

        setTimeout(() => {
          window.location.href = redirect;
        }, 800);
      }
    } catch (error) {
      console.error('Login Error:', error);
      showToast(error.message || 'Invalid username and password', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Sign In &rarr;';
    }
  });
}

// Setup Register Form Handlers
function setupRegisterForm() {
  const form = document.getElementById('register-form');
  const submitBtn = document.getElementById('btn-register-submit');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;

    if (!name || !email || !password) {
      showToast('Please fill out all required fields', 'warning');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters long', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match. Please re-check.', 'warning');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Creating account... ⏳';

    try {
      const res = await API.auth.register({ name, email, password });

      if (res.success && res.data) {
        Storage.setAuth(res.data.token, {
          _id: res.data._id,
          name: res.data.name,
          email: res.data.email,
          role: res.data.role
        });

        showToast('Registration successful! Welcome to the store. 🎉', 'success');

        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect') || 'index.html';

        setTimeout(() => {
          window.location.href = redirect;
        }, 1000);
      }
    } catch (error) {
      console.error('Registration Error:', error);
      showToast(error.message || 'Registration failed. Email might already exist.', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Register Account &rarr;';
    }
  });
}

// Quick Demo Account Auto-Fill
function setupDemoFiller() {
  const btnDemo = document.getElementById('btn-fill-demo');
  if (btnDemo) {
    btnDemo.addEventListener('click', () => {
      const emailField = document.getElementById('login-email');
      const passField = document.getElementById('login-password');
      if (emailField && passField) {
        emailField.value = 'demo@codealpha.com';
        passField.value = 'password123';
        showToast('Customer credentials filled. Click "Sign In"!', 'info');
      }
    });
  }

  const btnAdmin = document.getElementById('btn-fill-admin');
  if (btnAdmin) {
    btnAdmin.addEventListener('click', () => {
      const emailField = document.getElementById('login-email');
      const passField = document.getElementById('login-password');
      if (emailField && passField) {
        emailField.value = 'admin@codealpha.com';
        passField.value = 'admin123';
        showToast('Admin credentials filled. Click "Sign In"!', 'info');
      }
    });
  }
}

// Password visibility toggler
function setupPasswordToggles() {
  const toggleBtn = document.getElementById('toggle-login-pass');
  const passInput = document.getElementById('login-password');
  if (toggleBtn && passInput) {
    toggleBtn.addEventListener('click', () => {
      const isPass = passInput.type === 'password';
      passInput.type = isPass ? 'text' : 'password';
      toggleBtn.textContent = isPass ? 'Hide' : 'Show';
    });
  }
}

