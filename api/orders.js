const express = require('express');
const router = express.Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');

// Apply auth middleware to all order routes
router.use(authMiddleware);

// Get user's orders
router.get('/', (req, res) => {
  try {
    const userId = req.session.userId;
    
    const orders = db.prepare(`
      SELECT order_id, status, total_amount, discount_amount, created_at
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);
    
    res.json(orders);
  } catch (error) {
    logger.error('Error fetching orders', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get single order details
router.get('/:orderId', (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.session.userId;
    
    // Get order
    const order = db.prepare(`
      SELECT * FROM orders
      WHERE order_id = ? AND user_id = ?
    `).get(orderId, userId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Get order items
    const orderItems = db.prepare(`
      SELECT oi.*, p.name, p.description, pi.image_path
      FROM order_items oi
      JOIN products p ON oi.product_id = p.product_id
      LEFT JOIN product_images pi ON p.product_id = pi.product_id AND pi.is_primary = 1
      WHERE oi.order_id = ?
    `).all(orderId);
    
    res.json({
      ...order,
      items: orderItems
    });
  } catch (error) {
    logger.error('Error fetching order details', error);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

module.exports = router;
