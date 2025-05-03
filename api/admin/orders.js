const express = require('express');
const router = express.Router();
const { db } = require('../../db/database');
const logger = require('../../utils/logger');

// Get all orders with user and product details
router.get('/', (req, res) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT o.*, u.username, u.email,
             (SELECT COUNT(*) FROM order_items WHERE order_id = o.order_id) as item_count
      FROM orders o
      JOIN users u ON o.user_id = u.user_id
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }

    if (startDate) {
      query += ' AND DATE(o.created_at) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND DATE(o.created_at) <= ?';
      params.push(endDate);
    }

    // Clone the query for counting before adding ORDER BY and LIMIT
    let countQuery = query;

    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    // Execute main query
    const orders = db.prepare(query).all(...params);

    // Get total count
    countQuery = countQuery.replace(
      'SELECT o.*, u.username, u.email, (SELECT COUNT(*) FROM order_items WHERE order_id = o.order_id) as item_count',
      'SELECT COUNT(*) as total'
    );
    const countParams = params.slice(0, -2); // Remove LIMIT and OFFSET
    const total = db.prepare(countQuery).get(...countParams).total;

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching orders', error);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Failed to fetch orders', details: error.message });
  }
});

// Get single order details
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const order = db.prepare(`
      SELECT o.*, u.username, u.email
      FROM orders o
      JOIN users u ON o.user_id = u.user_id
      WHERE o.order_id = ?
    `).get(id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderItems = db.prepare(`
      SELECT oi.*, p.name, p.description
      FROM order_items oi
      JOIN products p ON oi.product_id = p.product_id
      WHERE oi.order_id = ?
    `).all(id);

    res.json({ ...order, items: orderItems });
  } catch (error) {
    logger.error('Error fetching order details', error);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

// Update order status
router.put('/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = db.prepare('UPDATE orders SET status = ? WHERE order_id = ?').run(status, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating order status', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Get recent orders
router.get('/recent', (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const recentOrders = db.prepare(`
      SELECT o.order_id, o.total_amount, o.status, o.created_at, u.username
      FROM orders o
      JOIN users u ON o.user_id = u.user_id
      ORDER BY o.created_at DESC
      LIMIT ?
    `).all(limit);

    res.json(recentOrders);
  } catch (error) {
    logger.error('Error fetching recent orders', error);
    res.status(500).json({ error: 'Failed to fetch recent orders' });
  }
});

module.exports = router;