const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');

// Apply auth middleware to all payment routes
router.use(authMiddleware);

// Process payment
router.post('/process', (req, res) => {
  try {
    const userId = req.session.userId;
    const { shippingAddress, billingAddress, paymentMethod, discountCode } = req.body;
    
    // Get cart items
    const cart = db.prepare(`
      SELECT cart_id FROM carts 
      WHERE user_id = ?
    `).get(userId);
    
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    
    const cartItems = db.prepare(`
      SELECT ci.product_id, ci.quantity, p.price, p.stock_quantity,
             (ci.quantity * p.price) as subtotal
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.product_id
      WHERE ci.cart_id = ?
    `).all(cart.cart_id);
    
    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    
    // Check stock availability
    for (const item of cartItems) {
      if (item.stock_quantity < item.quantity) {
        return res.status(400).json({ 
          error: `Not enough stock available for product ID ${item.product_id}`
        });
      }
    }
    
    // Calculate total
    const totalAmount = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Apply discount if provided
    let discountAmount = 0;
    let discountCodeId = null;
    
    if (discountCode) {
      const discount = db.prepare(`
        SELECT code_id, discount_percent, discount_amount, minimum_order_amount, 
               valid_to, is_single_use, times_used, max_uses
        FROM discount_codes
        WHERE code = ? AND valid_from <= CURRENT_TIMESTAMP 
          AND (valid_to IS NULL OR valid_to >= CURRENT_TIMESTAMP)
          AND (max_uses IS NULL OR times_used < max_uses)
      `).get(discountCode);
      
      if (discount) {
        if (totalAmount >= discount.minimum_order_amount) {
          if (discount.discount_percent) {
            discountAmount = (totalAmount * discount.discount_percent) / 100;
          } else if (discount.discount_amount) {
            discountAmount = discount.discount_amount;
          }
          
          discountCodeId = discount.code_id;
        }
      }
    }
    
    // Calculate final amount
    const finalAmount = totalAmount - discountAmount;
    
    // In a real app, process payment with a payment gateway here
    // For demo purposes, we'll assume payment is successful
    
    // Begin transaction
    db.exec('BEGIN TRANSACTION');
    
    try {
      // Create order
      const orderResult = db.prepare(`
        INSERT INTO orders (
          user_id, status, total_amount, discount_amount, 
          shipping_address, billing_address, payment_method, discount_code_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId, 
        'pending', 
        finalAmount, 
        discountAmount, 
        shippingAddress, 
        billingAddress, 
        paymentMethod, 
        discountCodeId
      );
      
      const orderId = orderResult.lastInsertRowid;
      
      // Add order items
      const insertOrderItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES (?, ?, ?, ?)
      `);
      
      // Update product stock and create inventory log
      const updateStock = db.prepare(`
        UPDATE products 
        SET stock_quantity = stock_quantity - ? 
        WHERE product_id = ?
      `);
      
      const insertInventoryLog = db.prepare(`
        INSERT INTO inventory_log (
          product_id, quantity_change, reason, reference_id
        )
        VALUES (?, ?, ?, ?)
      `);
      
      for (const item of cartItems) {
        // Add order item
        insertOrderItem.run(orderId, item.product_id, item.quantity, item.price);
        
        // Update stock
        updateStock.run(item.quantity, item.product_id);
        
        // Log inventory change
        insertInventoryLog.run(
          item.product_id, 
          -item.quantity, 
          'order', 
          `order_${orderId}`
        );
      }
      
      // Update discount code usage if applicable
      if (discountCodeId) {
        db.prepare(`
          UPDATE discount_codes 
          SET times_used = times_used + 1 
          WHERE code_id = ?
        `).run(discountCodeId);
      }
      
      // Clear cart
      db.prepare(`
        DELETE FROM cart_items 
        WHERE cart_id = ?
      `).run(cart.cart_id);
      
      // Commit transaction
      db.exec('COMMIT');
      
      res.status(201).json({
        success: true,
        orderId,
        totalAmount: finalAmount,
        discountAmount
      });
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('Error processing payment', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

module.exports = router;
