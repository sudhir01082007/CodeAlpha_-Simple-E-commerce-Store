const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');

async function testConnection() {
  console.log('===============================================================');
  console.log('🔍 VERIFYING MONGODB CONNECTION USING ENVIRONMENT VARIABLES');
  console.log('===============================================================\n');

  console.log('1. Checking Environment Variable:');
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ FAIL: process.env.MONGODB_URI is undefined or not loaded.');
    process.exit(1);
  }
  
  // Mask connection string to protect credentials
  const maskedURI = uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  console.log(`  ✓ process.env.MONGODB_URI is loaded: "${maskedURI}"`);
  console.log(`  ✓ Target Database: "${uri.split('/').pop().split('?')[0]}"`);

  console.log('\n2. Testing Database Connection via connectDB():');
  const conn = await connectDB();

  if (conn && mongoose.connection.readyState === 1) {
    console.log(`  ✓ Connection Successful!`);
    console.log(`  ✓ Host: ${mongoose.connection.host}`);
    console.log(`  ✓ Database Name: ${mongoose.connection.name}`);
    console.log(`  ✓ Ready State: ${mongoose.connection.readyState} (Connected)`);
  } else {
    console.error(`❌ Connection Failed or Database Not Ready.`);
    process.exit(1);
  }

  await mongoose.disconnect();
  console.log('\n===============================================================');
  console.log('🎉 VERIFICATION COMPLETE: Backend connects cleanly via process.env.MONGODB_URI');
  console.log('===============================================================');
  process.exit(0);
}

testConnection();
