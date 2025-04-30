/**
 * Validation utilities
 * Common validation functions used throughout the application
 */
const validators = {
  /**
   * Validates an email address
   * @param {string} email - The email address to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  /**
   * Validates a password against security requirements
   * @param {string} password - The password to validate
   * @returns {object} - { valid: boolean, message: string }
   */
  isValidPassword: (password) => {
    if (!password || password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    
    return { valid: true, message: 'Password is valid' };
  },
  
  /**
   * Validates product data
   * @param {object} product - The product data to validate
   * @returns {object} - { valid: boolean, errors: array }
   */
  isValidProduct: (product) => {
    const errors = [];
    
    if (!product.name || product.name.trim() === '') {
      errors.push('Product name is required');
    }
    
    if (isNaN(parseFloat(product.price)) || parseFloat(product.price) <= 0) {
      errors.push('Product price must be a positive number');
    }
    
    if (!Number.isInteger(product.stock_quantity) || product.stock_quantity < 0) {
      errors.push('Stock quantity must be a non-negative integer');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
};

module.exports = validators;
