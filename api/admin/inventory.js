const express = require('express');
const router = express.Router();
const { db } = require('../../db/database');
const logger = require('../../utils/logger');

// Get all products with stock information
router.get('/products', (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      ORDER BY p.stock_quantity ASC, p.name ASC
    `).all();

    res.json(products);
  } catch (error) {
    logger.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// Update product stock
router.put('/products/:productId', (req, res) => {
  try {
    const { productId } = req.params;
    const { stock_quantity, low_stock_threshold, price } = req.body;
    const adminId = req.session.userId;

    // Update product
    const result = db.prepare(`
      UPDATE products 
      SET stock_quantity = ?, low_stock_threshold = ?, price = ?
      WHERE product_id = ?
    `).run(stock_quantity, low_stock_threshold, price, productId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Log inventory change
    db.prepare(`
      INSERT INTO inventory_log (
        product_id, quantity_change, reason, admin_user_id
      ) VALUES (?, ?, ?, ?)
    `).run(productId, stock_quantity, 'adjustment', adminId);

    // Log admin action
    db.prepare(`
      INSERT INTO admin_log (
        admin_id, action_type, action_details, ip_address
      ) VALUES (?, ?, ?, ?)
    `).run(adminId, 'product_edit', `Updated product ${productId}`, req.ip);

    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Get low stock products
router.get('/low-stock', (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE p.stock_quantity <= p.low_stock_threshold
      ORDER BY p.stock_quantity ASC
    `).all();

    res.json(products);
  } catch (error) {
    logger.error('Error fetching low stock products:', error);
    res.status(500).json({ error: 'Failed to fetch low stock products' });
  }
});

// Bulk update stock
router.post('/bulk-update', (req, res) => {
  try {
    const { updates } = req.body;
    const adminId = req.session.userId;

    db.exec('BEGIN TRANSACTION');

    const updateStmt = db.prepare(`
      UPDATE products 
      SET stock_quantity = ? 
      WHERE product_id = ?
    `);

    const logStmt = db.prepare(`
      INSERT INTO inventory_log (
        product_id, quantity_change, reason, admin_user_id
      ) VALUES (?, ?, ?, ?)
    `);

    updates.forEach(({ product_id, stock_quantity }) => {
      updateStmt.run(stock_quantity, product_id);
      logStmt.run(product_id, stock_quantity, 'bulk_adjustment', adminId);
    });

    // Log admin action
    db.prepare(`
      INSERT INTO admin_log (
        admin_id, action_type, action_details, ip_address
      ) VALUES (?, ?, ?, ?)
    `).run(adminId, 'bulk_stock_update', `Updated ${updates.length} products`, req.ip);

    db.exec('COMMIT');
    res.json({ success: true });
  } catch (error) {
    db.exec('ROLLBACK');
    logger.error('Error bulk updating inventory:', error);
    res.status(500).json({ error: 'Failed to bulk update inventory' });
  }
});

module.exports = router;