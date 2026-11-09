const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('===============================================================');
console.log('🌟 CODEALPHA E-COMMERCE: FULL STEP 3 INTEGRATION TEST SUITE');
console.log('===============================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✕ FAIL: ${message}`);
  }
}

// 1. Static HTML & Asset Structure Verification
console.log('📁 SECTION 1: Frontend Pages & Assets Structure Verification');
const frontendDir = path.join(__dirname, '../frontend');
const pages = [
  'index.html',
  'products.html',
  'product-details.html',
  'cart.html',
  'login.html',
  'register.html',
  'checkout.html',
  'orders.html',
  'profile.html'
];

pages.forEach((page) => {
  const pagePath = path.join(frontendDir, page);
  const exists = fs.existsSync(pagePath);
  assert(exists, `HTML Page exists: frontend/${page}`);

  if (exists) {
    const content = fs.readFileSync(pagePath, 'utf8');
    assert(content.includes('css/style.css'), `${page} links to css/style.css`);
    assert(content.includes('js/api.js'), `${page} includes js/api.js`);
    assert(content.includes('js/ui.js'), `${page} includes js/ui.js`);
    assert(!content.includes('href="#"'), `${page} contains zero empty "#" dead navigation links`);
  }
});

// Verify CSS and JS assets exist
const jsAssets = [
  'api.js',
  'ui.js',
  'home.js',
  'products.js',
  'product-details.js',
  'cart.js',
  'checkout.js',
  'orders.js',
  'profile.js',
  'auth.js'
];
jsAssets.forEach((js) => {
  assert(fs.existsSync(path.join(frontendDir, 'js', js)), `JavaScript module exists: frontend/js/${js}`);
});
assert(fs.existsSync(path.join(frontendDir, 'css', 'style.css')), 'Stylesheet exists: frontend/css/style.css');

// 2. Start Live Express Server for HTTP Integration Tests
console.log('\n🚀 SECTION 2: Live Express HTTP Server & Endpoints Integration');

const server = spawn('node', ['server.js'], { cwd: __dirname, stdio: ['ignore', 'pipe', 'pipe'] });

