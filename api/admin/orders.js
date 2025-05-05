const express = require('express');
const router = express.Router();
const { db } = require('../../db/database');
const logger = require('../../utils/logger');

// Get all orders with user and product details
router.get('/', (req, res) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 20, sort = 'created_at', direction = 'desc', search = '' } = req.query;

    // Parse page and limit as integers
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;

    // Build WHERE clause for both count and main queries
    let whereClause = '1=1';
    const params = [];

    if (status) {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }

    if (startDate) {
      whereClause += ' AND DATE(o.created_at) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND DATE(o.created_at) <= ?';
      params.push(endDate);
    }

    // Add username search condition if provided
    if (search) {
      whereClause += ' AND u.username LIKE ?';
      params.push(`%${search}%`); // Add wildcards for partial matching
    }

    // Count query - completely separate from main query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM orders o
      JOIN users u ON o.user_id = u.user_id
      WHERE ${whereClause}
    `;

    // Get total count
    const countResult = db.prepare(countQuery).get(...params);
    const total = countResult ? countResult.total : 0;

    // Validate and sanitize the sort field to prevent SQL injection
    const validSortFields = ['order_id', 'username', 'created_at', 'total_amount'];
    const sanitizedSortField = validSortFields.includes(sort) ? sort : 'created_at';

    // Determine table prefix for the sort field
    const tablePrefix = sanitizedSortField === 'username' ? 'u' : 'o';

    // Validate sort direction
    const sanitizedDirection = direction.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Main query for fetching data with ORDER BY clause
    const mainQuery = `
      SELECT o.*, u.username, u.email,
             (SELECT COUNT(*) FROM order_items WHERE order_id = o.order_id) as item_count
      FROM orders o
      JOIN users u ON o.user_id = u.user_id
      WHERE ${whereClause}
      ORDER BY ${tablePrefix}.${sanitizedSortField} ${sanitizedDirection}
      LIMIT ? OFFSET ?
    `;

    // Add limit and offset params for the main query
    const mainParams = [...params, limitNum, (pageNum - 1) * limitNum];

    // Execute main query
    const orders = db.prepare(mainQuery).all(...mainParams);

    // Calculate total pages
    const totalPages = Math.max(1, Math.ceil(total / limitNum));

    // Log for debugging
    console.log(`API Request: search="${search}", sort=${sanitizedSortField}, direction=${sanitizedDirection}, page=${pageNum}`);

    res.json({
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    logger.error('Error fetching orders', error);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Failed to fetch orders', details: error.message });
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

router.get('/status-counts', (req, res) => {
  try {
    const counts = db.prepare(`
      SELECT 
        status,
        COUNT(*) as count
      FROM orders
      WHERE status IN ('pending', 'processing', 'shipped')
      GROUP BY status
    `).all();

    // Convert to an object with status as keys
    const result = {
      pending: 0,
      processing: 0,
      shipped: 0
    };

    counts.forEach(item => {
      result[item.status] = item.count;
    });

    res.json(result);
  } catch (error) {
    logger.error('Error fetching order status counts', error);
    res.status(500).json({ error: 'Failed to fetch order status counts' });
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



module.exports = router;