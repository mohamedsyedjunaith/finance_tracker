'use strict';

const { Schema, model, Types } = require('mongoose');

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    monthlyIncome: { type: Number, required: false, default: 0 },
    budgetGoals: [{ type: Types.ObjectId, ref: 'BudgetGoal' }],
    incomes: [{ type: Types.ObjectId, ref: 'Income' }],
    transactions: [{ type: Types.ObjectId, ref: 'Transaction' }]
  },
  { timestamps: true, collection: 'users' }
);

module.exports = model('User', UserSchema);

