const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const ensureDefaultUsers = require('./ensureDefaultUsers');

// Load environment variables from backend/.env if not already loaded
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

/**
 * MongoDB Database Connection Manager
 * Connects via Mongoose using the connection URI from environment variables (process.env.MONGODB_URI).
 * Supports both local MongoDB and cloud MongoDB Atlas instances.
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codealpha_ecommerce';
    const isAtlas = mongoURI.includes('mongodb+srv://') || mongoURI.includes('mongodb.net');

    console.log(`🔌 Attempting MongoDB connection to: ${isAtlas ? 'MongoDB Atlas Cluster (Cloud)' : 'Local MongoDB (127.0.0.1:27017)'}`);

    // Register Mongoose connection event listeners
    mongoose.connection.on('connected', () => {
      console.log(`✅ MongoDB Connection State: CONNECTED [Host: ${mongoose.connection.host}, DB: ${mongoose.connection.name}]`);
    });

    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB Connection Error event: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn(`⚠️ MongoDB disconnected`);
    });

    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000 // Fails fast after 5s instead of hanging indefinitely
    });

    // Ensure demo accounts and initial products are seeded without duplicates
    await ensureDefaultUsers();

    return conn;
  } catch (error) {
    const mongoURI = process.env.MONGODB_URI || '';
    const isAtlas = mongoURI.includes('mongodb+srv://') || mongoURI.includes('mongodb.net');

    console.error(`❌ MongoDB Connection Failed: ${error.message}`);
    if (isAtlas) {
      console.log(`\n💡 MongoDB Atlas Troubleshooting:`);
      if (error.message.includes('auth') || error.message.includes('Authentication')) {
        console.log(`   - Authentication Error: Check the username and password in your MONGODB_URI in backend/.env.`);
        console.log(`   - Note: If your password contains special characters (@, :, /, #, etc.), URL-encode them or use an alphanumeric password.`);
      } else if (error.message.includes('timed out') || error.message.includes('selection')) {
        console.log(`   - Network / IP Whitelist Error: Your IP may not be allowed in MongoDB Atlas.`);
        console.log(`     Go to Atlas Dashboard -> "Network Access" -> Click "Add IP Address" -> Select "Allow Access from Anywhere" (0.0.0.0/0).`);
      } else {
        console.log(`   - Ensure your connection string format is: mongodb+srv://<username>:<password>@<cluster>.mongodb.net/codealpha_ecommerce?retryWrites=true&w=majority`);
      }
    } else {
      console.log(`💡 Local MongoDB Note: Ensure your local MongoDB Community Server service is running.`);
    }
    return null;
  }
};

module.exports = connectDB;
