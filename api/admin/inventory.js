const express = require('express');
const router = express.Router();
const { db } = require('../../db/database');
const { isValidProduct } = require('../../utils/validators');
const logger = require('../../utils/logger');

// Get all products for inventory management
router.get('/products', (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'product_id', direction = 'desc', category, stockFilter, search } = req.query;

    // Parse page and limit as integers
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;

    // Build WHERE clause
    let whereClause = '1=1';
    const params = [];

    if (category) {
      whereClause += ' AND p.category_id = ?';
      params.push(category);
    }

    if (stockFilter === 'low') {
      whereClause += ' AND p.stock_quantity <= p.low_stock_threshold';
    } else if (stockFilter === 'ok') {
      whereClause += ' AND p.stock_quantity > p.low_stock_threshold';
    }

    if (search) {
      whereClause += ' AND (p.name LIKE ? OR c.name LIKE ?)';
      params.push(`%${search}%`);
      params.push(`%${search}%`);
    }

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE ${whereClause}
    `;

    const countResult = db.prepare(countQuery).get(...params);
    const total = countResult ? countResult.total : 0;

    // Validate and sanitize the sort field
    const validSortFields = ['product_id', 'name', 'stock_quantity', 'price', 'category_name'];
    const sanitizedSortField = validSortFields.includes(sort) ? sort : 'product_id';

    // Determine table prefix for the sort field
    const tablePrefix = sanitizedSortField === 'category_name' ? 'c' : 'p';

    // Validate sort direction
    const sanitizedDirection = direction.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Main query for fetching data with ORDER BY and pagination
    const mainQuery = `
      SELECT p.*, c.name as category_name,
             (SELECT COUNT(*) FROM order_items oi WHERE oi.product_id = p.product_id) as total_sold
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE ${whereClause}
      ORDER BY ${tablePrefix}.${sanitizedSortField} ${sanitizedDirection}
      LIMIT ? OFFSET ?
    `;

    // Add limit and offset params for the main query
    const mainParams = [...params, limitNum, (pageNum - 1) * limitNum];

    // Execute main query
    const products = db.prepare(mainQuery).all(...mainParams);

    // Calculate total pages
    const totalPages = Math.max(1, Math.ceil(total / limitNum));

    res.json({
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    logger.error('Error fetching inventory products', error);
    res.status(500).json({ error: 'Failed to fetch inventory products' });
  }
});

// Get low stock products
router.get('/low-stock', (req, res) => {
  try {
    const lowStockProducts = db.prepare(`
      SELECT product_id, name, stock_quantity, low_stock_threshold
      FROM products
      WHERE stock_quantity <= low_stock_threshold
      ORDER BY stock_quantity ASC
    `).all();

    res.json(lowStockProducts);
  } catch (error) {
    logger.error('Error fetching low stock products', error);
    res.status(500).json({ error: 'Failed to fetch low stock products' });
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