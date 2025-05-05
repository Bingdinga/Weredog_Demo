document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    fetch('/api/auth/check')
        .then(response => response.json())
        .then(data => {
            if (!data.authenticated || data.user.role !== 'admin') {
                window.location.href = '/';
                return;
            }

            // Initialize dashboard
            loadDashboardData();
        })
        .catch(error => {
            console.error('Error checking authentication:', error);
            window.location.href = '/';
        });

    // Load all dashboard data
    function loadDashboardData() {
        loadOrderStatusCounts();
        loadRevenueMetrics();
        loadCustomerMetrics();
        loadTopProducts();
        loadCustomerInsights();
    }

    function loadOrderStatusCounts() {
        fetch('/api/admin/orders/status-counts')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`API returned ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                document.getElementById('pending-orders').textContent = data.pending || '0';
                document.getElementById('processing-orders').textContent = data.processing || '0';
                document.getElementById('shipped-orders').textContent = data.shipped || '0';
            })
            .catch(error => {
                console.error('Error loading order status counts:', error);
                // Set default values when API fails
                document.getElementById('pending-orders').textContent = '0';
                document.getElementById('processing-orders').textContent = '0';
                document.getElementById('shipped-orders').textContent = '0';
            });
    }

    function loadRevenueMetrics() {
        fetch('/api/admin/analytics/revenue-breakdown')
            .then(response => response.json())
            .then(data => {
                document.getElementById('year-revenue').textContent = `$${(data.year || 0).toFixed(2)}`;
                document.getElementById('quarter-revenue').textContent = `$${(data.quarter || 0).toFixed(2)}`;
                document.getElementById('month-revenue').textContent = `$${(data.month || 0).toFixed(2)}`;
            })
            .catch(error => {
                console.error('Error loading revenue metrics:', error);
            });
    }

    function loadCustomerMetrics() {
        fetch('/api/admin/analytics/customer-breakdown')
            .then(response => response.json())
            .then(data => {
                document.getElementById('year-customers').textContent = data.year || '0';
                document.getElementById('quarter-customers').textContent = data.quarter || '0';
                document.getElementById('month-customers').textContent = data.month || '0';
            })
            .catch(error => {
                console.error('Error loading customer metrics:', error);
            });
    }

    // Load top products
    function loadTopProducts() {
        fetch('/api/admin/analytics/top-products?limit=5')
            .then(response => response.json())
            .then(products => {
                const productsContainer = document.getElementById('top-products');
                productsContainer.innerHTML = '';

                products.forEach(product => {
                    const productElement = document.createElement('div');
                    productElement.className = 'product-item';
                    productElement.innerHTML = `
                        <div>
                            <h4>${product.name}</h4>
                            <p>${product.units_sold} units sold</p>
                        </div>
                        <div>
                            <strong>$${product.revenue.toFixed(2)}</strong>
                        </div>
                    `;
                    productsContainer.appendChild(productElement);
                });
            })
            .catch(error => {
                console.error('Error loading top products:', error);
            });
    }

    // Load customer insights
    function loadCustomerInsights() {
        fetch('/api/admin/analytics/customer-insights')
            .then(response => response.json())
            .then(data => {
                document.getElementById('total-customers-insight').textContent = data.total_customers || '0';
                document.getElementById('avg-orders-per-customer').textContent = (data.avg_orders_per_customer || 0).toFixed(1);
                document.getElementById('avg-customer-value').textContent = `$${(data.avg_customer_value || 0).toFixed(2)}`;
            })
            .catch(error => {
                console.error('Error loading customer insights:', error);
            });
    }

    // Load recent activity
    // function loadRecentActivity() {
    //     // Load recent orders
    //     fetch('/api/admin/orders/recent?limit=5')
    //         .then(response => response.json())
    //         .then(orders => {
    //             const ordersContainer = document.getElementById('recent-orders');
    //             ordersContainer.innerHTML = '';

    //             orders.forEach(order => {
    //                 const orderElement = document.createElement('div');
    //                 orderElement.className = 'activity-item';
    //                 orderElement.innerHTML = `
    //                     <div>
    //                         <strong>Order #${order.order_id}</strong>
    //                         <p>$${order.total_amount.toFixed(2)} - ${order.status}</p>
    //                     </div>
    //                     <div>
    //                         ${new Date(order.created_at).toLocaleDateString()}
    //                     </div>
    //                 `;
    //                 ordersContainer.appendChild(orderElement);
    //             });
    //         })
    //         .catch(error => {
    //             console.error('Error loading recent orders:', error);
    //         });

    //     // Load inventory alerts
    //     fetch('/api/admin/inventory/products?low_stock=true')
    //         .then(response => response.json())
    //         .then(products => {
    //             const alertsContainer = document.getElementById('inventory-alerts');
    //             alertsContainer.innerHTML = '';

    //             const lowStockProducts = products.filter(p => p.stock_quantity <= p.low_stock_threshold);

    //             if (lowStockProducts.length === 0) {
    //                 alertsContainer.innerHTML = '<p>No low stock alerts</p>';
    //                 return;
    //             }

    //             lowStockProducts.forEach(product => {
    //                 const alertElement = document.createElement('div');
    //                 alertElement.className = 'activity-item';
    //                 alertElement.innerHTML = `
    //                     <div>
    //                         <strong>${product.name}</strong>
    //                         <p>Low stock: ${product.stock_quantity} remaining</p>
    //                     </div>
    //                     <div>
    //                         <span class="low-stock-badge">Low Stock</span>
    //                     </div>
    //                 `;
    //                 alertsContainer.appendChild(alertElement);
    //             });
    //         })
    //         .catch(error => {
    //             console.error('Error loading inventory alerts:', error);
    //         });
    // }

    // Navigation handling
    const navLinks = document.querySelectorAll('.admin-sidebar-nav a');
    navLinks.forEach(link => {
        if (link.getAttribute('href').startsWith('#')) {
            link.addEventListener('click', (e) => {
                e.preventDefault();

                // Update active link
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                // Navigate to the page
                const targetPage = link.getAttribute('href').substring(1);
                if (targetPage && targetPage !== 'dashboard') {
                    window.location.href = `/admin/${targetPage}`;
                }
            });
        }
    });
});