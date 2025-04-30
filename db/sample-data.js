const { db } = require('./database');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const seedDatabase = () => {
  console.log('Seeding database with sample data...');
  
  // Start transaction
  db.exec('BEGIN TRANSACTION');
  
  try {
    // Add users with different roles
    const users = [
      { 
        username: 'admin', 
        email: 'admin@example.com', 
        password: 'Admin123!', 
        firstName: 'Admin', 
        lastName: 'User', 
        role: 'admin' 
      },
      { 
        username: 'customer', 
        email: 'customer@example.com', 
        password: 'Customer123!', 
        firstName: 'Sample', 
        lastName: 'Customer', 
        role: 'customer' 
      },
      { 
        username: 'manager', 
        email: 'manager@example.com', 
        password: 'Manager123!', 
        firstName: 'Store', 
        lastName: 'Manager', 
        role: 'manager' 
      }
    ];
    
    users.forEach(user => {
      const saltRounds = 10;
      const passwordHash = bcrypt.hashSync(user.password, saltRounds);
      
      db.prepare(`
        INSERT INTO users (username, email, password_hash, first_name, last_name, role)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        user.username, 
        user.email, 
        passwordHash, 
        user.firstName, 
        user.lastName, 
        user.role
      );
    });
    
    console.log('Users added successfully');
    
    // Add categories with hierarchy
    const mainCategories = [
      { name: 'Penetrables', description: 'High-quality penetrable toys for maximum pleasure' },
      { name: 'Dildos', description: 'Realistic and fantasy dildos in various sizes and materials' },
      { name: 'Paws', description: 'Premium paw toys for creative play' },
      { name: 'Accessories', description: 'Essential accessories to enhance your experience' }
    ];
    
    const categoryIds = {};
    
    mainCategories.forEach(category => {
      const result = db.prepare(`
        INSERT INTO categories (name, description)
        VALUES (?, ?)
      `).run(category.name, category.description);
      
      categoryIds[category.name] = result.lastInsertRowid;
    });
    
    // Add subcategories
    const subCategories = [
      { name: 'Realistic', description: 'Anatomically realistic penetrable toys', parent: 'Penetrables' },
      { name: 'Fantasy', description: 'Fantasy-inspired penetrable designs', parent: 'Penetrables' },
      { name: 'Premium', description: 'High-end premium penetrable toys', parent: 'Penetrables' },
      
      { name: 'Realistic Dildos', description: 'True-to-life designs with detailed features', parent: 'Dildos' },
      { name: 'Fantasy Dildos', description: 'Imaginative and unique fantasy designs', parent: 'Dildos' },
      { name: 'Glass & Ceramic', description: 'Temperature-responsive glass and ceramic options', parent: 'Dildos' },
      
      { name: 'Silicone Paws', description: 'Soft silicone paw toys for tactile play', parent: 'Paws' },
      { name: 'Specialty Paws', description: 'Specialty and limited edition paw designs', parent: 'Paws' },
      
      { name: 'Lubricants', description: 'Premium lubricants for enhanced comfort', parent: 'Accessories' },
      { name: 'Cleaning Products', description: 'Specialized toy cleaning and maintenance products', parent: 'Accessories' },
      { name: 'Storage', description: 'Discreet and protective storage solutions', parent: 'Accessories' }
    ];
    
    subCategories.forEach(category => {
      const result = db.prepare(`
        INSERT INTO categories (name, description, parent_id)
        VALUES (?, ?, ?)
      `).run(category.name, category.description, categoryIds[category.parent]);
      
      categoryIds[category.name] = result.lastInsertRowid;
    });
    
    console.log('Categories added successfully');
    
    // Add products with realistic data
    const products = [
      // Penetrables - Realistic
      {
        name: 'Realistic Stroker Pro',
        description: 'Premium realistic stroker with textured internal canal, dual-density silicone for a lifelike feel, and discreet case for storage.',
        price: 79.99,
        stock_quantity: 50,
        category_id: categoryIds['Realistic'],
        images: ['/img/stroker_front.jpg', '/img/stroker_detail.jpg', '/img/stroker_case.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/realistic_stroker.glb', file_size: 3072 },
          { resolution: 'medium', path: '/models/medium/realistic_stroker.glb', file_size: 1536 },
          { resolution: 'low', path: '/models/low/realistic_stroker.glb', file_size: 768 }
        ]
      },
      
      // Penetrables - Fantasy
      {
        name: 'Dragon\'s Lair',
        description: 'Fantasy dragon-inspired stroker with unique textured interior, made from body-safe platinum-cure silicone with a mesmerizing color scheme.',
        price: 89.99,
        stock_quantity: 30,
        category_id: categoryIds['Fantasy'],
        images: ['/img/dragon_front.jpg', '/img/dragon_inside.jpg', '/img/dragon_detail.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/dragon_stroker.glb', file_size: 4096 },
          { resolution: 'medium', path: '/models/medium/dragon_stroker.glb', file_size: 2048 },
          { resolution: 'low', path: '/models/low/dragon_stroker.glb', file_size: 1024 }
        ]
      },
      
      // Penetrables - Premium
      {
        name: 'Elite Touch',
        description: 'High-end premium stroker with warming function, adjustable suction control, and ultra-soft platinum silicone interior with specialized textures.',
        price: 149.99,
        stock_quantity: 20,
        category_id: categoryIds['Premium'],
        images: ['/img/elite_front.jpg', '/img/elite_detail.jpg', '/img/elite_case.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/elite_stroker.glb', file_size: 5120 },
          { resolution: 'medium', path: '/models/medium/elite_stroker.glb', file_size: 2560 },
          { resolution: 'low', path: '/models/low/elite_stroker.glb', file_size: 1280 }
        ]
      },
      
      // Dildos - Realistic
      {
        name: 'Natural Form 7"',
        description: 'Anatomically realistic 7-inch dildo with dual-density silicone construction, providing a firm core with a soft exterior for a lifelike experience.',
        price: 69.99,
        stock_quantity: 45,
        category_id: categoryIds['Realistic Dildos'],
        images: ['/img/natural_front.jpg', '/img/natural_side.jpg', '/img/natural_detail.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/natural_dildo.glb', file_size: 4096 },
          { resolution: 'medium', path: '/models/medium/natural_dildo.glb', file_size: 2048 },
          { resolution: 'low', path: '/models/low/natural_dildo.glb', file_size: 1024 }
        ]
      },
      
      // Dildos - Fantasy
      {
        name: 'Mystic Dragon',
        description: 'Fantasy dragon-inspired dildo with unique texture and ridge patterns, made from body-safe platinum-cure silicone with a stunning color shift effect.',
        price: 84.99,
        stock_quantity: 35,
        category_id: categoryIds['Fantasy Dildos'],
        images: ['/img/mystic_front.jpg', '/img/mystic_side.jpg', '/img/mystic_detail.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/mystic_dildo.glb', file_size: 4608 },
          { resolution: 'medium', path: '/models/medium/mystic_dildo.glb', file_size: 2304 },
          { resolution: 'low', path: '/models/low/mystic_dildo.glb', file_size: 1152 }
        ]
      },
      
      // Dildos - Glass & Ceramic
      {
        name: 'Glass Spiral Wand',
        description: 'Hand-crafted borosilicate glass dildo with elegant spiral design, perfect for temperature play and easy maintenance.',
        price: 59.99,
        stock_quantity: 25,
        category_id: categoryIds['Glass & Ceramic'],
        images: ['/img/glass_front.jpg', '/img/glass_detail.jpg', '/img/glass_box.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/glass_wand.glb', file_size: 3584 },
          { resolution: 'medium', path: '/models/medium/glass_wand.glb', file_size: 1792 },
          { resolution: 'low', path: '/models/low/glass_wand.glb', file_size: 896 }
        ]
      },
      
      // Paws - Silicone
      {
        name: 'Silicone Paw Deluxe',
        description: 'Premium silicone paw toy with articulated fingers and anatomically correct details for a realistic experience.',
        price: 89.99,
        stock_quantity: 30,
        category_id: categoryIds['Silicone Paws'],
        images: ['/img/paw_top.jpg', '/img/paw_side.jpg', '/img/paw_bottom.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/silicone_paw.glb', file_size: 5120 },
          { resolution: 'medium', path: '/models/medium/silicone_paw.glb', file_size: 2560 },
          { resolution: 'low', path: '/models/low/silicone_paw.glb', file_size: 1280 }
        ]
      },
      
      // Paws - Specialty
      {
        name: 'Limited Edition Wolf Paw',
        description: 'Collector\'s edition wolf-inspired paw toy with realistic texturing, premium silicone construction, and custom coloration.',
        price: 109.99,
        stock_quantity: 15,
        category_id: categoryIds['Specialty Paws'],
        images: ['/img/wolf_top.jpg', '/img/wolf_side.jpg', '/img/wolf_box.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/wolf_paw.glb', file_size: 6144 },
          { resolution: 'medium', path: '/models/medium/wolf_paw.glb', file_size: 3072 },
          { resolution: 'low', path: '/models/low/wolf_paw.glb', file_size: 1536 }
        ]
      },
      
      // Accessories - Lubricants
      {
        name: 'Premium Water-Based Lubricant',
        description: 'High-quality water-based lubricant that\'s compatible with all toy materials. Long-lasting, non-sticky formula with aloe vera for added comfort.',
        price: 24.99,
        stock_quantity: 100,
        category_id: categoryIds['Lubricants'],
        images: ['/img/lube_bottle.jpg', '/img/lube_detail.jpg', '/img/lube_size.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/lube_bottle.glb', file_size: 2048 },
          { resolution: 'medium', path: '/models/medium/lube_bottle.glb', file_size: 1024 },
          { resolution: 'low', path: '/models/low/lube_bottle.glb', file_size: 512 }
        ]
      },
      
      // Accessories - Cleaning Products
      {
        name: 'Toy Cleaner Spray',
        description: 'Specialized anti-bacterial toy cleaner for keeping your products safe and hygienic. Alcohol-free formula that\'s gentle on silicone and other materials.',
        price: 19.99,
        stock_quantity: 120,
        category_id: categoryIds['Cleaning Products'],
        images: ['/img/cleaner_bottle.jpg', '/img/cleaner_spray.jpg', '/img/cleaner_detail.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/cleaner_bottle.glb', file_size: 2048 },
          { resolution: 'medium', path: '/models/medium/cleaner_bottle.glb', file_size: 1024 },
          { resolution: 'low', path: '/models/low/cleaner_bottle.glb', file_size: 512 }
        ]
      },
      
      // Accessories - Storage
      {
        name: 'Discreet Lockable Storage Case',
        description: 'Secure lockable storage case with discreet design, antibacterial lining, and compartments for organizing your collection.',
        price: 49.99,
        stock_quantity: 40,
        category_id: categoryIds['Storage'],
        images: ['/img/case_closed.jpg', '/img/case_open.jpg', '/img/case_lock.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/storage_case.glb', file_size: 4096 },
          { resolution: 'medium', path: '/models/medium/storage_case.glb', file_size: 2048 },
          { resolution: 'low', path: '/models/low/storage_case.glb', file_size: 1024 }
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
    
    console.log('Products added successfully');
    
    // Add discount codes
    const discountCodes = [
      {
        code: 'WELCOME15',
        discount_percent: 15,
        discount_amount: null,
        minimum_order_amount: 50,
        valid_to: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString(),
        max_uses: 1000
      },
      {
        code: 'FANTASY25',
        discount_percent: 25,
        discount_amount: null,
        minimum_order_amount: 100,
        valid_to: new Date(new Date().setMonth(new Date().getMonth() + 2)).toISOString(),
        max_uses: 500
      },
      {
        code: 'FREESHIP',
        discount_percent: null,
        discount_amount: 15,
        minimum_order_amount: 75,
        valid_to: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
        max_uses: 750
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
    
    console.log('Discount codes added successfully');
    
    // Add reviews for some products
    const reviews = [
      {
        product_id: 1, // Realistic Stroker Pro
        user_id: 2, // customer
        rating: 5,
        comment: 'Excellent quality and realism! The dual-density material feels amazing and the case is perfect for discreet storage.'
      },
      {
        product_id: 2, // Dragon's Lair
        user_id: 3, // manager
        rating: 4,
        comment: 'The textures inside are incredible and the coloring is beautiful. A bit pricey but definitely worth it.'
      },
      {
        product_id: 4, // Natural Form 7"
        user_id: 2, // customer
        rating: 5,
        comment: 'The most realistic toy I\'ve ever owned. The dual-density silicone makes all the difference!'
      },
      {
        product_id: 8, // Limited Edition Wolf Paw
        user_id: 3, // manager
        rating: 5,
        comment: 'Absolutely incredible detail and quality. The limited edition coloring is stunning in person.'
      },
      {
        product_id: 10, // Toy Cleaner Spray
        user_id: 2, // customer
        rating: 5,
        comment: 'Works perfectly and doesn\'t leave any residue. A little goes a long way!'
      }
    ];
    
    reviews.forEach(review => {
      db.prepare(`
        INSERT INTO reviews (product_id, user_id, rating, comment)
        VALUES (?, ?, ?, ?)
      `).run(
        review.product_id,
        review.user_id,
        review.rating,
        review.comment
      );
    });
    
    console.log('Reviews added successfully');
    
    // Create placeholder directories for images and models
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
    
    // Create placeholder images for each product type
    const placeholderTypes = [
      'stroker', 'dragon', 'elite', 'natural', 'mystic', 'glass', 
      'paw', 'wolf', 'lube', 'cleaner', 'case'
    ];
    
    placeholderTypes.forEach(type => {
      const placeholderSvg = `
        <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#1e1e1e"/>
          <text x="50%" y="50%" font-family="Arial" font-size="24" fill="#b3b3b3" text-anchor="middle">${type.charAt(0).toUpperCase() + type.slice(1)} Placeholder</text>
        </svg>
      `;
      
      fs.writeFileSync(path.join(imgDir, `${type}_placeholder.svg`), placeholderSvg);
    });
    
    // Create a generic placeholder image
    const placeholderImage = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1e1e1e"/>
        <text x="50%" y="50%" font-family="Arial" font-size="24" fill="#b3b3b3" text-anchor="middle">Image Placeholder</text>
      </svg>
    `;
    
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