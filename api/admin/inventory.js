const express = require('express');
const router = express.Router();
const { db } = require('../../db/database');
const { isValidProduct } = require('../../utils/validators');
const logger = require('../../utils/logger');

// Get all products for inventory management
router.get('/products', (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.*, c.name as category_name,
             (SELECT COUNT(*) FROM order_items oi WHERE oi.product_id = p.product_id) as total_sold
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      ORDER BY p.product_id DESC
    `).all();
    
    res.json(products);
  } catch (error) {
    logger.error('Error fetching inventory products', error);
    res.status(500).json({ error: 'Failed to fetch inventory products' });
  }
});

// Update product stock
router.put('/products/:id/stock', (req, res) => {
  try {
    const { id } = req.params;
    const { stock_quantity, reason } = req.body;
    const adminId = req.session.userId;
    
    // Validate stock quantity
    if (!Number.isInteger(stock_quantity) || stock_quantity < 0) {
      return res.status(400).json({ error: 'Invalid stock quantity' });
    }
    
    // Get current stock
    const currentProduct = db.prepare('SELECT stock_quantity FROM products WHERE product_id = ?').get(id);
    if (!currentProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const quantityChange = stock_quantity - currentProduct.stock_quantity;
    
    // Begin transaction
    db.exec('BEGIN TRANSACTION');
    
    try {
      // Update stock
      db.prepare('UPDATE products SET stock_quantity = ? WHERE product_id = ?').run(stock_quantity, id);
      
      // Log inventory change
      db.prepare(`
        INSERT INTO inventory_log (product_id, quantity_change, reason, admin_user_id)
        VALUES (?, ?, ?, ?)
      `).run(id, quantityChange, reason || 'manual_adjustment', adminId);
      
      db.exec('COMMIT');
      res.json({ success: true });
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('Error updating stock', error);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// Get inventory log
router.get('/log', (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    const logs = db.prepare(`
      SELECT il.*, p.name as product_name, u.username as admin_username
      FROM inventory_log il
      JOIN products p ON il.product_id = p.product_id
      LEFT JOIN users u ON il.admin_user_id = u.user_id
      ORDER BY il.timestamp DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
    
    const total = db.prepare('SELECT COUNT(*) as count FROM inventory_log').get().count;
    
    res.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    logger.error('Error fetching inventory log', error);
    res.status(500).json({ error: 'Failed to fetch inventory log' });
  }
});

module.exports = router;