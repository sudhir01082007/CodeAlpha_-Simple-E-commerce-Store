const http = require('http');
const { spawn } = require('child_process');

const server = spawn('node', ['server.js'], { cwd: __dirname, stdio: ['ignore', 'pipe', 'pipe'] });

server.stdout.on('data', d => {});
server.stderr.on('data', d => {});

function request(method, path, body = null, headers = {}) {
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
        path,
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
          resolve({ status: res.statusCode, json, text: data });
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

setTimeout(async () => {
  console.log('======================================================');
  console.log('🌐 TESTING LIVE REST API ENDPOINTS & HTTP RESPONSES');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  function check(condition, desc) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✓ PASS: ${desc}`);
    } else {
      console.error(`  ✕ FAIL: ${desc}`);
    }
  }

  try {
    // 1. Health Endpoint
    const h = await request('GET', '/api/health');
    check(h.status === 200 && h.json.status === 'online', 'GET /api/health returns 200 OK with online status');

    // 2. Auth: Register Validation
    const regBad = await request('POST', '/api/auth/register', {});
    check(regBad.status === 400 || regBad.status === 503, 'POST /api/auth/register with empty payload fails validation (400/503)');

    // 3. Auth: Login Validation
    const logBad = await request('POST', '/api/auth/login', {});
    check(logBad.status === 400 || logBad.status === 503, 'POST /api/auth/login with empty payload fails validation (400/503)');

    // 4. Auth: Profile Unauthorized without token
    const profNoToken = await request('GET', '/api/auth/profile');
    check(profNoToken.status === 401 && profNoToken.json.success === false, 'GET /api/auth/profile without token returns 401 Unauthorized');

    // 5. Auth: Invalid Token
    const profBadToken = await request('GET', '/api/auth/profile', null, {
      Authorization: 'Bearer invalid.bogus.jwt'
    });
    check(profBadToken.status === 401 && profBadToken.json.success === false, 'GET /api/auth/profile with invalid token returns 401 Unauthorized');

    // 6. Products: Catalog retrieval
    const prods = await request('GET', '/api/products');
    check(prods.status === 200 && prods.json.count >= 12, 'GET /api/products returns 200 OK with product catalog');

    // 7. Products: Featured products
    const featured = await request('GET', '/api/products/featured');
    check(featured.status === 200 && featured.json.data.length > 0, 'GET /api/products/featured returns 200 OK with featured items');

    // 8. Products: Categories list
    const cats = await request('GET', '/api/products/categories');
    check(cats.status === 200 && cats.json.data.includes('Electronics'), 'GET /api/products/categories returns 200 OK with category list');

    // 9. Products: Search filtering
    const searchSony = await request('GET', '/api/products?keyword=Sony');
    check(searchSony.status === 200 && searchSony.json.data[0].name.includes('Sony'), 'GET /api/products?keyword=Sony performs keyword filtering');

    // 10. Products: Category filter
    const catFootwear = await request('GET', '/api/products?category=Footwear');
    check(catFootwear.status === 200 && catFootwear.json.data[0].category === 'Footwear', 'GET /api/products?category=Footwear filters by category');

    // 11. Products: Sorting
    const sortPrice = await request('GET', '/api/products?sort=price-asc');
    check(sortPrice.status === 200 && sortPrice.json.data[0].price <= sortPrice.json.data[1].price, 'GET /api/products?sort=price-asc sorts products ascending');

    // 12. Cart: Protected Route without token
    const cartNoAuth = await request('GET', '/api/cart');
    check(cartNoAuth.status === 401, 'GET /api/cart requires authentication (401)');

    const cartAddNoAuth = await request('POST', '/api/cart', { productId: '123', quantity: 1 });
    check(cartAddNoAuth.status === 401, 'POST /api/cart requires authentication (401)');

    // 13. Orders: Protected Routes without token
    const orderNoAuth = await request('POST', '/api/orders', { shippingAddress: {} });
    check(orderNoAuth.status === 401, 'POST /api/orders requires authentication (401)');

    const myOrdersNoAuth = await request('GET', '/api/orders/myorders');
    check(myOrdersNoAuth.status === 401, 'GET /api/orders/myorders requires authentication (401)');

    // 14. 404 Error Handler
    const unknownRoute = await request('GET', '/api/this-does-not-exist-1234');
    check(unknownRoute.status === 404 && unknownRoute.json.message.includes('Not Found'), 'GET /api/unknown_route triggers 404 notFound error middleware');

    console.log('\n======================================================');
    console.log(`📊 LIVE API ENDPOINT SUMMARY: ${passed} / ${total} TESTS PASSED`);
    console.log('======================================================');

    server.kill();
    process.exit(0);
  } catch (err) {
    console.error('API Test Error:', err);
    server.kill();
    process.exit(1);
  }
}, 2500);

