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

  // Check if it's an API request or AJAX request
  const isApiRequest = req.path.startsWith('/api/') ||
    req.xhr ||
    req.headers.accept?.includes('application/json');

  if (isApiRequest) {
    // Return 401 Unauthorized with JSON response for API requests
    return res.status(401).json({
      error: 'Authentication required',
      redirectTo: '/login' // Include redirect info for client-side handling
    });
  }

  // For non-API requests, redirect to login page with return URL
  const returnUrl = encodeURIComponent(req.originalUrl || req.url);
  res.redirect(`/login?redirect=${returnUrl}`);
};

module.exports = authMiddleware;