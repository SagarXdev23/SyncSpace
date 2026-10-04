/**
 * MongoDB connection setup (Mongoose).
 * The server boots even when MongoDB is unreachable — the failure is logged
 * and `connectDB()` resolves to null instead of throwing.
 */
const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('[db] MONGODB_URI not set — skipping MongoDB connection');
    return null;
  }
  try {
    const conn = await mongoose.connect(uri);
    console.log(`[db] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error(`[db] MongoDB connection failed: ${err.message}`);
    return null;
  }
}

module.exports = { connectDB };
