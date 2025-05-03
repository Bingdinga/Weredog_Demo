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
    const stats = db.prepare(`
      WITH customer_stats AS (
        SELECT 
          user_id,
          COUNT(*) as order_count,
          SUM(total_amount) as total_spent,
          AVG(total_amount) as avg_order_value
        FROM orders
        WHERE status != 'cancelled'
        GROUP BY user_id
      )
      SELECT 
        COUNT(DISTINCT u.user_id) as total_customers,
        AVG(COALESCE(cs.order_count, 0)) as avg_orders_per_customer,
        AVG(COALESCE(cs.total_spent, 0)) as avg_customer_value,
        AVG(COALESCE(cs.avg_order_value, 0)) as avg_order_value_per_customer,
        COALESCE(PERCENTILE_CONT(cs.order_count, 0.5) WITHIN GROUP (ORDER BY cs.order_count), 0) as median_orders_per_customer,
        COALESCE(PERCENTILE_CONT(cs.total_spent, 0.5) WITHIN GROUP (ORDER BY cs.total_spent), 0) as median_customer_value,
        COALESCE(PERCENTILE_CONT(cs.avg_order_value, 0.5) WITHIN GROUP (ORDER BY cs.avg_order_value), 0) as median_order_value
      FROM users u
      LEFT JOIN customer_stats cs ON u.user_id = cs.user_id
      WHERE u.role = 'customer'
    `).get();

    // Get distribution data for charts
    const orderDistribution = db.prepare(`
      SELECT 
        CASE 
          WHEN order_count = 1 THEN '1 order'
          WHEN order_count BETWEEN 2 AND 5 THEN '2-5 orders'
          WHEN order_count BETWEEN 6 AND 10 THEN '6-10 orders'
          WHEN order_count > 10 THEN '10+ orders'
          ELSE '0 orders'
        END as order_range,
        COUNT(*) as customer_count
      FROM (
        SELECT 
          u.user_id,
          COUNT(o.order_id) as order_count
        FROM users u
        LEFT JOIN orders o ON u.user_id = o.user_id
        WHERE u.role = 'customer' AND (o.status != 'cancelled' OR o.status IS NULL)
        GROUP BY u.user_id
      )
      GROUP BY order_range
      ORDER BY customer_count DESC
    `).all();

    const spendingDistribution = db.prepare(`
      SELECT 
        CASE 
          WHEN total_spent = 0 THEN '$0'
          WHEN total_spent BETWEEN 0.01 AND 100 THEN '$1-100'
          WHEN total_spent BETWEEN 101 AND 500 THEN '$101-500'
          WHEN total_spent BETWEEN 501 AND 1000 THEN '$501-1,000'
          WHEN total_spent > 1000 THEN '$1,000+'
        END as spending_range,
        COUNT(*) as customer_count
      FROM (
        SELECT 
          u.user_id,
          COALESCE(SUM(o.total_amount), 0) as total_spent
        FROM users u
        LEFT JOIN orders o ON u.user_id = o.user_id
        WHERE u.role = 'customer' AND (o.status != 'cancelled' OR o.status IS NULL)
        GROUP BY u.user_id
      )
      GROUP BY spending_range
      ORDER BY customer_count DESC
    `).all();

    res.json({
      stats,
      orderDistribution,
      spendingDistribution
    });
  } catch (error) {
    logger.error('Error fetching customer insights', error);
    res.status(500).json({ error: 'Failed to fetch customer insights' });
  }
});

module.exports = router;