function httpRequest(method, reqPath, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path: reqPath,
        method,
        headers: reqHeaders
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {}
          resolve({ status: res.statusCode, headers: res.headers, json, text: data });
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

setTimeout(async () => {
  try {
    // 2.1 Static File Serving through Express
    console.log('\n--- 2.1 Testing Express Static Web Serving for 9 Pages ---');
    for (const page of pages) {
      const res = await httpRequest('GET', `/${page}`);
      assert(res.status === 200, `Express serves /${page} with HTTP 200 OK`);
      assert(res.headers['content-type'] && res.headers['content-type'].includes('text/html'), `/${page} Content-Type is text/html`);
    }

    // Root route fallback
    const rootRes = await httpRequest('GET', '/');
    assert(rootRes.status === 200 && rootRes.text.includes('CodeAlpha'), 'Express serves root / as index.html');

    // 2.2 API Health Check
    console.log('\n--- 2.2 Testing API Health & Diagnostics ---');
    const health = await httpRequest('GET', '/api/health');
    assert(health.status === 200 && health.json.status === 'online', 'GET /api/health responds with status: online');

    // 2.3 Product Catalog Endpoints
    console.log('\n--- 2.3 Testing Product Catalog & Filter Endpoints ---');
    const prods = await httpRequest('GET', '/api/products');
    assert(prods.status === 200 && prods.json.data.length >= 12, 'GET /api/products returns all 12 store products');

    const sampleProduct = prods.json.data[0];
    assert(sampleProduct.name && sampleProduct.price && sampleProduct.category, 'Product items have valid name, price, and category');

    const featured = await httpRequest('GET', '/api/products/featured');
    assert(featured.status === 200 && featured.json.data.length > 0, 'GET /api/products/featured returns featured products');

    const categories = await httpRequest('GET', '/api/products/categories');
    assert(categories.status === 200 && Array.isArray(categories.json.data), 'GET /api/products/categories returns categories array');
    assert(categories.json.data.includes('Electronics'), 'Categories list includes "Electronics"');

    // Search query test
    const searchRes = await httpRequest('GET', '/api/products?keyword=Sony');
    assert(searchRes.status === 200 && searchRes.json.data.some(p => p.name.includes('Sony')), 'GET /api/products?keyword=Sony successfully filters items');

    // Category filter test
    const catRes = await httpRequest('GET', '/api/products?category=Footwear');
    assert(catRes.status === 200 && catRes.json.data.every(p => p.category === 'Footwear'), 'GET /api/products?category=Footwear filters by Footwear');

    // Sorting asc
    const sortAsc = await httpRequest('GET', '/api/products?sort=price-asc');
    assert(sortAsc.status === 200 && sortAsc.json.data[0].price <= sortAsc.json.data[sortAsc.json.data.length - 1].price, 'GET /api/products?sort=price-asc sorts prices ascending');

    // Sorting desc
    const sortDesc = await httpRequest('GET', '/api/products?sort=price-desc');
    assert(sortDesc.status === 200 && sortDesc.json.data[0].price >= sortDesc.json.data[sortDesc.json.data.length - 1].price, 'GET /api/products?sort=price-desc sorts prices descending');

    // Single product by ID
    const singleProduct = await httpRequest('GET', `/api/products/${sampleProduct._id}`);
    assert(singleProduct.status === 200 && singleProduct.json.data.name === sampleProduct.name, `GET /api/products/:id fetches "${sampleProduct.name}"`);
    assert(Array.isArray(singleProduct.json.related), 'GET /api/products/:id provides related product recommendations');

    // 2.4 Authentication Security & Token Lifecycle
    console.log('\n--- 2.4 Testing Authentication Security & Middleware ---');
    const unauthProfile = await httpRequest('GET', '/api/auth/profile');
    assert(unauthProfile.status === 401 && unauthProfile.json.success === false, 'GET /api/auth/profile without Bearer token returns 401 Unauthorized');

    const fakeTokenProfile = await httpRequest('GET', '/api/auth/profile', null, {
      Authorization: 'Bearer invalid_signature_token_xyz'
    });
    assert(fakeTokenProfile.status === 401 && fakeTokenProfile.json.success === false, 'GET /api/auth/profile with fake token returns 401 Unauthorized');

    // 2.5 Cart & Orders Route Protection
    console.log('\n--- 2.5 Testing Protected Cart & Order Endpoints ---');
    const unauthCart = await httpRequest('GET', '/api/cart');
    assert(unauthCart.status === 401, 'GET /api/cart without auth returns 401');

    const unauthAddCart = await httpRequest('POST', '/api/cart', { productId: sampleProduct._id, quantity: 1 });
    assert(unauthAddCart.status === 401, 'POST /api/cart without auth returns 401');

    const unauthOrder = await httpRequest('POST', '/api/orders', { shippingAddress: {} });
    assert(unauthOrder.status === 401, 'POST /api/orders without auth returns 401');

    const unauthMyOrders = await httpRequest('GET', '/api/orders/myorders');
    assert(unauthMyOrders.status === 401, 'GET /api/orders/myorders without auth returns 401');

    // 2.6 Central Error Middleware Test
    console.log('\n--- 2.6 Testing Central 404 Error Handler ---');
    const notFoundRes = await httpRequest('GET', '/api/non-existent-endpoint');
    assert(notFoundRes.status === 404 && notFoundRes.json.message.includes('Not Found'), 'Central error handler catches undefined routes with 404');

    console.log('\n===============================================================');
    console.log(`🎉 INTEGRATION TEST RUN COMPLETE: ${passedTests} / ${totalTests} CHECKS PASSED`);
    console.log('===============================================================');

    server.kill();
    process.exit(passedTests === totalTests ? 0 : 1);
  } catch (error) {
    console.error('Integration Test Failure:', error);
    server.kill();
    process.exit(1);
  }
}, 2500);

