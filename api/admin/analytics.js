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
    
    // Default to 1 year ago if no start date is provided
    const defaultStartDate = new Date();
    defaultStartDate.setFullYear(defaultStartDate.getFullYear() - 1);
    const formattedDefaultStart = defaultStartDate.toISOString().split('T')[0];

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
    } else {
      query += ' AND DATE(created_at) >= ?';
      params.push(formattedDefaultStart);
    }
    
    if (end_date) {
      query += ' AND DATE(created_at) <= ?';
      params.push(end_date);
    }

    query += ' GROUP BY DATE(created_at) ORDER BY date ASC';

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
    // Get current date for time-based queries
    const now = new Date();
    
    // Calculate date strings for time periods
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JS months are 0-based
    const currentQuarter = Math.ceil(currentMonth / 3);
    
    // Create date strings for SQL queries
    const yearStart = `${currentYear - 1}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // Calculate quarter start date
    const quarterStartMonth = (currentQuarter - 1) * 3 + 1;
    const quarterStart = `${currentYear}-${String(quarterStartMonth).padStart(2, '0')}-01`;
    
    // Month start
    const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;

    // All time customer counts
    const allTimeCustomers = db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count FROM users WHERE role = 'customer'
    `).get();

    // Active customers by period
    const yearCustomers = db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM orders 
      WHERE status != 'cancelled' 
      AND created_at >= ?
    `).get(yearStart);

    const quarterCustomers = db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM orders 
      WHERE status != 'cancelled' 
      AND created_at >= ?
    `).get(quarterStart);

    const monthCustomers = db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM orders 
      WHERE status != 'cancelled' 
      AND created_at >= ?
    `).get(monthStart);

    // Average orders per customer
    const avgOrdersAllTime = db.prepare(`
      WITH customer_order_counts AS (
        SELECT user_id, COUNT(order_id) as order_count
        FROM orders
        WHERE status != 'cancelled'
        GROUP BY user_id
      )
      SELECT AVG(order_count) as avg_orders
      FROM customer_order_counts
    `).get();

    const avgOrdersYear = db.prepare(`
      WITH customer_order_counts AS (
        SELECT user_id, COUNT(order_id) as order_count
        FROM orders
        WHERE status != 'cancelled' AND created_at >= ?
        GROUP BY user_id
      )
      SELECT AVG(order_count) as avg_orders
      FROM customer_order_counts
    `).get(yearStart);

    const avgOrdersQuarter = db.prepare(`
      WITH customer_order_counts AS (
        SELECT user_id, COUNT(order_id) as order_count
        FROM orders
        WHERE status != 'cancelled' AND created_at >= ?
        GROUP BY user_id
      )
      SELECT AVG(order_count) as avg_orders
      FROM customer_order_counts
    `).get(quarterStart);

    const avgOrdersMonth = db.prepare(`
      WITH customer_order_counts AS (
        SELECT user_id, COUNT(order_id) as order_count
        FROM orders
        WHERE status != 'cancelled' AND created_at >= ?
        GROUP BY user_id
      )
      SELECT AVG(order_count) as avg_orders
      FROM customer_order_counts
    `).get(monthStart);

    // Average order values by period
    const avgOrderValueAllTime = db.prepare(`
      SELECT AVG(total_amount) as avg_value
      FROM orders
      WHERE status != 'cancelled'
    `).get();

    const avgOrderValueYear = db.prepare(`
      SELECT AVG(total_amount) as avg_value
      FROM orders
      WHERE status != 'cancelled' AND created_at >= ?
    `).get(yearStart);

    const avgOrderValueQuarter = db.prepare(`
      SELECT AVG(total_amount) as avg_value
      FROM orders
      WHERE status != 'cancelled' AND created_at >= ?
    `).get(quarterStart);

    const avgOrderValueMonth = db.prepare(`
      SELECT AVG(total_amount) as avg_value
      FROM orders
      WHERE status != 'cancelled' AND created_at >= ?
    `).get(monthStart);

    // Order distribution - one bar per number of orders
    const orderDistribution = db.prepare(`
      WITH customer_orders AS (
        SELECT user_id, COUNT(order_id) as order_count
        FROM orders
        WHERE status != 'cancelled'
        GROUP BY user_id
      )
      SELECT order_count, COUNT(user_id) as customer_count
      FROM customer_orders
      GROUP BY order_count
      ORDER BY order_count ASC
    `).all();

    // Average order value distribution with $50 bins
    const avgOrderValueDistribution = db.prepare(`
      WITH bins AS (
        SELECT 
          (CAST((total_amount / 50) AS INTEGER) * 50) as bin_floor,
          COUNT(*) as order_count
        FROM orders
        WHERE status != 'cancelled'
        GROUP BY bin_floor
      )
      SELECT 
        bin_floor, 
        bin_floor + 50 as bin_ceiling,
        order_count
      FROM bins
      ORDER BY bin_floor ASC
    `).all();

    // Format the time periods for display
    const timePeriods = {
      year: `${yearStart} to Present`,
      quarter: `${quarterStart} to Present (Q${currentQuarter})`,
      month: `${monthStart} to Present`
    };

    res.json({
      customers: {
        allTime: allTimeCustomers.count || 0,
        year: yearCustomers.count || 0,
        quarter: quarterCustomers.count || 0,
        month: monthCustomers.count || 0
      },
      avgOrdersPerCustomer: {
        allTime: avgOrdersAllTime.avg_orders || 0,
        year: avgOrdersYear.avg_orders || 0,
        quarter: avgOrdersQuarter.avg_orders || 0,
        month: avgOrdersMonth.avg_orders || 0
      },
      avgOrderValue: {
        allTime: avgOrderValueAllTime.avg_value || 0,
        year: avgOrderValueYear.avg_value || 0,
        quarter: avgOrderValueQuarter.avg_value || 0,
        month: avgOrderValueMonth.avg_value || 0
      },
      orderDistribution: orderDistribution,
      avgOrderValueDistribution: avgOrderValueDistribution,
      timePeriods: timePeriods
    });
  } catch (error) {
    logger.error('Error fetching customer insights', error);
    console.error('Detailed error:', error);
    res.status(500).json({ error: 'Failed to fetch customer insights' });
  }
});

// Other existing routes...
router.get('/revenue-breakdown', (req, res) => {
  try {
    const currentDate = new Date(2025, 4, 4); // May 4, 2025 (using your system date)
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-based

    // Determine current quarter
    const currentQuarter = Math.ceil(currentMonth / 3);
    const quarterStartMonth = (currentQuarter - 1) * 3 + 1;

    // Format dates for SQL queries
    const yearStart = `${currentYear}-01-01`;
    const quarterStart = `${currentYear}-${String(quarterStartMonth).padStart(2, '0')}-01`;
    const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;

    // Get revenue for year
    const yearRevenue = db.prepare(`
      SELECT SUM(total_amount) as revenue
      FROM orders
      WHERE status != 'cancelled'
      AND created_at >= ?
      AND created_at < ?
    `).get(yearStart, `${currentYear + 1}-01-01`);

    // Get revenue for quarter
    const quarterRevenue = db.prepare(`
      SELECT SUM(total_amount) as revenue
      FROM orders
      WHERE status != 'cancelled'
      AND created_at >= ?
      AND created_at < ?
    `).get(quarterStart, quarterStartMonth + 3 > 12 ? `${currentYear + 1}-01-01` : `${currentYear}-${String(quarterStartMonth + 3).padStart(2, '0')}-01`);

    // Get revenue for month
    const monthRevenue = db.prepare(`
      SELECT SUM(total_amount) as revenue
      FROM orders
      WHERE status != 'cancelled'
      AND created_at >= ?
      AND created_at < ?
    `).get(monthStart, currentMonth + 1 > 12 ? `${currentYear + 1}-01-01` : `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`);

    res.json({
      year: yearRevenue.revenue || 0,
      quarter: quarterRevenue.revenue || 0,
      month: monthRevenue.revenue || 0,
      quarterLabel: `Q${currentQuarter} ${currentYear}`,
      monthLabel: new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long' }) + ` ${currentYear}`
    });
  } catch (error) {
    logger.error('Error fetching revenue breakdown', error);
    res.status(500).json({ error: 'Failed to fetch revenue breakdown' });
  }
});

router.get('/customer-breakdown', (req, res) => {
  try {
    const currentDate = new Date(2025, 4, 4); // May 4, 2025 (using your system date)
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-based

    // Determine current quarter
    const currentQuarter = Math.ceil(currentMonth / 3);
    const quarterStartMonth = (currentQuarter - 1) * 3 + 1;

    // Format dates for SQL queries
    const yearStart = `${currentYear}-01-01`;
    const quarterStart = `${currentYear}-${String(quarterStartMonth).padStart(2, '0')}-01`;
    const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;

    // Get customers for year
    const yearCustomers = db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM orders
      WHERE status != 'cancelled'
      AND created_at >= ?
      AND created_at < ?
    `).get(yearStart, `${currentYear + 1}-01-01`);

    // Get customers for quarter
    const quarterCustomers = db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM orders
      WHERE status != 'cancelled'
      AND created_at >= ?
      AND created_at < ?
    `).get(quarterStart, quarterStartMonth + 3 > 12 ? `${currentYear + 1}-01-01` : `${currentYear}-${String(quarterStartMonth + 3).padStart(2, '0')}-01`);

    // Get customers for month
    const monthCustomers = db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM orders
      WHERE status != 'cancelled'
      AND created_at >= ?
      AND created_at < ?
    `).get(monthStart, currentMonth + 1 > 12 ? `${currentYear + 1}-01-01` : `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`);

    res.json({
      year: yearCustomers.count || 0,
      quarter: quarterCustomers.count || 0,
      month: monthCustomers.count || 0,
      quarterLabel: `Q${currentQuarter} ${currentYear}`,
      monthLabel: new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long' }) + ` ${currentYear}`
    });
  } catch (error) {
    logger.error('Error fetching customer breakdown', error);
    res.status(500).json({ error: 'Failed to fetch customer breakdown' });
  }
});

module.exports = router;