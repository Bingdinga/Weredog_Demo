const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { getOptimalModelResolution } = require('../utils/modelLoader');

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
      LIMIT 4
    `).all();

    res.json(featuredProducts);
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).json({ error: 'Failed to fetch featured products' });
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
    const models = db.prepare(
      'SELECT * FROM product_models WHERE product_id = ? AND resolution = ?'
    ).all(productId, resolution);

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

module.exports = router;
