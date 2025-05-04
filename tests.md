# Weredog Demo Website Testing Checklist

## General Navigation & Layout
- [ ] Verify the logo links back to home page
- [ ] Confirm navigation menu works on all pages
- [ ] Test the back-to-top button functionality
- [ ] Check that footer appears on all pages
- [ ] Ensure responsive design works on different screen sizes

## User Authentication
- [ ] Register a new account with valid details
- [ ] Attempt registration with invalid details (password requirements, email format)
- [ ] Test login with valid credentials
- [ ] Test login with invalid credentials
- [ ] Verify logout functionality
- [ ] Confirm session persistence (stay logged in while browsing)

## Home Page
- [ ] Verify 3D model in hero section loads correctly
- [ ] Check featured products section displays products
- [ ] Confirm featured products have functioning 3D previews
- [ ] Test all links in the info section

## Products Browsing
- [ ] Browse all products page
- [ ] Test category filtering functionality
- [ ] Try price range filtering
- [ ] Test sorting options (featured, price low-high, price high-low, newest)
- [ ] Verify search functionality
- [ ] Test pagination controls
- [ ] Check that 3D previews load for product cards

## Product Detail Page
- [ ] View multiple different product detail pages
- [ ] Verify 3D model viewer loads and can be interacted with
- [ ] Test model rotation and zoom functionality
- [ ] Try the resolution cycle button
- [ ] Test quantity adjustment controls
- [ ] Check "Add to Cart" functionality
- [ ] Test "Add to Wishlist" functionality
- [ ] Verify product information display (name, price, description)
- [ ] Test product tabs (description, details, reviews)

## Cart Functionality
- [ ] Add multiple products to cart
- [ ] Verify cart count updates in navigation
- [ ] View cart page
- [ ] Update product quantities in cart
- [ ] Remove items from cart
- [ ] Confirm cart total updates correctly
- [ ] Test "Continue Shopping" button
- [ ] Try "Proceed to Checkout" button

## Wishlist
- [ ] Add products to wishlist (requires login)
- [ ] View wishlist page
- [ ] Remove items from wishlist
- [ ] Check "View Details" links for products in wishlist
- [ ] Verify 3D previews load in wishlist items

## 3D Dressing Room
- [ ] Access the dressing room page
- [ ] Test product selection dropdown
- [ ] Try different mannequin options
- [ ] Verify 3D models load correctly
- [ ] Test movement controls (arrow keys, Z/X keys, WASD for rotation)
- [ ] Check "Reset Position" functionality
- [ ] Test camera rotation and zoom

## User Account
- [ ] View account page (requires login)
- [ ] Check profile section and details
- [ ] Test updating profile information
- [ ] Try changing password
- [ ] View order history
- [ ] Check shipping addresses section
- [ ] Add a new shipping address
- [ ] Edit existing shipping address
- [ ] Delete shipping address
- [ ] Access wishlist from account page

## Admin Features (if you have admin access)
- [ ] Login as admin
- [ ] Access admin dashboard
- [ ] Check sales overview statistics
- [ ] View top products
- [ ] Check customer insights
- [ ] View recent activity
- [ ] Test inventory management
- [ ] Update product stock levels
- [ ] Filter inventory products
- [ ] View and manage orders
- [ ] Use order status filters
- [ ] Change order statuses
- [ ] View order details
- [ ] Check analytics page
- [ ] Test date range filters on analytics
- [ ] View sales charts

## Technical Features
- [ ] Verify 3D model loading works across all relevant pages
- [ ] Check performance with multiple 3D models loaded
- [ ] Ensure form validations work correctly
- [ ] Test error messages for invalid inputs
- [ ] Verify that notifications display correctly
- [ ] Check session handling after inactivity
- [ ] Verify secure routes require authentication

## Cross-browser & Device Testing
- [ ] Test on Chrome/Firefox/Safari/Edge
- [ ] Check responsive design on mobile devices
- [ ] Test touch interactions for 3D models on mobile
- [ ] Verify navigation works on small screens