'use strict';

const jwt = require('jsonwebtoken');

// Verifies JWT from Authorization header: "Bearer <token>"
module.exports = function authenticate(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Authorization token missing' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ message: 'JWT secret not configured' });
    }

    const payload = jwt.verify(token, secret);
    req.user = { id: payload.id, username: payload.username };
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};


