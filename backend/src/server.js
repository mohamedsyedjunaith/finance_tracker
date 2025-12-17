'use strict';

const path = require('path');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI not found. Please check your .env file.');
  process.exit(1);
}

// Ensure JWT_SECRET exists; if missing, generate a temporary one so the server can run
if (!process.env.JWT_SECRET) {
  try {
    const crypto = require('crypto');
    const generated = crypto.randomBytes(64).toString('hex');
    process.env.JWT_SECRET = generated;
    console.warn('⚠️  JWT_SECRET was not set. A temporary secret was generated for this session.');
    console.warn('   Add JWT_SECRET to backend .env to persist it across restarts.');
  } catch (e) {
    console.error('❌ Failed to initialize JWT secret:', e.message);
    process.exit(1);
  }
}

const { connectToDatabase } = require('./config/db');
const models = require('./models');

const app = express();

// ===================
// Middleware
// ===================
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// ✅ Disable caching for all API responses
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// ✅ Prevent favicon.ico 404 spam
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ===================
// Routes
// ===================
app.get('/', (req, res) => {
  res.json({
    name: 'SpendSmart API',
    status: 'ok',
    endpoints: ['/health', '/auth', '/models']
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', database: 'connected' });
});

app.use('/auth', require('./routes/auth'));
app.use('/user', require('./routes/user'));

app.get('/models', (req, res) => {
  res.json({ models: Object.keys(models) });
});

// ===================
// Error Handling
// ===================
app.use((err, req, res, next) => {
  console.error('🔥 Server error:', err.stack);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

// ===================
// Start Server
// ===================
const port = process.env.PORT || 4000;

connectToDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`✅ Connected to MongoDB`);
      console.log(`🚀 Server listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('❌ Failed to start server due to DB connection error:', error.message);
    process.exit(1);
  });

process.on('SIGINT', () => {
  console.log('🛑 Shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
