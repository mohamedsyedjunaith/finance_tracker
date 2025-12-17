'use strict';

const { Schema, model, Types } = require('mongoose');

const IncomeSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    source: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    notes: { type: String, default: '', trim: true }
  },
  { timestamps: true, collection: 'incomes' }
);

module.exports = model('Income', IncomeSchema);


