const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

async function check() {
  console.log('Connecting to MongoDB at:', process.env.MONGODB_URI);
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ MongoDB connection successful!');
    
    const users = await User.find({}).select('+password');
    console.log('Total users found in database:', users.length);
    
    for (const u of users) {
      console.log(`\n- User: "${u.name}" | Email: "${u.email}" | Role: "${u.role}"`);
      console.log(`  Password field present: ${!!u.password}`);
      console.log(`  Password hash: ${u.password ? u.password.substring(0, 20) + '...' : 'MISSING'}`);
      
      if (u.email === 'demo@codealpha.com') {
        const matches = await u.matchPassword('password123');
        console.log(`  Verify "password123": ${matches}`);
      }
      if (u.email === 'admin@codealpha.com') {
        const matches = await u.matchPassword('admin123');
        console.log(`  Verify "admin123": ${matches}`);
      }
    }

    if (users.length === 0) {
      console.log('\n⚠️ No users exist in the database! Database has not been seeded.');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  }
}

check();

