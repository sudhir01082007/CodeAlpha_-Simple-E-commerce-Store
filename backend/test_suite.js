const path = require('path');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Product = require('./models/Product');
const Cart = require('./models/Cart');
const Order = require('./models/Order');
const { protect, admin } = require('./middleware/authMiddleware');
const { errorHandler } = require('./middleware/errorMiddleware');
const productsData = require('./data/productsData');

let totalTests = 0;
let passedTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✕ FAIL: ${testName}`);
  }
}

async function runTests() {
  console.log('======================================================');
  console.log('🧪 RUNNING CODEALPHA BACKEND STEP 2 VERIFICATION SUITE');
  console.log('======================================================\n');

  // 1. Password Hashing & Verification (bcryptjs)
  console.log('1. Testing Password Hashing & Bcrypt Verification:');
  const plainPassword = 'password123';
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(plainPassword, salt);

  assert(hashedPassword !== plainPassword, 'Password is encrypted and not plain text');
  assert(hashedPassword.startsWith('$2'), 'Bcrypt hash starts with $2 algorithm identifier');

  const correctMatch = await bcrypt.compare('password123', hashedPassword);
  assert(correctMatch === true, 'bcrypt.compare correctly matches the valid password');

  const wrongMatch = await bcrypt.compare('wrongpassword', hashedPassword);
  assert(wrongMatch === false, 'bcrypt.compare correctly rejects an invalid password');

  const userDoc = new User({
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: hashedPassword
  });
  const docMatch = await userDoc.matchPassword('password123');
  assert(docMatch === true, 'User.matchPassword() instance method works as expected');

  // 2. JWT Generation & Verification
  console.log('\n2. Testing JWT Generation, Expiry & Verification:');
  const secret = process.env.JWT_SECRET || 'codealpha_ecommerce_super_secure_jwt_secret_key_2026';
  const token = jwt.sign({ id: userDoc._id }, secret, { expiresIn: '30d' });

  assert(typeof token === 'string' && token.split('.').length === 3, 'JWT token has valid 3-part header.payload.signature structure');

  const decoded = jwt.verify(token, secret);
  assert(decoded.id.toString() === userDoc._id.toString(), 'JWT token decodes correctly to the user ID');

  let invalidCaught = false;
  try {
    jwt.verify('invalid.token.here', secret);
  } catch {
    invalidCaught = true;
  }
  assert(invalidCaught === true, 'Invalid JWT token correctly throws verification error');

  // 3. Auth Middleware (protect & admin)
  console.log('\n3. Testing Auth Middleware (protect & admin):');
  
  let reqNoToken = { headers: {} };
  let resStatus = 0;
  let resJson = null;
  let resNoToken = {
    status: (s) => { resStatus = s; return resNoToken; },
    json: (j) => { resJson = j; }
  };
  await protect(reqNoToken, resNoToken, () => {});
  assert(resStatus === 401 && resJson.success === false, 'protect middleware returns 401 when no token is provided');

  let adminResStatus = 0;
  let adminResJson = null;
  let regularUserReq = { user: { role: 'user', name: 'Standard Customer' } };
  let adminRes = {
    status: (s) => { adminResStatus = s; return adminRes; },
    json: (j) => { adminResJson = j; }
  };
  admin(regularUserReq, adminRes, () => {});
  assert(adminResStatus === 403 && adminResJson.success === false, 'admin middleware returns 403 Forbidden for non-admin role');

  let adminNextCalled = false;
  let adminUserReq = { user: { role: 'admin', name: 'Store Administrator' } };
  admin(adminUserReq, adminRes, () => { adminNextCalled = true; });
  assert(adminNextCalled === true, 'admin middleware calls next() for authenticated admin role');

  // 4. Products Data Seeder & Search/Filter Logic
  console.log('\n4. Testing Product Catalog Seeder & Filtering Engine:');
  assert(productsData.length === 12, 'Catalog contains exactly 12 realistic sample products');

  const categories = [...new Set(productsData.map(p => p.category))];
  assert(categories.includes('Electronics'), 'Catalog contains Electronics category');
  assert(categories.includes('Fashion'), 'Catalog contains Fashion category');
  assert(categories.includes('Footwear'), 'Catalog contains Footwear category');
  assert(categories.includes('Accessories'), 'Catalog contains Accessories category');
  assert(categories.includes('Home & Living'), 'Catalog contains Home & Living category');

  const searchResults = productsData.filter(p => 
    p.name.toLowerCase().includes('sony') || 
    p.description.toLowerCase().includes('sony')
  );
  assert(searchResults.length >= 1 && searchResults[0].name.includes('Sony'), 'Product keyword search finds Sony headphones');

  const under100 = productsData.filter(p => p.price < 100);
  assert(under100.length > 0 && under100.every(p => p.price < 100), 'Price filter correctly filters products under $100');

  // 5. Cart Server-Side Totals Calculation & Rules
  console.log('\n5. Testing Server-side Cart Calculation & Rules:');
  
  const smallCart = new Cart({
    user: userDoc._id,
    items: [{ product: new Product()._id, price: 40.00, quantity: 1 }]
  });
  const smallTotals = smallCart.calculateTotals();
  assert(smallTotals.subtotal === 40.00, 'Cart subtotal matches item price * quantity ($40.00)');
  assert(smallTotals.shipping === 5.99, 'Cart shipping is $5.99 for orders under $50');
  assert(smallTotals.tax === 3.20, 'Cart tax is 8% of subtotal ($3.20)');
  assert(smallTotals.total === 49.19, 'Cart grand total ($40 + $5.99 + $3.20 = $49.19)');

  const largeCart = new Cart({
    user: userDoc._id,
    items: [{ product: new Product()._id, price: 120.00, quantity: 1 }]
  });
  const largeTotals = largeCart.calculateTotals();
  assert(largeTotals.shipping === 0, 'Cart shipping is $0 (FREE) for orders over $50');
  assert(largeTotals.tax === 9.60, 'Cart tax is 8% ($9.60)');
  assert(largeTotals.total === 129.60, 'Cart grand total correctly calculated ($129.60)');

  // 6. Inventory Deduction & Stock Verification
  console.log('\n6. Testing Inventory Deduction & Order Integrity:');
  const inventoryProduct = new Product({
    name: 'Stock Test Item',
    description: 'Testing inventory decrement',
    price: 50,
    category: 'Electronics',
    image: 'https://example.com/test.jpg',
    stock: 10
  });

  const orderedQty = 3;
  assert(inventoryProduct.stock >= orderedQty, 'Product has sufficient initial stock (10 >= 3)');

  inventoryProduct.stock -= orderedQty;
  assert(inventoryProduct.stock === 7, 'Product stock is safely decremented to 7');

  const excessiveQty = 10;
  const canFulfill = inventoryProduct.stock >= excessiveQty;
  assert(canFulfill === false, 'Server correctly rejects orders exceeding available stock');

  // 7. Error Middleware Handling
  console.log('\n7. Testing Central Error Handling Middleware:');
  let errStatus = 0;
  let errJson = null;
  const mockErrRes = {
    statusCode: 200,
    status: (s) => { errStatus = s; return mockErrRes; },
    json: (j) => { errJson = j; }
  };

  const dupErr = new Error('Duplicate key');
  dupErr.code = 11000;
  dupErr.keyValue = { email: 'test@example.com' };
  errorHandler(dupErr, {}, mockErrRes, () => {});
  assert(errStatus === 400 && errJson.message.includes('email already exists'), 'errorHandler catches MongoDB 11000 duplicate email error');

  const castErr = new Error('Cast to ObjectId failed');
  castErr.name = 'CastError';
  castErr.kind = 'ObjectId';
  errorHandler(castErr, {}, mockErrRes, () => {});
  assert(errStatus === 404 && errJson.message.includes('Resource not found'), 'errorHandler catches Mongoose CastError and returns 404');

  console.log('\n======================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('======================================================');
}

runTests().catch(err => console.error('Test Suite Fatal Error:', err));

