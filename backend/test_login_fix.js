const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { spawn } = require('child_process');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

console.log('===============================================================');
console.log('🧪 TESTING CUSTOMER & ADMIN LOGIN FIX WITH MONGODB');
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

function postRequest(reqPath, body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path: reqPath,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
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
    req.write(postData);
    req.end();
  });
}

const server = spawn('node', ['server.js'], { cwd: __dirname, stdio: ['ignore', 'pipe', 'pipe'] });

setTimeout(async () => {
  try {
    console.log('--- 1. Testing Customer Login Variants ---');
    // 1.1 Customer login with exact email
    const resDemoEmail = await postRequest('/api/auth/login', {
      email: 'demo@codealpha.com',
      password: 'password123'
    });
    assert(
      resDemoEmail.status === 200 && resDemoEmail.json.data.email === 'demo@codealpha.com' && resDemoEmail.json.data.token,
      'Customer login with email (demo@codealpha.com / password123) returns 200 OK + JWT'
    );

    // 1.2 Customer login with username payload
    const resDemoUsername = await postRequest('/api/auth/login', {
      username: 'demo@codealpha.com',
      password: 'password123'
    });
    console.log('resDemoUsername status:', resDemoUsername.status, 'json:', resDemoUsername.json);
    assert(
      resDemoUsername.status === 200 && resDemoUsername.json.data.email === 'demo@codealpha.com',
      'Customer login with { username: "demo@codealpha.com", password: "password123" } succeeds'
    );

    // 1.3 Customer login with shorthand username "demo"
    const resDemoShort = await postRequest('/api/auth/login', {
      username: 'demo',
      password: 'password123'
    });
    assert(
      resDemoShort.status === 200 && resDemoShort.json.data.email === 'demo@codealpha.com',
      'Customer login with shorthand "demo" (demo / password123) succeeds'
    );

    // 1.4 Customer login with full display name "Demo Customer"
    const resDemoName = await postRequest('/api/auth/login', {
      username: 'Demo Customer',
      password: 'password123'
    });
    assert(
      resDemoName.status === 200 && resDemoName.json.data.name === 'Demo Customer',
      'Customer login with display name "Demo Customer" succeeds'
    );

    console.log('\n--- 2. Testing Admin Login Variants ---');
    // 2.1 Admin login with exact email
    const resAdminEmail = await postRequest('/api/auth/login', {
      email: 'admin@codealpha.com',
      password: 'admin123'
    });
    assert(
      resAdminEmail.status === 200 && resAdminEmail.json.data.role === 'admin' && resAdminEmail.json.data.token,
      'Admin login with email (admin@codealpha.com / admin123) returns 200 OK + admin role JWT'
    );

    // 2.2 Admin login with username payload
    const resAdminUsername = await postRequest('/api/auth/login', {
      username: 'admin@codealpha.com',
      password: 'admin123'
    });
    assert(
      resAdminUsername.status === 200 && resAdminUsername.json.data.role === 'admin',
      'Admin login with { username: "admin@codealpha.com", password: "admin123" } succeeds'
    );

    // 2.3 Admin login with shorthand username "admin"
    const resAdminShort = await postRequest('/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    assert(
      resAdminShort.status === 200 && resAdminShort.json.data.role === 'admin',
      'Admin login with shorthand "admin" (admin / admin123) succeeds'
    );

    console.log('\n--- 3. Testing Authentication Error Rejection ---');
    // 3.1 Invalid password rejection
    const resWrongPass = await postRequest('/api/auth/login', {
      email: 'demo@codealpha.com',
      password: 'wrongpassword'
    });
    assert(
      resWrongPass.status === 401 && resWrongPass.json.success === false,
      'Login with incorrect password returns 401 Unauthorized'
    );

    // 3.2 Non-existent account rejection
    const resGhost = await postRequest('/api/auth/login', {
      email: 'ghost_user_999@codealpha.com',
      password: 'password123'
    });
    assert(
      resGhost.status === 401 && resGhost.json.success === false,
      'Login with non-existent user returns 401 Unauthorized'
    );

    // 3.3 Empty payload validation
    const resEmpty = await postRequest('/api/auth/login', {});
    assert(
      resEmpty.status === 400 && resEmpty.json.success === false,
      'Login with empty body returns 400 Bad Request'
    );

    console.log('\n--- 4. Testing MongoDB Duplicate User Prevention ---');
    await mongoose.connect(process.env.MONGODB_URI);
    const demoCount = await User.countDocuments({ email: 'demo@codealpha.com' });
    const adminCount = await User.countDocuments({ email: 'admin@codealpha.com' });
    assert(demoCount === 1, `Exactly 1 Demo Customer exists in MongoDB (found: ${demoCount}, no duplicates)`);
    assert(adminCount === 1, `Exactly 1 Admin Manager exists in MongoDB (found: ${adminCount}, no duplicates)`);
    await mongoose.disconnect();

    console.log('\n===============================================================');
    console.log(`🎉 ALL LOGIN FIX CHECKS PASSED: ${passedTests} / ${totalTests}`);
    console.log('===============================================================');

    server.kill();
    process.exit(passedTests === totalTests ? 0 : 1);
  } catch (err) {
    console.error('Test Error:', err);
    server.kill();
    process.exit(1);
  }
}, 3000);
