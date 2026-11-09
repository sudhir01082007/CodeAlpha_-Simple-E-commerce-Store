const dotenv = require('dotenv');
const connectDB = require('./config/db');
const Product = require('./models/Product');
const User = require('./models/User');
const Cart = require('./models/Cart');
const Order = require('./models/Order');
const products = require('./data/productsData');

dotenv.config();

const importData = async () => {
  try {
    const conn = await connectDB();
    if (!conn) {
      console.error('❌ Cannot seed data: MongoDB connection failed.');
      process.exit(1);
    }

    console.log('🔄 Cleaning up existing database collections to prevent duplicates...');
    await Order.deleteMany();
    await Cart.deleteMany();
    await Product.deleteMany();
    await User.deleteMany();

    console.log('👤 Seeding demo accounts with bcrypt password hashing...');
    const demoUser = await User.create({
      name: 'Demo Customer',
      email: 'demo@codealpha.com',
      password: 'password123',
      role: 'user'
    });

    const adminUser = await User.create({
      name: 'Admin Manager',
      email: 'admin@codealpha.com',
      password: 'admin123',
      role: 'admin'
    });

    // Verification of bcrypt hashing
    const isDemoPassHashed = demoUser.password !== 'password123';
    const isDemoPassValid = await demoUser.matchPassword('password123');

    console.log(`  ✓ Demo Customer created: ${demoUser.email} (Bcrypt Hashed: ${isDemoPassHashed}, Validates: ${isDemoPassValid})`);
    console.log(`  ✓ Admin Manager created: ${adminUser.email} (Role: ${adminUser.role})`);

    console.log('🛍️ Seeding 12 sample e-commerce products across 5 categories...');
    const createdProducts = await Product.insertMany(products);
    console.log(`  ✓ Successfully imported ${createdProducts.length} products into MongoDB!`);

    console.log('✅ Database Seeding Completed Successfully! Safe to run multiple times without duplicates.');
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error with seeding data: ${error.message}`);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    const conn = await connectDB();
    if (!conn) {
      console.error('❌ Cannot destroy data: MongoDB connection failed.');
      process.exit(1);
    }

    await Order.deleteMany();
    await Cart.deleteMany();
    await Product.deleteMany();
    await User.deleteMany();

    console.log('🗑️ All data successfully purged from database!');
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error destroying data: ${error.message}`);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}
