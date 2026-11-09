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
  
  // Safely extract username and mask password
  const userMatch = uri.match(/\/\/([^:]+):/);
  const username = userMatch ? userMatch[1] : 'N/A';
  const maskedURI = uri.includes('@')
    ? uri.replace(/\/\/[^@]+@/, `//${username}:***@`)
    : uri;
  console.log(`  ✓ process.env.MONGODB_URI is configured`);
  console.log(`  ✓ Database Username: "${username}"`);
  console.log(`  ✓ Connection URI Target: ${maskedURI}`);
  const targetDb = uri.includes('/') ? uri.split('/').pop().split('?')[0] : 'default';
  console.log(`  ✓ Target Database: "${targetDb}"`);

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

