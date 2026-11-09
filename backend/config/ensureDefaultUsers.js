const User = require('../models/User');
const Product = require('../models/Product');
const products = require('../data/productsData');

/**
 * Ensures demo customer and admin users exist in MongoDB with correct bcrypt hashes.
 * Guarantees no duplicate users are created.
 */
const ensureDefaultUsers = async () => {
  try {
    // 1. Ensure Customer Demo Account exists with verified bcrypt hash
    let demoUser = await User.findOne({ email: 'demo@codealpha.com' }).select('+password');
    if (!demoUser) {
      demoUser = await User.create({
        name: 'Demo Customer',
        email: 'demo@codealpha.com',
        password: 'password123',
        role: 'user'
      });
      console.log('  ✓ Seeded default Demo Customer: demo@codealpha.com (password123)');
    } else {
      const isMatch = await demoUser.matchPassword('password123');
      if (!isMatch) {
        demoUser.password = 'password123';
        await demoUser.save();
        console.log('  ✓ Re-synchronized Demo Customer password to "password123"');
      }
    }

    // 2. Ensure Admin Manager Account exists with verified bcrypt hash
    let adminUser = await User.findOne({ email: 'admin@codealpha.com' }).select('+password');
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Admin Manager',
        email: 'admin@codealpha.com',
        password: 'admin123',
        role: 'admin'
      });
      console.log('  ✓ Seeded default Admin Manager: admin@codealpha.com (admin123)');
    } else {
      const isMatch = await adminUser.matchPassword('admin123');
      if (!isMatch) {
        adminUser.password = 'admin123';
        await adminUser.save();
        console.log('  ✓ Re-synchronized Admin Manager password to "admin123"');
      }
    }

    // 3. Ensure Products Catalog is populated
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      await Product.insertMany(products);
      console.log(`  ✓ Seeded ${products.length} catalog products`);
    }
  } catch (error) {
    console.error('⚠️ Note on ensureDefaultUsers:', error.message);
  }
};

module.exports = ensureDefaultUsers;

