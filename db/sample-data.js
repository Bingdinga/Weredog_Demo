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
    // Products array in db/sample-data.js (replace the existing products array)
    const products = [
      // Penetrables - Realistic (3 products)
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
      {
        name: 'Anatomical Texture Sleeve',
        description: 'Anatomically correct sleeve with varied internal textures. Made from body-safe silicone with an open-ended design for easy cleaning.',
        price: 64.99,
        stock_quantity: 35,
        category_id: categoryIds['Realistic'],
        images: ['/img/sleeve_main.jpg', '/img/sleeve_texture.jpg', '/img/sleeve_case.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/texture_sleeve.glb', file_size: 2800 },
          { resolution: 'medium', path: '/models/medium/texture_sleeve.glb', file_size: 1400 },
          { resolution: 'low', path: '/models/low/texture_sleeve.glb', file_size: 700 }
        ]
      },
      {
        name: 'Dual-Density Stroker',
        description: 'Features our innovative dual-density technology with firm outer layer and soft inner core for the most realistic sensation possible.',
        price: 89.99,
        stock_quantity: 25,
        category_id: categoryIds['Realistic'],
        images: ['/img/dual_front.jpg', '/img/dual_cutaway.jpg', '/img/dual_package.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/dual_density.glb', file_size: 3200 },
          { resolution: 'medium', path: '/models/medium/dual_density.glb', file_size: 1600 },
          { resolution: 'low', path: '/models/low/dual_density.glb', file_size: 800 }
        ]
      },

      // Penetrables - Fantasy (3 products)
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
      {
        name: 'Mermaid\'s Grotto',
        description: 'Dive into fantasy with this oceanic-inspired design featuring unique wave-like textures and pearlescent color shifting material.',
        price: 94.99,
        stock_quantity: 20,
        category_id: categoryIds['Fantasy'],
        images: ['/img/mermaid_top.jpg', '/img/mermaid_side.jpg', '/img/mermaid_texture.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/mermaid_grotto.glb', file_size: 3900 },
          { resolution: 'medium', path: '/models/medium/mermaid_grotto.glb', file_size: 1950 },
          { resolution: 'low', path: '/models/low/mermaid_grotto.glb', file_size: 975 }
        ]
      },
      {
        name: 'Alien Cavern',
        description: 'Out-of-this-world sensations with alien-inspired textures and bioluminescent glow-in-the-dark material for an otherworldly experience.',
        price: 99.99,
        stock_quantity: 15,
        category_id: categoryIds['Fantasy'],
        images: ['/img/alien_main.jpg', '/img/alien_glow.jpg', '/img/alien_texture.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/alien_cavern.glb', file_size: 4200 },
          { resolution: 'medium', path: '/models/medium/alien_cavern.glb', file_size: 2100 },
          { resolution: 'low', path: '/models/low/alien_cavern.glb', file_size: 1050 }
        ]
      },

      // Penetrables - Premium (3 products)
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
      {
        name: 'Luxury Experience',
        description: 'Our flagship product featuring app-controlled vibration patterns, heated interior, and customizable pressure settings for the ultimate luxury experience.',
        price: 199.99,
        stock_quantity: 10,
        category_id: categoryIds['Premium'],
        images: ['/img/luxury_product.jpg', '/img/luxury_app.jpg', '/img/luxury_case.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/luxury_exp.glb', file_size: 5500 },
          { resolution: 'medium', path: '/models/medium/luxury_exp.glb', file_size: 2750 },
          { resolution: 'low', path: '/models/low/luxury_exp.glb', file_size: 1375 }
        ]
      },
      {
        name: 'Artisan Collection',
        description: 'Limited edition hand-crafted piece featuring artisanal details, custom marbled platinum silicone, and collector\'s display case with certificate of authenticity.',
        price: 249.99,
        stock_quantity: 5,
        category_id: categoryIds['Premium'],
        images: ['/img/artisan_product.jpg', '/img/artisan_marble.jpg', '/img/artisan_case.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/artisan_model.glb', file_size: 6000 },
          { resolution: 'medium', path: '/models/medium/artisan_model.glb', file_size: 3000 },
          { resolution: 'low', path: '/models/low/artisan_model.glb', file_size: 1500 }
        ]
      },

      // Dildos - Realistic (3 products)
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
      {
        name: 'Anatomical Perfection 8"',
        description: 'Meticulously crafted 8-inch realistic dildo with hand-detailed veins, textures, and anatomically correct proportions. Features strong suction cup base.',
        price: 79.99,
        stock_quantity: 35,
        category_id: categoryIds['Realistic Dildos'],
        images: ['/img/anatomical_front.jpg', '/img/anatomical_detail.jpg', '/img/anatomical_base.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/anatomical_dildo.glb', file_size: 4500 },
          { resolution: 'medium', path: '/models/medium/anatomical_dildo.glb', file_size: 2250 },
          { resolution: 'low', path: '/models/low/anatomical_dildo.glb', file_size: 1125 }
        ]
      },
      {
        name: 'Natural Curve 6.5"',
        description: 'Ergonomically curved 6.5-inch dildo designed for precise stimulation. Features our signature skin-soft exterior over firm core technology.',
        price: 74.99,
        stock_quantity: 30,
        category_id: categoryIds['Realistic Dildos'],
        images: ['/img/curve_side.jpg', '/img/curve_front.jpg', '/img/curve_detail.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/curve_dildo.glb', file_size: 3800 },
          { resolution: 'medium', path: '/models/medium/curve_dildo.glb', file_size: 1900 },
          { resolution: 'low', path: '/models/low/curve_dildo.glb', file_size: 950 }
        ]
      },

      // Dildos - Fantasy (3 products)
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
      {
        name: 'Tentacle Delight',
        description: 'Oceanic fantasy tentacle-shaped dildo with spiral textures and gentle curves for unique sensations. Made with premium silicone in a mesmerizing blue-to-purple gradient.',
        price: 89.99,
        stock_quantity: 25,
        category_id: categoryIds['Fantasy Dildos'],
        images: ['/img/tentacle_front.jpg', '/img/tentacle_curve.jpg', '/img/tentacle_detail.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/tentacle_dildo.glb', file_size: 4800 },
          { resolution: 'medium', path: '/models/medium/tentacle_dildo.glb', file_size: 2400 },
          { resolution: 'low', path: '/models/low/tentacle_dildo.glb', file_size: 1200 }
        ]
      },
      {
        name: 'Unicorn Horn',
        description: 'Spiraling fantasy unicorn horn dildo with a shimmering pearlescent finish and gentle twisting texture. Featuring a strong suction cup base for hands-free play.',
        price: 79.99,
        stock_quantity: 30,
        category_id: categoryIds['Fantasy Dildos'],
        images: ['/img/unicorn_front.jpg', '/img/unicorn_shimmer.jpg', '/img/unicorn_base.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/unicorn_dildo.glb', file_size: 4200 },
          { resolution: 'medium', path: '/models/medium/unicorn_dildo.glb', file_size: 2100 },
          { resolution: 'low', path: '/models/low/unicorn_dildo.glb', file_size: 1050 }
        ]
      },

      // Dildos - Glass & Ceramic (3 products)
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
      {
        name: 'Ceramic Wave Sculpture',
        description: 'Artist-designed ceramic dildo featuring smooth wave patterns and glazed with body-safe materials. Each piece is unique with slight variations in the glaze pattern.',
        price: 79.99,
        stock_quantity: 15,
        category_id: categoryIds['Glass & Ceramic'],
        images: ['/img/ceramic_wave.jpg', '/img/ceramic_detail.jpg', '/img/ceramic_display.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/ceramic_wave.glb', file_size: 3800 },
          { resolution: 'medium', path: '/models/medium/ceramic_wave.glb', file_size: 1900 },
          { resolution: 'low', path: '/models/low/ceramic_wave.glb', file_size: 950 }
        ]
      },
      {
        name: 'Glass G-Spot Explorer',
        description: 'Precision crafted glass dildo with curved head specifically designed for g-spot stimulation. Features beautiful blue accent swirls embedded in clear glass.',
        price: 64.99,
        stock_quantity: 20,
        category_id: categoryIds['Glass & Ceramic'],
        images: ['/img/gspot_glass.jpg', '/img/gspot_curve.jpg', '/img/gspot_box.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/gspot_glass.glb', file_size: 3400 },
          { resolution: 'medium', path: '/models/medium/gspot_glass.glb', file_size: 1700 },
          { resolution: 'low', path: '/models/low/gspot_glass.glb', file_size: 850 }
        ]
      },

      // Paws - Silicone (3 products)
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
      {
        name: 'Tipped Claws Paw',
        description: 'Realistic paw design with optional soft silicone claw tips that can be inserted into the fingertips. Features dual-density construction for authentic feel.',
        price: 99.99,
        stock_quantity: 20,
        category_id: categoryIds['Silicone Paws'],
        images: ['/img/tipped_paw.jpg', '/img/tipped_claws.jpg', '/img/tipped_set.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/tipped_paw.glb', file_size: 5300 },
          { resolution: 'medium', path: '/models/medium/tipped_paw.glb', file_size: 2650 },
          { resolution: 'low', path: '/models/low/tipped_paw.glb', file_size: 1325 }
        ]
      },
      {
        name: 'Petite Silicone Paw',
        description: 'Smaller sized paw toy with delicate details and softer silicone formulation. Perfect for those who prefer a gentler touch or have smaller hands.',
        price: 74.99,
        stock_quantity: 25,
        category_id: categoryIds['Silicone Paws'],
        images: ['/img/petite_paw.jpg', '/img/petite_size.jpg', '/img/petite_detail.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/petite_paw.glb', file_size: 4800 },
          { resolution: 'medium', path: '/models/medium/petite_paw.glb', file_size: 2400 },
          { resolution: 'low', path: '/models/low/petite_paw.glb', file_size: 1200 }
        ]
      },

      // Paws - Specialty (3 products)
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
      {
        name: 'Arctic Fox Paw',
        description: 'Specialty paw based on arctic fox anatomy with snow-white fur texture details and blue-tinted claws. Includes display stand and grooming brush.',
        price: 119.99,
        stock_quantity: 10,
        category_id: categoryIds['Specialty Paws'],
        images: ['/img/arctic_paw.jpg', '/img/arctic_display.jpg', '/img/arctic_kit.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/arctic_paw.glb', file_size: 6000 },
          { resolution: 'medium', path: '/models/medium/arctic_paw.glb', file_size: 3000 },
          { resolution: 'low', path: '/models/low/arctic_paw.glb', file_size: 1500 }
        ]
      },
      {
        name: 'Tiger Paw Collector\'s Edition',
        description: 'Authentic tiger paw replica with striped fur pattern detail, extended claws, and specially formulated firmer silicone for a more powerful experience.',
        price: 129.99,
        stock_quantity: 8,
        category_id: categoryIds['Specialty Paws'],
        images: ['/img/tiger_paw.jpg', '/img/tiger_detail.jpg', '/img/tiger_certificate.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/tiger_paw.glb', file_size: 6500 },
          { resolution: 'medium', path: '/models/medium/tiger_paw.glb', file_size: 3250 },
          { resolution: 'low', path: '/models/low/tiger_paw.glb', file_size: 1625 }
        ]
      },

      // Accessories - Lubricants (3 products)
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
      {
        name: 'Silicone-Based Lubricant',
        description: 'Long-lasting silicone lubricant perfect for extended play sessions. Silky smooth formula that doesn\'t dry out or get sticky. Not for use with silicone toys.',
        price: 29.99,
        stock_quantity: 80,
        category_id: categoryIds['Lubricants'],
        images: ['/img/silicone_lube.jpg', '/img/silicone_texture.jpg', '/img/silicone_size.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/silicone_lube.glb', file_size: 2048 },
          { resolution: 'medium', path: '/models/medium/silicone_lube.glb', file_size: 1024 },
          { resolution: 'low', path: '/models/low/silicone_lube.glb', file_size: 512 }
        ]
      },
      {
        name: 'Hybrid Formula Lubricant',
        description: 'The best of both worlds - our hybrid formula combines water-based and silicone ingredients for maximum duration while remaining safe for all toy materials.',
        price: 27.99,
        stock_quantity: 75,
        category_id: categoryIds['Lubricants'],
        images: ['/img/hybrid_bottle.jpg', '/img/hybrid_drop.jpg', '/img/hybrid_size.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/hybrid_lube.glb', file_size: 2048 },
          { resolution: 'medium', path: '/models/medium/hybrid_lube.glb', file_size: 1024 },
          { resolution: 'low', path: '/models/low/hybrid_lube.glb', file_size: 512 }
        ]
      },

      // Accessories - Cleaning Products (3 products)
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
      {
        name: 'UV Sanitizing Case',
        description: 'Portable sanitizing case that uses UV-C light to eliminate 99.9% of bacteria and viruses from your toys. Features rechargeable battery and automatic 10-minute cleaning cycle.',
        price: 49.99,
        stock_quantity: 40,
        category_id: categoryIds['Cleaning Products'],
        images: ['/img/uv_case.jpg', '/img/uv_open.jpg', '/img/uv_light.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/uv_case.glb', file_size: 3500 },
          { resolution: 'medium', path: '/models/medium/uv_case.glb', file_size: 1750 },
          { resolution: 'low', path: '/models/low/uv_case.glb', file_size: 875 }
        ]
      },
      {
        name: 'Silicone Renewing Powder',
        description: 'Special formula powder that restores silicone toys to their original smooth, silky feel. Eliminates tackiness and extends the life of your premium toys.',
        price: 14.99,
        stock_quantity: 90,
        category_id: categoryIds['Cleaning Products'],
        images: ['/img/powder_jar.jpg', '/img/powder_application.jpg', '/img/powder_texture.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/powder_jar.glb', file_size: 1800 },
          { resolution: 'medium', path: '/models/medium/powder_jar.glb', file_size: 900 },
          { resolution: 'low', path: '/models/low/powder_jar.glb', file_size: 450 }
        ]
      },

      // Accessories - Storage (3 products)
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
      },
      {
        name: 'Premium Toy Chest',
        description: 'Luxurious storage chest with combination lock, customizable dividers, charging port for electronic devices, and hidden bottom compartment.',
        price: 89.99,
        stock_quantity: 25,
        category_id: categoryIds['Storage'],
        images: ['/img/chest_exterior.jpg', '/img/chest_interior.jpg', '/img/chest_dividers.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/toy_chest.glb', file_size: 4800 },
          { resolution: 'medium', path: '/models/medium/toy_chest.glb', file_size: 2400 },
          { resolution: 'low', path: '/models/low/toy_chest.glb', file_size: 1200 }
        ]
      },
      {
        name: 'Individual Toy Pouches (Set of 5)',
        description: 'Set of 5 dust-proof, lint-free storage pouches in different sizes. Made from antimicrobial fabric with color-coded drawstrings for easy identification.',
        price: 24.99,
        stock_quantity: 60,
        category_id: categoryIds['Storage'],
        images: ['/img/pouches_set.jpg', '/img/pouch_detail.jpg', '/img/pouch_sizes.jpg'],
        models: [
          { resolution: 'high', path: '/models/high/toy_pouches.glb', file_size: 2800 },
          { resolution: 'medium', path: '/models/medium/toy_pouches.glb', file_size: 1400 },
          { resolution: 'low', path: '/models/low/toy_pouches.glb', file_size: 700 }
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