'use strict';

const { Schema, model, Types } = require('mongoose');

const BudgetGoalSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true },
    category: { type: String, required: true, trim: true },
    goalAmount: { type: Number, required: true },
    currentSpent: { type: Number, required: true, default: 0 },
    deadline: { type: Date, required: true }
  },
  { timestamps: true, collection: 'budget_goals' }
);

module.exports = model('BudgetGoal', BudgetGoalSchema);

