const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { db } = require('../db/database');
const { isValidEmail, isValidPassword } = require('../utils/validators');
const logger = require('../utils/logger');

// Register new user
router.post('/register', (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;
    
    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.message });
    }
    
    // Check if username or email already exists
    const existingUser = db.prepare(`
      SELECT user_id FROM users 
      WHERE username = ? OR email = ?
    `).get(username, email);
    
    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    
    // Hash password
    const saltRounds = 10;
    const passwordHash = bcrypt.hashSync(password, saltRounds);
    
    // Create user
    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, first_name, last_name)
      VALUES (?, ?, ?, ?, ?)
    `).run(username, email, passwordHash, firstName || null, lastName || null);
    
    // Set session
    req.session.userId = result.lastInsertRowid;
    
    // Associate any existing cart with the new user
    if (req.session.id) {
      db.prepare(`
        UPDATE carts 
        SET user_id = ? 
        WHERE session_id = ? AND user_id IS NULL
      `).run(req.session.userId, req.session.id);
    }
    
    res.status(201).json({
      success: true,
      userId: result.lastInsertRowid,
      username
    });
  } catch (error) {
    logger.error('Error registering user', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Find user
    const user = db.prepare(`
      SELECT user_id, username, password_hash, role
      FROM users 
      WHERE username = ? OR email = ?
    `).get(username, username);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Check password
    const passwordMatch = bcrypt.compareSync(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Update last login
    db.prepare(`
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(user.user_id);
    
    // Set session
    req.session.userId = user.user_id;
    req.session.role = user.role;
    
    // Associate any existing cart with the user
    if (req.session.id) {
      db.prepare(`
        UPDATE carts 
        SET user_id = ? 
        WHERE session_id = ? AND user_id IS NULL
      `).run(user.user_id, req.session.id);
    }
    
    res.json({
      success: true,
      userId: user.user_id,
      username: user.username,
      role: user.role
    });
  } catch (error) {
    logger.error('Error logging in', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error('Error destroying session', err);
      return res.status(500).json({ error: 'Failed to log out' });
    }
    
    res.json({ success: true });
  });
});

// Check if user is authenticated
router.get('/check', (req, res) => {
  if (req.session && req.session.userId) {
    // Get user information
    const user = db.prepare(`
      SELECT user_id, username, email, first_name, last_name, role
      FROM users 
      WHERE user_id = ?
    `).get(req.session.userId);
    
    if (user) {
      // Don't return sensitive information
      delete user.password_hash;
      
      return res.json({
        authenticated: true,
        user
      });
    }
  }
  
  res.json({ authenticated: false });
});

module.exports = router;
