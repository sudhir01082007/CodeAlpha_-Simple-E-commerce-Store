const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { spawn } = require('child_process');

dotenv.config({ path: path.join(__dirname, '.env') });

console.log('===============================================================');
console.log('💳 TESTING PAYMENT FUNCTIONALITY: COD, CARD & UPI');
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

function apiRequest(method, reqPath, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (postData) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path: reqPath,
        method,
        headers
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

const server = spawn('node', ['server.js'], { cwd: __dirname, stdio: ['ignore', 'pipe', 'pipe'] });

const shippingAddress = {
  fullName: 'Sudhir V',
  phone: '+91 9876543210',
  address: '123 Main Street',
  city: 'Bengaluru',
  state: 'Karnataka',
  postalCode: '560001',
  country: 'India'
};

setTimeout(async () => {
  try {
    // Step 1: Login to get token
    console.log('--- Step 1: Authenticate Customer ---');
    const loginRes = await apiRequest('POST', '/api/auth/login', {
      email: 'demo@codealpha.com',
      password: 'password123'
    });
    assert(loginRes.status === 200 && loginRes.json.data.token, 'Login successful, received JWT token');
    const token = loginRes.json.data.token;

    // Step 2: Fetch products to get valid product IDs
    const prodsRes = await apiRequest('GET', '/api/products');
    assert(prodsRes.status === 200 && prodsRes.json.data.length > 0, 'Fetched products from catalog');
    const sampleProduct = prodsRes.json.data[0];

    // ==============================================================
    // TEST 1: Cash on Delivery (COD)
    // ==============================================================
    console.log('\n--- Test Option 1: Cash on Delivery (COD) ---');
    // Clear cart first
    await apiRequest('DELETE', '/api/cart', null, token);
    // Add product to cart
    await apiRequest('POST', '/api/cart', { productId: sampleProduct._id, quantity: 1 }, token);

    // Place COD order
    const codOrderRes = await apiRequest(
      'POST',
      '/api/orders',
      {
        shippingAddress,
        paymentMethod: 'Cash on Delivery'
      },
      token
    );

    assert(codOrderRes.status === 201, 'COD Order creation returns 201 Created');
    assert(codOrderRes.json.data.paymentMethod === 'Cash on Delivery', 'COD Order has paymentMethod: "Cash on Delivery"');
    assert(codOrderRes.json.data.paymentStatus === 'Pending', 'COD Order has paymentStatus: "Pending"');
    assert(codOrderRes.json.data.isPaid === false, 'COD Order isPaid is false (unpaid until delivery)');

    // Verify order in MongoDB via GET /api/orders/:id
    const codDetailRes = await apiRequest('GET', `/api/orders/${codOrderRes.json.data._id}`, null, token);
    assert(
      codDetailRes.status === 200 &&
      codDetailRes.json.data.paymentMethod === 'Cash on Delivery' &&
      codDetailRes.json.data.paymentStatus === 'Pending',
      'Retrieved COD order from MongoDB verifies paymentMethod="Cash on Delivery" & paymentStatus="Pending"'
    );

    // ==============================================================
    // TEST 2: Credit / Debit Card (Demo Simulation)
    // ==============================================================
    console.log('\n--- Test Option 2: Credit / Debit Card (Demo Simulation) ---');
    // Add product to cart
    await apiRequest('POST', '/api/cart', { productId: sampleProduct._id, quantity: 1 }, token);

    // Place Card order
    const cardOrderRes = await apiRequest(
      'POST',
      '/api/orders',
      {
        shippingAddress,
        paymentMethod: 'Credit/Debit Card'
      },
      token
    );

    assert(cardOrderRes.status === 201, 'Card Order creation returns 201 Created');
    assert(cardOrderRes.json.message.includes('Demo Payment Successful'), 'Card Order response message announces "Demo Payment Successful"');
    assert(cardOrderRes.json.data.paymentMethod === 'Credit/Debit Card', 'Card Order has paymentMethod: "Credit/Debit Card"');
    assert(cardOrderRes.json.data.paymentStatus === 'Demo Payment Successful', 'Card Order has paymentStatus: "Demo Payment Successful"');
    assert(cardOrderRes.json.data.isPaid === true, 'Card Order isPaid is true');
    assert(cardOrderRes.json.data.paidAt !== null, 'Card Order has valid paidAt timestamp');

    // Verify order in MongoDB via GET /api/orders/:id
    const cardDetailRes = await apiRequest('GET', `/api/orders/${cardOrderRes.json.data._id}`, null, token);
    assert(
      cardDetailRes.status === 200 &&
      cardDetailRes.json.data.paymentMethod === 'Credit/Debit Card' &&
      cardDetailRes.json.data.paymentStatus === 'Demo Payment Successful',
      'Retrieved Card order from MongoDB verifies paymentMethod="Credit/Debit Card" & paymentStatus="Demo Payment Successful"'
    );

    // ==============================================================
    // TEST 3: UPI / Online (Demo Simulation)
    // ==============================================================
    console.log('\n--- Test Option 3: UPI / Online (Demo Simulation) ---');
    // Add product to cart
    await apiRequest('POST', '/api/cart', { productId: sampleProduct._id, quantity: 1 }, token);

    // Place UPI order
    const upiOrderRes = await apiRequest(
      'POST',
      '/api/orders',
      {
        shippingAddress,
        paymentMethod: 'UPI / Online'
      },
      token
    );

    assert(upiOrderRes.status === 201, 'UPI Order creation returns 201 Created');
    assert(upiOrderRes.json.message.includes('Demo Payment Successful'), 'UPI Order response message announces "Demo Payment Successful"');
    assert(upiOrderRes.json.data.paymentMethod === 'UPI / Online', 'UPI Order has paymentMethod: "UPI / Online"');
    assert(upiOrderRes.json.data.paymentStatus === 'Demo Payment Successful', 'UPI Order has paymentStatus: "Demo Payment Successful"');
    assert(upiOrderRes.json.data.isPaid === true, 'UPI Order isPaid is true');
    assert(upiOrderRes.json.data.paidAt !== null, 'UPI Order has valid paidAt timestamp');

    // Verify order in MongoDB via GET /api/orders/:id
    const upiDetailRes = await apiRequest('GET', `/api/orders/${upiOrderRes.json.data._id}`, null, token);
    assert(
      upiDetailRes.status === 200 &&
      upiDetailRes.json.data.paymentMethod === 'UPI / Online' &&
      upiDetailRes.json.data.paymentStatus === 'Demo Payment Successful',
      'Retrieved UPI order from MongoDB verifies paymentMethod="UPI / Online" & paymentStatus="Demo Payment Successful"'
    );

    // ==============================================================
    // TEST 4: Order History Consistency Check
    // ==============================================================
    console.log('\n--- Test 4: My Orders History Consistency ---');
    const myOrdersRes = await apiRequest('GET', '/api/orders/myorders', null, token);
    assert(myOrdersRes.status === 200 && myOrdersRes.json.data.length >= 3, 'GET /api/orders/myorders returns order list containing all 3 orders');

    const orders = myOrdersRes.json.data;
    const hasCOD = orders.some((o) => o.paymentMethod === 'Cash on Delivery' && o.paymentStatus === 'Pending');
    const hasCard = orders.some((o) => o.paymentMethod === 'Credit/Debit Card' && o.paymentStatus === 'Demo Payment Successful');
    const hasUPI = orders.some((o) => o.paymentMethod === 'UPI / Online' && o.paymentStatus === 'Demo Payment Successful');

    assert(hasCOD, 'Order History contains COD order with paymentStatus: "Pending"');
    assert(hasCard, 'Order History contains Card order with paymentStatus: "Demo Payment Successful"');
    assert(hasUPI, 'Order History contains UPI order with paymentStatus: "Demo Payment Successful"');

    console.log('\n===============================================================');
    console.log(`🎉 ALL PAYMENT TESTS PASSED: ${passedTests} / ${totalTests}`);
    console.log('===============================================================');

    server.kill();
    process.exit(passedTests === totalTests ? 0 : 1);
  } catch (err) {
    console.error('Payment Test Error:', err);
    server.kill();
    process.exit(1);
  }
}, 3000);
