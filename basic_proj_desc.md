# E-Commerce Website with 3D Product Visualization

This e-commerce platform features interactive 3D product visualization, user accounts, shopping carts, wishlists, and advanced admin features using a streamlined technology stack.

## Technology Stack

### Backend
- **Node.js**: Server-side JavaScript runtime environment
- **Express.js**: Web application framework for API endpoints and page serving
- **SQLite**: Lightweight database for product catalog, user accounts, orders, and cart data
- **Better-SQLite3**: Efficient, synchronous SQLite driver for Node.js
- **express-session**: Session management for shopping carts and user authentication

### Frontend
- **Vanilla JavaScript**: Pure JavaScript for client-side functionality
- **Three.js**: 3D graphics library for interactive product visualization
- **HTML5**: Semantic markup for content structure
- **CSS3**: Custom styling with responsive design for all devices

## SQLite Database Schema

```sql
-- Users table
CREATE TABLE users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role TEXT DEFAULT 'customer', -- 'customer', 'admin', 'manager'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    parent_id INTEGER,
    FOREIGN KEY (parent_id) REFERENCES categories(category_id)
);

-- Products table
CREATE TABLE products (
    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    category_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- 3D Model optimization table
CREATE TABLE product_models (
    model_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    model_path TEXT NOT NULL,
    resolution TEXT NOT NULL, -- 'high', 'medium', 'low'
    file_size INTEGER, -- size in KB
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Product images table
CREATE TABLE product_images (
    image_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    image_path TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Shopping cart table
CREATE TABLE carts (
    cart_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    session_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Cart items table
CREATE TABLE cart_items (
    item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    cart_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (cart_id) REFERENCES carts(cart_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Wishlist table
CREATE TABLE wishlists (
    wishlist_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    UNIQUE(user_id, product_id)
);

-- Recently viewed products
CREATE TABLE recently_viewed (
    view_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Orders table
CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    total_amount REAL NOT NULL,
    discount_amount REAL DEFAULT 0,
    shipping_address TEXT NOT NULL,
    billing_address TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    discount_code_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (discount_code_id) REFERENCES discount_codes(code_id)
);

-- Order items table
CREATE TABLE order_items (
    order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Discount codes/coupons table
CREATE TABLE discount_codes (
    code_id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    discount_percent REAL,
    discount_amount REAL,
    minimum_order_amount REAL DEFAULT 0,
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_to TIMESTAMP,
    is_single_use BOOLEAN DEFAULT 0,
    times_used INTEGER DEFAULT 0,
    max_uses INTEGER
);

-- Product reviews table
CREATE TABLE reviews (
    review_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Shipping addresses
CREATE TABLE shipping_addresses (
    address_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    street_address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT NOT NULL,
    is_default BOOLEAN DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Inventory transaction log for admin tracking
CREATE TABLE inventory_log (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    quantity_change INTEGER NOT NULL,
    reason TEXT NOT NULL, -- 'order', 'restock', 'adjustment', 'return'
    reference_id TEXT, -- order_id or other reference
    admin_user_id INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (admin_user_id) REFERENCES users(user_id)
);

-- Analytics tracking
CREATE TABLE page_views (
    view_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    session_id TEXT NOT NULL,
    page_type TEXT NOT NULL, -- 'product', 'category', 'home', 'cart', 'checkout'
    product_id INTEGER,
    category_id INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    device_type TEXT,
    referrer TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- Admin activity log
CREATE TABLE admin_log (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    action_type TEXT NOT NULL, -- 'product_add', 'product_edit', 'order_update', etc.
    action_details TEXT,
    ip_address TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(user_id)
);

-- Create necessary indexes for performance
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_page_views_product ON page_views(product_id);
CREATE INDEX idx_recently_viewed_user ON recently_viewed(user_id);
CREATE INDEX idx_inventory_log_product ON inventory_log(product_id);
```

## Project Structure

```
e-commerce-site/
  ├── api/                   # Backend API endpoints
  │   ├── auth.js            # User authentication routes
  │   ├── products.js        # Product data routes
  │   ├── cart.js            # Shopping cart functionality
  │   ├── wishlist.js        # Wishlist management
  │   ├── orders.js          # Order processing
  │   ├── payment.js         # Payment processing integration
  │   ├── admin/             # Admin-specific endpoints
  │   │   ├── inventory.js   # Inventory management
  │   │   ├── analytics.js   # Analytics data
  │   │   ├── users.js       # User management
  │   │   └── discounts.js   # Discount code management
  ├── db/                    # Database layer
  │   ├── database.js        # SQLite connection and setup
  │   ├── schema.sql         # Database schema definitions
  │   └── migrations/        # Schema version management
  ├── middleware/            # Custom middleware
  │   ├── auth.js            # Authentication middleware
  │   ├── admin.js           # Admin access control
  │   └── analytics.js       # Page view tracking
  ├── public/                # Static frontend assets
  │   ├── js/
  │   │   ├── main.js        # Core functionality
  │   │   ├── cart.js        # Shopping cart interface
  │   │   ├── wishlist.js    # Wishlist functionality
  │   │   ├── checkout.js    # Checkout process
  │   │   └── product-view.js # 3D product visualization
  │   ├── css/
  │   ├── models/            # 3D model files (.glb, .gltf)
  │   │   ├── high/          # High resolution models
  │   │   ├── medium/        # Medium resolution models
  │   │   └── low/           # Low resolution models (mobile)
  │   └── img/
  ├── views/                 # HTML templates
  │   ├── home.html          # Homepage
  │   ├── products.html      # Product listings
  │   ├── product-detail.html # Single product page with 3D viewer
  │   ├── cart.html          # Shopping cart page
  │   ├── wishlist.html      # User wishlist page
  │   ├── checkout.html      # Checkout process
  │   ├── account.html       # User account management
  │   └── admin/             # Admin interface templates
  │       ├── dashboard.html # Admin overview
  │       ├── inventory.html # Inventory management
  │       ├── orders.html    # Order management
  │       ├── analytics.html # Analytics dashboard
  │       └── discounts.html # Discount code management
  ├── utils/                 # Helper functions
  │   ├── modelLoader.js     # 3D model resolution detection
  │   ├── validators.js      # Input validation
  │   └── logger.js          # Application logging
  ├── app.js                 # Application entry point
  └── package.json
```

## Key Features

### Customer-Facing Features
- User account registration and management
- Product catalog with filtering and search
- Interactive 3D product visualization with resolution optimization
- Shopping cart functionality
- Wishlist for saving products for later
- Recently viewed products tracking
- Discount code/coupon system
- Checkout and payment processing
- Order history and tracking
- Product reviews and ratings
- Responsive design for mobile and desktop users

### Admin Features
- Comprehensive dashboard for store management
- Inventory management with stock alerts
- Order processing and management
- User management and permissions
- Discount code creation and management
- Sales and visitor analytics reporting
- Admin action logging for security

## Implementation Approach

The application follows a clean separation between backend and frontend concerns:

1. **Backend**: Serves JSON API endpoints and handles data persistence
2. **Frontend**: Pure JavaScript for DOM manipulation and user interactions
3. **3D Visualization**: Three.js for rendering 3D models with device-appropriate resolution

This architecture provides a complete e-commerce solution with advanced features while maintaining a relatively simple technology stack based on Node.js, Express, SQLite, and vanilla JavaScript with Three.js.