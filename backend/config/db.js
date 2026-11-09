const mongoose = require('mongoose');
const ensureDefaultUsers = require('./ensureDefaultUsers');

/**
 * MongoDB Database Connection Manager
 * Connects via Mongoose using the connection URI from environment variables.
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
    console.error(`❌ MongoDB Connection Failed: ${error.message}`);
    console.log(`💡 Setup Note:`);
    console.log(`   - If running locally: Ensure MongoDB Community Server service is started.`);
    console.log(`   - If using MongoDB Atlas: Set MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/codealpha_ecommerce in backend/.env`);
    return null;
  }
};

module.exports = connectDB;
