/**
 * 3D Model Loader Utility
 * Determines the appropriate model resolution based on device capabilities
 * and provides default model paths when specific models aren't available
 */
const path = require('path');
const fs = require('fs');

// Define model directories
const MODEL_DIRS = {
  high: path.join(__dirname, '../public/models/high'),
  medium: path.join(__dirname, '../public/models/medium'),
  low: path.join(__dirname, '../public/models/low')
};

// Default filenames
const DEFAULT_MODEL_FILENAME = 'default_placeholder.glb';



/**
 * Determines the optimal model resolution based on device capabilities
 * @param {Object} req - Express request object
 * @returns {string} - Resolution ('high', 'medium', or 'low')
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

/**
 * Gets the path to the default model for a given resolution
 * @param {string} resolution - The resolution ('high', 'medium', or 'low')
 * @returns {string} - Path to the default model
 */
const getDefaultModelPath = (resolution) => {
  return `/models/${resolution}/${DEFAULT_MODEL_FILENAME}`;
};

/**
 * Checks if default models exist and creates directories if needed
 * @returns {void}
 */
const ensureDefaultModelsExist = () => {
  // Create model directories if they don't exist
  Object.values(MODEL_DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created model directory: ${dir}`);
    }
  });

  // Check if default models exist
  Object.entries(MODEL_DIRS).forEach(([resolution, dir]) => {
    const defaultModelPath = path.join(dir, DEFAULT_MODEL_FILENAME);
    if (!fs.existsSync(defaultModelPath)) {
      console.warn(`WARNING: Default model for ${resolution} resolution not found at ${defaultModelPath}`);
      console.warn(`Product models will not display correctly without this file.`);
    } else {
      console.log(`Found default model for ${resolution} resolution`);
    }
  });
};

// Run initialization on module load
ensureDefaultModelsExist();

module.exports = {
  getOptimalModelResolution,
  getDefaultModelPath,
  MODEL_DIRS,
  DEFAULT_MODEL_FILENAME
};