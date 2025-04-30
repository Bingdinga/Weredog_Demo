/**
 * Authentication middleware
 * Verifies if a user is logged in before allowing access to protected routes
 */
const authMiddleware = (req, res, next) => {
  // Check if user is authenticated
  if (req.session && req.session.userId) {
    // User is authenticated, proceed to the next middleware/route handler
    return next();
  }
  
  // Check if it's an API request
  if (req.path.startsWith('/api/')) {
    // Return 401 Unauthorized for API requests
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // For non-API requests, redirect to login page
  res.redirect('/login');
};

module.exports = authMiddleware;
