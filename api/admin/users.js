const express = require('express');
const router = express.Router();
const { db } = require('../../db/database');
const logger = require('../../utils/logger');

// Get all users
router.get('/', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT user_id, username, email, first_name, last_name, role, created_at, last_login
      FROM users
      ORDER BY created_at DESC
    `).all();
    
    res.json(users);
  } catch (error) {
    logger.error('Error fetching users', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user role
router.put('/:id/role', (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!['customer', 'manager', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    const result = db.prepare('UPDATE users SET role = ? WHERE user_id = ?').run(role, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating user role', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

module.exports = router;