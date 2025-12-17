'use strict';

const mongoose = require('mongoose');

let isConnected = false;

async function connectToDatabase() {
  let mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is not set. Please configure it in your .env file.');
  }

  // Allow selecting/overriding DB name via MONGO_DB_NAME
  // If MONGO_URI has no path/db segment and MONGO_DB_NAME is set, append it.
  try {
    const url = new URL(mongoUri);
    const hasDbInPath = url.pathname && url.pathname !== '/' && url.pathname.length > 1;
    const envDbName = process.env.MONGO_DB_NAME && process.env.MONGO_DB_NAME.trim();
    if (!hasDbInPath && envDbName) {
      url.pathname = `/${envDbName}`;
      mongoUri = url.toString();
      // eslint-disable-next-line no-console
      console.log(`Using database: ${envDbName}`);
    }
  } catch (_) {
    // If URL parsing fails (e.g., mongodb+srv without protocol issues), skip modification
  }

  if (isConnected) {
    return mongoose.connection;
  }

  try {
    mongoose.connection.on('connected', () => {
      isConnected = true;
      // eslint-disable-next-line no-console
      console.log('MongoDB connected');
    });

    mongoose.connection.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      // eslint-disable-next-line no-console
      console.warn('MongoDB disconnected');
    });

    // Close MongoDB connection on app termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      // eslint-disable-next-line no-console
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10
    });

    return mongoose.connection;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to connect to MongoDB:', error.message);
    throw error;
  }
}

module.exports = { connectToDatabase };

