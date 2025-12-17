'use strict';

const express = require('express');
const router = express.Router();

const authenticate = require('../middleware/auth');
const { BudgetGoal, Transaction, Income, User } = require('../models');

// Get all personal finance data
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const [user, goals, transactions, incomes] = await Promise.all([
      User.findById(req.user.id).select('-password').lean(),
      BudgetGoal.find({ user: req.user.id }).lean(),
      Transaction.find({ user: req.user.id }).lean(),
      Income.find({ user: req.user.id }).lean()
    ]);

    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.json({ user, goals, transactions, incomes });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Create budget goal
router.post('/goals', authenticate, async (req, res) => {
  try {
    const created = await BudgetGoal.create({ ...req.body, user: req.user.id });
    return res.status(201).json(created);
  } catch (err) {
    return res.status(400).json({ message: 'Invalid goal data' });
  }
});

// Create transaction (income or expense)
router.post('/transactions', authenticate, async (req, res) => {
  try {
    const created = await Transaction.create({ ...req.body, user: req.user.id });
    return res.status(201).json(created);
  } catch (err) {
    return res.status(400).json({ message: 'Invalid transaction data' });
  }
});

// Create income entry
router.post('/incomes', authenticate, async (req, res) => {
  try {
    const created = await Income.create({ ...req.body, user: req.user.id });
    return res.status(201).json(created);
  } catch (err) {
    return res.status(400).json({ message: 'Invalid income data' });
  }
});

module.exports = router;


