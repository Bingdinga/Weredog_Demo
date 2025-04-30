/**
 * 3D Model Loader Utility
 * Determines the appropriate model resolution based on device capabilities
 */
const getOptimalModelResolution = (req) => {
  // Get user agent
  const userAgent = req.headers['user-agent'] || '';
  
  // Check for mobile devices
  const isMobile = /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  
  // Check for tablets
  const isTablet = /tablet|ipad/i.test(userAgent);
  
  // Check client hints if available (for modern browsers)
  const deviceMemory = req.headers['device-memory'] ? parseInt(req.headers['device-memory'], 10) : null;
  const connection = req.headers['downlink'] ? {
    downlink: parseFloat(req.headers['downlink']),
    effectiveType: req.headers['ect']
  } : null;
  
  // Determine resolution based on device type and capabilities
  if (isMobile || (connection && (connection.effectiveType === '2g' || connection.effectiveType === '3g'))) {
    return 'low';
  }
  
  if (isTablet || (deviceMemory && deviceMemory <= 4) || (connection && connection.downlink < 5)) {
    return 'medium';
  }
  
  // Default to high resolution
  return 'high';
};

module.exports = {
  getOptimalModelResolution
};
