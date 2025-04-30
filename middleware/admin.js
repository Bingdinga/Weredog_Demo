const db = require('../db/database');

/**
 * Admin middleware
 * Verifies if a logged-in user has admin privileges
 */
const adminMiddleware = (req, res, next) => {
  // Get user ID from session
  const userId = req.session.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    // Check if user has admin role
    const user = db.prepare('SELECT role FROM users WHERE user_id = ?').get(userId);
    
    if (!user || user.role !== 'admin') {
      // User doesn't have admin privileges
      if (req.path.startsWith('/api/')) {
        // Return 403 Forbidden for API requests
        return res.status(403).json({ error: 'Admin privileges required' });
      }
      
      // For non-API requests, redirect to home page
      return res.redirect('/');
    }
    
    // User has admin privileges, proceed to the next middleware/route handler
    next();
  } catch (error) {
    console.error('Error checking admin privileges:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = adminMiddleware;
