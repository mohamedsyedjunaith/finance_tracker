'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const router = express.Router();

const User = require('../models/User');
const { BudgetGoal, Transaction, Income } = require('../models');
const authenticate = require('../middleware/auth');

const SALT_ROUNDS = 10;

router.post('/signup', async (req, res) => {
  try {
    const { username, name, email, password, income, budgetGoals, transactions } = req.body;

    // Detailed validation messages
    const missing = [];
    if (!username) missing.push('username');
    if (!name) missing.push('name');
    if (!email) missing.push('email');
    if (!password) missing.push('password');
    if (missing.length) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Signup validation failed. Missing:', missing, 'Body:', req.body);
      }
      return res.status(400).json({ message: 'Missing required fields', missing });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const [existingByEmail, existingByUsername] = await Promise.all([
      User.findOne({ email: email.toLowerCase().trim() }).lean(),
      User.findOne({ username: username.toLowerCase().trim() }).lean()
    ]);
    if (existingByEmail) return res.status(409).json({ message: 'Email already in use' });
    if (existingByUsername) return res.status(409).json({ message: 'Username already in use' });

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      username: username.toLowerCase().trim(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: passwordHash,
      monthlyIncome: income && typeof income.amount === 'number' ? Number(income.amount) : 0
    });

    // Optionally seed initial user-linked data
    const createdIds = { goals: [], incomes: [], transactions: [] };
    if (Array.isArray(budgetGoals) && budgetGoals.length > 0) {
      const goals = await BudgetGoal.insertMany(
        budgetGoals.map((g) => ({
          user: user._id,
          category: String(g.category || '').trim(),
          goalAmount: Number(g.goalAmount || 0),
          currentSpent: Number(g.currentSpent || 0),
          deadline: g.deadline ? new Date(g.deadline) : new Date()
        }))
      );
      createdIds.goals = goals.map((g) => g._id);
    }

    if (income && (typeof income.amount === 'number' || Array.isArray(income))) {
      const incomesInput = Array.isArray(income) ? income : [income];
      const incomes = await Income.insertMany(
        incomesInput.map((inc) => ({
          user: user._id,
          amount: Number(inc.amount || 0),
          source: String(inc.source || 'Income'),
          date: inc.date ? new Date(inc.date) : new Date(),
          notes: String(inc.notes || '')
        }))
      );
      createdIds.incomes = incomes.map((i) => i._id);
    }

    if (Array.isArray(transactions) && transactions.length > 0) {
      const txs = await Transaction.insertMany(
        transactions.map((t) => ({
          user: user._id,
          amount: Number(t.amount || 0),
          category: String(t.category || 'Other'),
          type: t.type === 'income' ? 'income' : 'expense',
          date: t.date ? new Date(t.date) : new Date(),
          notes: String(t.notes || '')
        }))
      );
      createdIds.transactions = txs.map((t) => t._id);
    }

    // Update user with created references (optional)
    if (createdIds.goals.length || createdIds.incomes.length || createdIds.transactions.length) {
      await User.findByIdAndUpdate(user._id, {
        $push: {
          budgetGoals: { $each: createdIds.goals },
          incomes: { $each: createdIds.incomes },
          transactions: { $each: createdIds.transactions }
        }
      });
    }

    return res.status(201).json({ message: 'User created successfully', userId: user._id });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'User already exists' });
    }
    if (process.env.NODE_ENV !== 'production') {
      console.error('Signup error:', err);
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Login validation failed. Body:', req.body);
      }
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ message: 'JWT secret not configured' });
    }

    const token = jwt.sign({ id: user._id.toString(), username: user.username }, secret, { expiresIn: '7d' });

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        monthlyIncome: user.monthlyIncome || 0
      }
    });
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Login error:', err);
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Protected route example to get current user profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const me = await User.findById(req.user.id)
      .select('-password')
      .populate('budgetGoals')
      .populate('transactions')
      .populate('incomes')
      .lean();
    if (!me) return res.status(404).json({ message: 'User not found' });
    return res.json(me);
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Logout (for JWT, client should discard token; optionally support cookie)
router.post('/logout', (req, res) => {
  // If tokens are stored in HTTP-only cookies, clear them here
  res.clearCookie('token');
  return res.json({ message: 'Logged out' });
});

module.exports = router;

