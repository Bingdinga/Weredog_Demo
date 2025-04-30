const db = require('./database');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

// Function to seed the database with sample data
const seedDatabase = () => {
  console.log('Seeding database with sample data...');
  
  // Start transaction
  db.exec('BEGIN TRANSACTION');
  
  try {
    // Add categories
    const categories = [
      { name: 'Electronics', description: 'Electronic devices and accessories' },
      { name: 'Furniture', description: 'Home and office furniture' },
      { name: 'Clothing', description: 'Apparel and fashion items' },
      { name: 'Toys', description: 'Games and toys for all ages' }
    ];
    
    const categoryIds = {};
    
    categories.forEach(category => {
      const result = db.prepare(`
        INSERT INTO categories (name, description)
        VALUES (?, ?)
      `).run(category.name, category.description);
      
      categoryIds[category.name] = result.lastInsertRowid;
    });
    
    // Add products
    const products = [
      {
        name: 'Smartphone X',
        description: 'Latest smartphone with advanced features',
        price: 699.99,
        stock_quantity: 50,
        category_id: categoryIds['Electronics'],
        images: ['/img/smartphone_1.jpg', '/img/smartphone_2.jpg', '/img/smartphone_3.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/smartphone.glb', file_size: 2048 },
          { resolution: 'medium', path: '/models/medium/smartphone.glb', file_size: 1024 },
          { resolution: 'low', path: '/models/low/smartphone.glb', file_size: 512 }
        ]
      },
      {
        name: 'Office Chair',
        description: 'Ergonomic office chair with lumbar support',
        price: 249.99,
        stock_quantity: 20,
        category_id: categoryIds['Furniture'],
        images: ['/img/chair_1.jpg', '/img/chair_2.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/chair.glb', file_size: 3072 },
          { resolution: 'medium', path: '/models/medium/chair.glb', file_size: 1536 },
          { resolution: 'low', path: '/models/low/chair.glb', file_size: 768 }
        ]
      },
      {
        name: 'Winter Jacket',
        description: 'Warm winter jacket with waterproof exterior',
        price: 129.99,
        stock_quantity: 30,
        category_id: categoryIds['Clothing'],
        images: ['/img/jacket_1.jpg', '/img/jacket_2.jpg', '/img/jacket_3.jpg', '/img/jacket_4.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/jacket.glb', file_size: 4096 },
          { resolution: 'medium', path: '/models/medium/jacket.glb', file_size: 2048 },
          { resolution: 'low', path: '/models/low/jacket.glb', file_size: 1024 }
        ]
      },
      {
        name: 'Building Blocks Set',
        description: 'Creative building blocks for children',
        price: 39.99,
        stock_quantity: 100,
        category_id: categoryIds['Toys'],
        images: ['/img/blocks_1.jpg', '/img/blocks_2.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/blocks.glb', file_size: 1536 },
          { resolution: 'medium', path: '/models/medium/blocks.glb', file_size: 768 },
          { resolution: 'low', path: '/models/low/blocks.glb', file_size: 384 }
        ]
      }
    ];
    
    // Insert products and related data
    products.forEach(product => {
      // Insert product
      const productResult = db.prepare(`
        INSERT INTO products (name, description, price, stock_quantity, category_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        product.name, 
        product.description, 
        product.price, 
        product.stock_quantity, 
        product.category_id
      );
      
      const productId = productResult.lastInsertRowid;
      
      // Insert product images
      product.images.forEach((imagePath, index) => {
        db.prepare(`
          INSERT INTO product_images (product_id, image_path, is_primary)
          VALUES (?, ?, ?)
        `).run(productId, imagePath, index === 0 ? 1 : 0);
      });
      
      // Insert product models
      product.models.forEach(model => {
        db.prepare(`
          INSERT INTO product_models (product_id, model_path, resolution, file_size)
          VALUES (?, ?, ?, ?)
        `).run(productId, model.path, model.resolution, model.file_size);
      });
    });
    
    // Add discount codes
    const discountCodes = [
      {
        code: 'WELCOME10',
        discount_percent: 10,
        discount_amount: null,
        minimum_order_amount: 50,
        valid_to: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString(),
        max_uses: 1000
      },
      {
        code: 'SUMMER25',
        discount_percent: 25,
        discount_amount: null,
        minimum_order_amount: 100,
        valid_to: new Date(new Date().setMonth(new Date().getMonth() + 2)).toISOString(),
        max_uses: 500
      }
    ];
    
    discountCodes.forEach(code => {
      db.prepare(`
        INSERT INTO discount_codes (code, discount_percent, discount_amount, minimum_order_amount, valid_to, max_uses)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        code.code,
        code.discount_percent,
        code.discount_amount,
        code.minimum_order_amount,
        code.valid_to,
        code.max_uses
      );
    });
    
    // Create image placeholder directories
    const publicDir = path.join(__dirname, '../public');
    const imgDir = path.join(publicDir, 'img');
    const modelsDir = path.join(publicDir, 'models');
    
    // Ensure directories exist
    [
      imgDir,
      path.join(modelsDir, 'high'),
      path.join(modelsDir, 'medium'),
      path.join(modelsDir, 'low')
    ].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    // Create a simple placeholder image
    const placeholderImage = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f5f5f5"/>
        <text x="50%" y="50%" font-family="Arial" font-size="24" fill="#999" text-anchor="middle">Image Placeholder</text>
      </svg>
    `;
    
    // Save placeholder image
    fs.writeFileSync(path.join(imgDir, 'placeholder.svg'), placeholderImage);
    
    // Commit transaction
    db.exec('COMMIT');
    console.log('Database seeded successfully!');
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('Error seeding database:', error);
  }
};

// Run the seeding function
seedDatabase();
