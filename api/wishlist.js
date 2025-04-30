const express = require('express');
const router = express.Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');

// Apply auth middleware to all wishlist routes
router.use(authMiddleware);

// Get user's wishlist
router.get('/', (req, res) => {
  try {
    const userId = req.session.userId;
    
    const wishlistItems = db.prepare(`
      SELECT w.wishlist_id, w.product_id, p.name, p.price, p.description, pi.image_path, w.added_at
      FROM wishlists w
      JOIN products p ON w.product_id = p.product_id
      LEFT JOIN product_images pi ON p.product_id = pi.product_id AND pi.is_primary = 1
      WHERE w.user_id = ?
      ORDER BY w.added_at DESC
    `).all(userId);
    
    res.json(wishlistItems);
  } catch (error) {
    logger.error('Error fetching wishlist', error);
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

// Add/remove product from wishlist (toggle)
router.post('/toggle', (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.userId;
    
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }
    
    // Check if product exists
    const product = db.prepare('SELECT product_id FROM products WHERE product_id = ?').get(productId);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Check if item is already in wishlist
    const existingItem = db.prepare(`
      SELECT wishlist_id FROM wishlists
      WHERE user_id = ? AND product_id = ?
    `).get(userId, productId);
    
    if (existingItem) {
      // Remove from wishlist
      db.prepare(`
        DELETE FROM wishlists
        WHERE wishlist_id = ?
      `).run(existingItem.wishlist_id);
      
      return res.json({ success: true, added: false });
    } else {
      // Add to wishlist
      db.prepare(`
        INSERT INTO wishlists (user_id, product_id)
        VALUES (?, ?)
      `).run(userId, productId);
      
      return res.json({ success: true, added: true });
    }
  } catch (error) {
    logger.error('Error toggling wishlist item', error);
    res.status(500).json({ error: 'Failed to update wishlist' });
  }
});

// Remove item from wishlist
router.delete('/:wishlistId', (req, res) => {
  try {
    const { wishlistId } = req.params;
    const userId = req.session.userId;
    
    // Ensure the wishlist item belongs to the user
    const result = db.prepare(`
      DELETE FROM wishlists
      WHERE wishlist_id = ? AND user_id = ?
    `).run(wishlistId, userId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Wishlist item not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error removing wishlist item', error);
    res.status(500).json({ error: 'Failed to remove item from wishlist' });
  }
});

module.exports = router;
