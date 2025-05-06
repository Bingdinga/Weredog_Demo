const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const logger = require('../utils/logger');

// Get cart contents
router.get('/', (req, res) => {
  try {
    // Get session ID or user ID
    const sessionId = req.session.id;
    const userId = req.session.userId;

    // Find or create cart
    let cart = db.prepare(`
      SELECT cart_id FROM carts 
      WHERE (user_id = ? OR (user_id IS NULL AND session_id = ?))
    `).get(userId || null, sessionId);

    if (!cart) {
      // Create new cart if one doesn't exist
      const result = db.prepare(`
        INSERT INTO carts (user_id, session_id) 
        VALUES (?, ?)
      `).run(userId || null, sessionId);

      cart = { cart_id: result.lastInsertRowid };
    }

    // Get cart items with product details
    const cartItems = db.prepare(`
      SELECT ci.item_id, ci.quantity, p.product_id, p.name, p.price, 
             (ci.quantity * p.price) as subtotal,
             pi.image_path
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.product_id
      LEFT JOIN product_images pi ON p.product_id = pi.product_id AND pi.is_primary = 1
      WHERE ci.cart_id = ?
    `).all(cart.cart_id);

    // Calculate total
    const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      cartId: cart.cart_id,
      items: cartItems,
      itemCount: cartItems.length, // Keeping for backward compatibility
      totalQuantity: totalQuantity, // New field with total items count
      total
    });
    
  } catch (error) {
    logger.error('Error fetching cart', error);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// Add item to cart
router.post('/add', (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const sessionId = req.session.id;
    const userId = req.session.userId;

    // Validate product exists and has stock
    const product = db.prepare(`
      SELECT product_id, stock_quantity 
      FROM products 
      WHERE product_id = ?
    `).get(productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.stock_quantity < quantity) {
      return res.status(400).json({ error: 'Not enough stock available' });
    }

    // Find or create cart
    let cart = db.prepare(`
      SELECT cart_id FROM carts 
      WHERE (user_id = ? OR (user_id IS NULL AND session_id = ?))
    `).get(userId || null, sessionId);

    if (!cart) {
      // Create new cart if one doesn't exist
      const result = db.prepare(`
        INSERT INTO carts (user_id, session_id) 
        VALUES (?, ?)
      `).run(userId || null, sessionId);

      cart = { cart_id: result.lastInsertRowid };
    }

    // Check if item already exists in cart
    const existingItem = db.prepare(`
      SELECT item_id, quantity 
      FROM cart_items 
      WHERE cart_id = ? AND product_id = ?
    `).get(cart.cart_id, productId);

    // Start transaction
    db.exec('BEGIN TRANSACTION');

    try {
      if (existingItem) {
        // Update quantity if item exists
        db.prepare(`
          UPDATE cart_items 
          SET quantity = ? 
          WHERE item_id = ?
        `).run(existingItem.quantity + quantity, existingItem.item_id);
      } else {
        // Add new item to cart
        db.prepare(`
          INSERT INTO cart_items (cart_id, product_id, quantity) 
          VALUES (?, ?, ?)
        `).run(cart.cart_id, productId, quantity);
      }

      db.exec('COMMIT');
      res.json({ success: true, cartId: cart.cart_id });
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('Error adding item to cart', error);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

// Update item quantity
router.put('/update/:itemId', (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const sessionId = req.session.id;
    const userId = req.session.userId;

    // Validate quantity
    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }

    // Get cart ID
    const cart = db.prepare(`
      SELECT cart_id FROM carts 
      WHERE (user_id = ? OR (user_id IS NULL AND session_id = ?))
    `).get(userId || null, sessionId);

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    // Get cart item
    const cartItem = db.prepare(`
      SELECT ci.item_id, ci.product_id, p.stock_quantity
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.product_id
      WHERE ci.item_id = ? AND ci.cart_id = ?
    `).get(itemId, cart.cart_id);

    if (!cartItem) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    // Check stock availability
    if (cartItem.stock_quantity < quantity) {
      return res.status(400).json({ error: 'Not enough stock available' });
    }

    // Update quantity
    db.prepare(`
      UPDATE cart_items 
      SET quantity = ? 
      WHERE item_id = ?
    `).run(quantity, itemId);

    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating cart item', error);
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

// Remove item from cart
router.delete('/remove/:itemId', (req, res) => {
  try {
    const { itemId } = req.params;
    const sessionId = req.session.id;
    const userId = req.session.userId;

    // Get cart ID
    const cart = db.prepare(`
      SELECT cart_id FROM carts 
      WHERE (user_id = ? OR (user_id IS NULL AND session_id = ?))
    `).get(userId || null, sessionId);

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    // Remove item
    const result = db.prepare(`
      DELETE FROM cart_items 
      WHERE item_id = ? AND cart_id = ?
    `).run(itemId, cart.cart_id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Error removing cart item', error);
    res.status(500).json({ error: 'Failed to remove cart item' });
  }
});

// Clear cart
router.delete('/clear', (req, res) => {
  try {
    const sessionId = req.session.id;
    const userId = req.session.userId;

    // Get cart ID
    const cart = db.prepare(`
      SELECT cart_id FROM carts 
      WHERE (user_id = ? OR (user_id IS NULL AND session_id = ?))
    `).get(userId || null, sessionId);

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    // Clear all items
    db.prepare(`
      DELETE FROM cart_items 
      WHERE cart_id = ?
    `).run(cart.cart_id);

    res.json({ success: true });
  } catch (error) {
    logger.error('Error clearing cart', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

module.exports = router;
