const { db } = require('../db/database');
const logger = require('../utils/logger');

/**
 * Analytics middleware
 * Tracks page views and user activity
 */
const analyticsMiddleware = (req, res, next) => {
  // Skip for static files, API calls, and some pages
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/) || 
      req.path.startsWith('/api/') ||
      req.path === '/favicon.ico') {
    return next();
  }
  
  // Extract information
  const userId = req.session?.userId || null;
  const sessionId = req.session?.id || 'unknown';
  const referrer = req.headers.referer || null;
  
  // Determine page type and related IDs
  let pageType = 'other';
  let productId = null;
  let categoryId = null;
  
  // Simple path parsing to determine page type
  if (req.path === '/') {
    pageType = 'home';
  } else if (req.path.startsWith('/product/')) {
    pageType = 'product';
    const pathParts = req.path.split('/');
    if (pathParts.length >= 3) {
      productId = parseInt(pathParts[2], 10) || null;
    }
  } else if (req.path.startsWith('/category/')) {
    pageType = 'category';
    const pathParts = req.path.split('/');
    if (pathParts.length >= 3) {
      categoryId = parseInt(pathParts[2], 10) || null;
    }
  } else if (req.path === '/cart') {
    pageType = 'cart';
  } else if (req.path === '/checkout') {
    pageType = 'checkout';
  }
  
  // Determine device type (very simple detection)
  const userAgent = req.headers['user-agent'] || '';
  let deviceType = 'desktop';
  
  if (/mobile|android|iphone|ipad|ipod/i.test(userAgent)) {
    deviceType = 'mobile';
  } else if (/tablet|ipad/i.test(userAgent)) {
    deviceType = 'tablet';
  }
  
  try {
    // Insert page view asynchronously
    const stmt = db.prepare(`
      INSERT INTO page_views 
      (user_id, session_id, page_type, product_id, category_id, device_type, referrer)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(userId, sessionId, pageType, productId, categoryId, deviceType, referrer);
    
    // If it's a product page view and user is logged in, record recently viewed
    if (pageType === 'product' && productId && userId) {
      try {
        // Check if the entry already exists
        const existing = db.prepare(`
          SELECT view_id FROM recently_viewed
          WHERE user_id = ? AND product_id = ?
        `).get(userId, productId);
        
        if (existing) {
          // Update the timestamp
          db.prepare(`
            UPDATE recently_viewed
            SET viewed_at = CURRENT_TIMESTAMP
            WHERE view_id = ?
          `).run(existing.view_id);
        } else {
          // Insert new record
          db.prepare(`
            INSERT INTO recently_viewed (user_id, product_id)
            VALUES (?, ?)
          `).run(userId, productId);
        }
      } catch (error) {
        logger.error('Error recording recently viewed product', error);
      }
    }
  } catch (error) {
    logger.error('Error recording analytics', error);
    // Don't block the request if analytics fails
  }
  
  next();
};

module.exports = analyticsMiddleware;
