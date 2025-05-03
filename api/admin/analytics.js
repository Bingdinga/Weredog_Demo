const express = require('express');
const router = express.Router();
const { db } = require('../../db/database');
const logger = require('../../utils/logger');

// Get sales overview
router.get('/sales-overview', (req, res) => {
  try {
    const salesData = db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_order_value,
        (SELECT COUNT(DISTINCT user_id) FROM orders) as total_customers
      FROM orders
      WHERE status != 'cancelled'
    `).get();
    
    res.json(salesData);
  } catch (error) {
    logger.error('Error fetching sales overview', error);
    res.status(500).json({ error: 'Failed to fetch sales overview' });
  }
});

// Get sales by date
router.get('/sales-by-date', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let query = `
      SELECT DATE(created_at) as date, 
             COUNT(*) as orders,
             SUM(total_amount) as revenue
      FROM orders
      WHERE status != 'cancelled'
    `;
    
    const params = [];
    if (start_date) {
      query += ' AND DATE(created_at) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND DATE(created_at) <= ?';
      params.push(end_date);
    }
    
    query += ' GROUP BY DATE(created_at) ORDER BY date DESC';
    
    const salesData = db.prepare(query).all(...params);
    res.json(salesData);
  } catch (error) {
    logger.error('Error fetching sales by date', error);
    res.status(500).json({ error: 'Failed to fetch sales by date' });
  }
});

// Get top products
router.get('/top-products', (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const topProducts = db.prepare(`
      SELECT p.product_id, p.name, p.price,
             COUNT(oi.order_item_id) as units_sold,
             SUM(oi.quantity * oi.price) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.product_id
      JOIN orders o ON oi.order_id = o.order_id
      WHERE o.status != 'cancelled'
      GROUP BY p.product_id
      ORDER BY units_sold DESC
      LIMIT ?
    `).all(limit);
    
    res.json(topProducts);
  } catch (error) {
    logger.error('Error fetching top products', error);
    res.status(500).json({ error: 'Failed to fetch top products' });
  }
});

// Get customer insights
router.get('/customer-insights', (req, res) => {
  try {
    const insights = db.prepare(`
      SELECT 
        COUNT(DISTINCT user_id) as total_customers,
        AVG(order_count) as avg_orders_per_customer,
        AVG(total_spent) as avg_customer_value
      FROM (
        SELECT user_id, 
               COUNT(*) as order_count,
               SUM(total_amount) as total_spent
        FROM orders
        WHERE status != 'cancelled'
        GROUP BY user_id
      )
    `).get();
    
    res.json(insights);
  } catch (error) {
    logger.error('Error fetching customer insights', error);
    res.status(500).json({ error: 'Failed to fetch customer insights' });
  }
});

module.exports = router;