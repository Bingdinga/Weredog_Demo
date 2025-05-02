const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { getOptimalModelResolution, getDefaultModelPath } = require('../utils/modelLoader');

const fs = require('fs');
const path = require('path');

// Get all products
router.get('/', (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM products').all();
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get all categories
router.get('/categories', (req, res) => {
  try {
    // First, get main categories
    const mainCategories = db.prepare(`
      SELECT category_id, name, description 
      FROM categories 
      WHERE parent_id IS NULL
      ORDER BY name
    `).all();

    // Then get subcategories for each main category
    for (const category of mainCategories) {
      category.subcategories = db.prepare(`
        SELECT category_id, name, description 
        FROM categories 
        WHERE parent_id = ?
        ORDER BY name
      `).all(category.category_id);
    }

    res.json(mainCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get featured products
router.get('/featured', (req, res) => {
  try {
    // In a real app, you might have a 'featured' flag in the products table
    // For now, we'll just return the first 4 products
    const featuredProducts = db.prepare(`
      SELECT p.*, pi.image_path 
      FROM products p
      LEFT JOIN product_images pi ON p.product_id = pi.product_id AND pi.is_primary = 1
      LIMIT 7
    `).all();

    res.json(featuredProducts);
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).json({ error: 'Failed to fetch featured products' });
  }
});

// Get product reviews
router.get('/:id/reviews', (req, res) => {
  try {
    const productId = req.params.id;

    const reviews = db.prepare(`
      SELECT r.review_id, r.rating, r.comment, r.created_at, u.username
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
    `).all(productId);

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching product reviews:', error);
    res.status(500).json({ error: 'Failed to fetch product reviews' });
  }
});

// Get a single product by ID
router.get('/:id', (req, res) => {
  try {
    const productId = req.params.id;

    // Get product details
    const product = db.prepare('SELECT * FROM products WHERE product_id = ?').get(productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get product images
    const images = db.prepare('SELECT * FROM product_images WHERE product_id = ?').all(productId);

    // Get product models with appropriate resolution
    const resolution = getOptimalModelResolution(req);
    let models = db.prepare(
      'SELECT * FROM product_models WHERE product_id = ? AND resolution = ?'
    ).all(productId, resolution);

    models = models.filter(model => fileExists(model.model_path));

    // If no valid models found, use the default placeholder
    if (models.length === 0) {
      const defaultPath = getDefaultModelPath(resolution);

      // Make sure the default placeholder exists
      if (fileExists(defaultPath)) {
        models = [{
          model_id: null,
          product_id: productId,
          model_path: defaultPath,
          resolution: resolution,
          is_placeholder: true
        }];
      } else {
        // If default doesn't exist, don't return any models
        console.warn(`Default model not found: ${defaultPath}`);
        models = [];
      }
    }

    // Return combined product data
    res.json({
      ...product,
      images,
      models
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Search products
router.get('/search/:query', (req, res) => {
  try {
    const searchQuery = `%${req.params.query}%`;

    const products = db.prepare(`
      SELECT p.*, pi.image_path 
      FROM products p
      LEFT JOIN product_images pi ON p.product_id = pi.product_id AND pi.is_primary = 1
      WHERE p.name LIKE ? OR p.description LIKE ?
    `).all(searchQuery, searchQuery);

    res.json(products);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Failed to search products' });
  }
});

// Get products by category
router.get('/category/:categoryId', (req, res) => {
  try {
    const categoryId = req.params.categoryId;

    const products = db.prepare(`
      SELECT p.*, pi.image_path 
      FROM products p
      LEFT JOIN product_images pi ON p.product_id = pi.product_id AND pi.is_primary = 1
      WHERE p.category_id = ?
    `).all(categoryId);

    res.json(products);
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({ error: 'Failed to fetch products by category' });
  }
});

function fileExists(filePath) {
  try {
    // Remove leading slash and check in the public directory
    const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    const fullPath = path.join(__dirname, '..', 'public', cleanPath);
    return fs.existsSync(fullPath);
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
}

module.exports = router;
