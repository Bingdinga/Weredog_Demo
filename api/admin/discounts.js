const express = require('express');
const router = express.Router();
const { db } = require('../../db/database');
const logger = require('../../utils/logger');

// Get all discount codes
router.get('/', (req, res) => {
  try {
    const discounts = db.prepare(`
      SELECT * FROM discount_codes
      ORDER BY created_at DESC
    `).all();
    
    res.json(discounts);
  } catch (error) {
    logger.error('Error fetching discount codes', error);
    res.status(500).json({ error: 'Failed to fetch discount codes' });
  }
});

// Create discount code
router.post('/', (req, res) => {
  try {
    const { 
      code, 
      discount_percent, 
      discount_amount, 
      minimum_order_amount, 
      valid_to, 
      is_single_use, 
      max_uses 
    } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Discount code is required' });
    }
    
    if (!discount_percent && !discount_amount) {
      return res.status(400).json({ error: 'Either discount_percent or discount_amount is required' });
    }
    
    const result = db.prepare(`
      INSERT INTO discount_codes (
        code, discount_percent, discount_amount, minimum_order_amount,
        valid_to, is_single_use, max_uses
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      code,
      discount_percent || null,
      discount_amount || null,
      minimum_order_amount || 0,
      valid_to || null,
      is_single_use ? 1 : 0,
      max_uses || null
    );
    
    res.status(201).json({ success: true, code_id: result.lastInsertRowid });
  } catch (error) {
    logger.error('Error creating discount code', error);
    res.status(500).json({ error: 'Failed to create discount code' });
  }
});

// Update discount code
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { valid_to, is_single_use, max_uses } = req.body;
    
    const result = db.prepare(`
      UPDATE discount_codes
      SET valid_to = ?, is_single_use = ?, max_uses = ?
      WHERE code_id = ?
    `).run(valid_to || null, is_single_use ? 1 : 0, max_uses || null, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Discount code not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating discount code', error);
    res.status(500).json({ error: 'Failed to update discount code' });
  }
});

// Delete discount code
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const result = db.prepare('DELETE FROM discount_codes WHERE code_id = ?').run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Discount code not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting discount code', error);
    res.status(500).json({ error: 'Failed to delete discount code' });
  }
});

module.exports = router;