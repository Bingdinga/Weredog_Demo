const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');

// Apply auth middleware to all shipping address routes
router.use(authMiddleware);

// Get user's shipping addresses
router.get('/', (req, res) => {
    try {
        const userId = req.session.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const addresses = db.prepare(`
        SELECT address_id, street_address, city, state, postal_code, country, is_default
        FROM shipping_addresses
        WHERE user_id = ?
        ORDER BY is_default DESC
      `).all(userId);

        // Always return an array, even if it's empty
        res.json(Array.isArray(addresses) ? addresses : []);
    } catch (error) {
        logger.error('Error fetching shipping addresses', error);
        // Return an empty array instead of an error object
        res.status(500).json([]);
    }
});

// Add new shipping address
router.post('/', (req, res) => {
    try {
        const userId = req.session.userId;
        const { streetAddress, city, state, postalCode, country, isDefault } = req.body;

        // Validate input
        if (!streetAddress || !city || !state || !postalCode || !country) {
            return res.status(400).json({ error: 'All address fields are required' });
        }

        // Start transaction
        db.exec('BEGIN TRANSACTION');

        try {
            // If this is the default address, unset existing default
            if (isDefault) {
                db.prepare(`
          UPDATE shipping_addresses
          SET is_default = 0
          WHERE user_id = ?
        `).run(userId);
            }

            // Insert new address
            const result = db.prepare(`
        INSERT INTO shipping_addresses (
          user_id, street_address, city, state, postal_code, country, is_default
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
                userId,
                streetAddress,
                city,
                state,
                postalCode,
                country,
                isDefault ? 1 : 0
            );

            db.exec('COMMIT');

            res.status(201).json({
                success: true,
                addressId: result.lastInsertRowid
            });
        } catch (error) {
            db.exec('ROLLBACK');
            throw error;
        }
    } catch (error) {
        logger.error('Error adding shipping address', error);
        res.status(500).json({ error: 'Failed to add shipping address' });
    }
});

// Update shipping address
router.put('/:id', (req, res) => {
    try {
        const userId = req.session.userId;
        const addressId = req.params.id;
        const { streetAddress, city, state, postalCode, country, isDefault } = req.body;

        // Validate input
        if (!streetAddress || !city || !state || !postalCode || !country) {
            return res.status(400).json({ error: 'All address fields are required' });
        }

        // Start transaction
        db.exec('BEGIN TRANSACTION');

        try {
            // Check if address belongs to user
            const address = db.prepare(`
        SELECT address_id FROM shipping_addresses
        WHERE address_id = ? AND user_id = ?
      `).get(addressId, userId);

            if (!address) {
                db.exec('ROLLBACK');
                return res.status(404).json({ error: 'Address not found' });
            }

            // If this is the default address, unset existing default
            if (isDefault) {
                db.prepare(`
          UPDATE shipping_addresses
          SET is_default = 0
          WHERE user_id = ? AND address_id != ?
        `).run(userId, addressId);
            }

            // Update address
            db.prepare(`
        UPDATE shipping_addresses
        SET street_address = ?, city = ?, state = ?, postal_code = ?, country = ?, is_default = ?
        WHERE address_id = ?
      `).run(
                streetAddress,
                city,
                state,
                postalCode,
                country,
                isDefault ? 1 : 0,
                addressId
            );

            db.exec('COMMIT');

            res.json({ success: true });
        } catch (error) {
            db.exec('ROLLBACK');
            throw error;
        }
    } catch (error) {
        logger.error('Error updating shipping address', error);
        res.status(500).json({ error: 'Failed to update shipping address' });
    }
});

// Delete shipping address
router.delete('/:id', (req, res) => {
    try {
        const userId = req.session.userId;
        const addressId = req.params.id;

        // Check if address belongs to user
        const address = db.prepare(`
      SELECT address_id, is_default FROM shipping_addresses
      WHERE address_id = ? AND user_id = ?
    `).get(addressId, userId);

        if (!address) {
            return res.status(404).json({ error: 'Address not found' });
        }

        // Delete address
        db.prepare(`
      DELETE FROM shipping_addresses
      WHERE address_id = ?
    `).run(addressId);

        // If it was the default address, set a new default if there are other addresses
        if (address.is_default) {
            const anyAddress = db.prepare(`
        SELECT address_id FROM shipping_addresses
        WHERE user_id = ? LIMIT 1
      `).get(userId);

            if (anyAddress) {
                db.prepare(`
          UPDATE shipping_addresses
          SET is_default = 1
          WHERE address_id = ?
        `).run(anyAddress.address_id);
            }
        }

        res.json({ success: true });
    } catch (error) {
        logger.error('Error deleting shipping address', error);
        res.status(500).json({ error: 'Failed to delete shipping address' });
    }
});

module.exports = router;