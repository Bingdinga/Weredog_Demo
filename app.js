const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import middleware
const authMiddleware = require('./middleware/auth');
const adminMiddleware = require('./middleware/admin');
const analyticsMiddleware = require('./middleware/analytics');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false })); // Disable CSP for Three.js to work
app.use(morgan('dev'));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Analytics tracking
app.use(analyticsMiddleware);

// Import routes
const authRoutes = require('./api/auth');
const productRoutes = require('./api/products');
const cartRoutes = require('./api/cart');
const wishlistRoutes = require('./api/wishlist');
const orderRoutes = require('./api/orders');
const paymentRoutes = require('./api/payment');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);

// Admin routes will be added later
// const adminInventoryRoutes = require('./api/admin/inventory');
// const adminAnalyticsRoutes = require('./api/admin/analytics');
// const adminUsersRoutes = require('./api/admin/users');
// const adminDiscountsRoutes = require('./api/admin/discounts');
// app.use('/api/admin/inventory', authMiddleware, adminMiddleware, adminInventoryRoutes);
// app.use('/api/admin/analytics', authMiddleware, adminMiddleware, adminAnalyticsRoutes);
// app.use('/api/admin/users', authMiddleware, adminMiddleware, adminUsersRoutes);
// app.use('/api/admin/discounts', authMiddleware, adminMiddleware, adminDiscountsRoutes);

// Serve HTML views
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/home.html'));
});

app.get('/products', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/products.html'));
});

app.get('/product/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/product-detail.html'));
});

// Login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/login.html'));
});

// Register page
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/register.html'));
});

app.get('/cart', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/cart.html'));
});

app.get('/dressing-room', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/dressing-room.html'));
});

app.get('/wishlist', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'views/wishlist.html'));
});

app.get('/checkout', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'views/checkout.html'));
});

app.get('/account', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'views/account.html'));
});

// Admin views (protected by admin middleware)
app.get('/admin', authMiddleware, adminMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'views/admin/dashboard.html'));
});

app.get('/admin/inventory', authMiddleware, adminMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'views/admin/inventory.html'));
});

app.get('/admin/orders', authMiddleware, adminMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'views/admin/orders.html'));
});

app.get('/admin/analytics', authMiddleware, adminMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'views/admin/analytics.html'));
});

app.get('/admin/discounts', authMiddleware, adminMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'views/admin/discounts.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
