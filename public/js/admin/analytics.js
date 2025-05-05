document.addEventListener('DOMContentLoaded', () => {
    // Chart context
    let salesChart, topProductsChart, customerInsightsChart;

    // Load initial data
    loadSalesOverview();
    loadSalesByDate();
    loadTopProducts();
    loadCustomerInsights();

    // Function to load sales overview data
    function loadSalesOverview() {
        fetch('/api/admin/analytics/sales-overview')
            .then(response => response.json())
            .then(data => {
                document.getElementById('total-orders').textContent = data.total_orders || '0';
                document.getElementById('total-revenue').textContent = `$${(data.total_revenue || 0).toFixed(2)}`;
                document.getElementById('avg-order-value').textContent = `$${(data.average_order_value || 0).toFixed(2)}`;
                document.getElementById('total-customers').textContent = data.total_customers || '0';
            })
            .catch(error => {
                console.error('Error loading sales overview:', error);
                showNotification('Error loading sales overview', 'error');
            });
    }

    // Function to load sales trend data
    function loadSalesByDate() {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3); // Last 3 months

        const params = new URLSearchParams({
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0]
        });

        fetch(`/api/admin/analytics/sales-by-date?${params}`)
            .then(response => response.json())
            .then(data => {
                createSalesChart(data);
            })
            .catch(error => {
                console.error('Error loading sales data:', error);
                showNotification('Error loading sales data', 'error');
            });
    }

    // Function to load top products
    function loadTopProducts() {
        fetch('/api/admin/analytics/top-products?limit=10')
            .then(response => response.json())
            .then(data => {
                createTopProductsChart(data);
                // Remove this line since we're removing the table:
                // displayTopProductsTable(data);
            })
            .catch(error => {
                console.error('Error loading top products:', error);
                showNotification('Error loading top products', 'error');
            });
    }

    // Function to load customer insights
    function loadCustomerInsights() {
        // Add a small delay to ensure DOM is fully loaded
        setTimeout(() => {
            fetch('/api/admin/analytics/customer-insights')
                .then(response => response.json())
                .then(data => {
                    createCustomerInsightsChart(data);
                })
                .catch(error => {
                    console.error('Error loading customer insights:', error);
                });
        }, 500); // 500ms delay
    }

    // Create sales trend chart
    function createSalesChart(data) {
        const ctx = document.getElementById('sales-chart').getContext('2d');

        if (salesChart) {
            salesChart.destroy();
        }

        salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => new Date(d.date).toLocaleDateString()),
                datasets: [{
                    label: 'Revenue',
                    data: data.map(d => d.revenue),
                    borderColor: 'rgba(142, 45, 226, 1)',
                    backgroundColor: 'rgba(142, 45, 226, 0.1)',
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Revenue Trend'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return '$' + value;
                            }
                        }
                    }
                }
            }
        });
    }

    // Create top products chart
    function createTopProductsChart(data) {
        const ctx = document.getElementById('top-products-chart').getContext('2d');

        if (topProductsChart) {
            topProductsChart.destroy();
        }

        topProductsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(p => p.name),
                datasets: [{
                    label: 'Units Sold',
                    data: data.map(p => p.units_sold),
                    backgroundColor: 'rgba(142, 45, 226, 0.7)',
                    borderColor: 'rgba(142, 45, 226, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Top Selling Products'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }


    // Create customer insights charts
    function createCustomerInsightsChart(data) {
        console.log("Creating customer insights charts...");
        // console.log("Looking for canvas elements:",
        //     document.getElementById('customer-orders-chart'),
        //     document.getElementById('customer-spending-chart'));

        // Check if customer-orders-chart exists
        const ordersCanvas = document.getElementById('customer-orders-chart');
        if (!ordersCanvas) {
            console.error("customer-orders-chart element not found in the DOM");
            return;
        }

        // Check if customer-spending-chart exists
        const spendingCanvas = document.getElementById('customer-spending-chart');
        if (!spendingCanvas) {
            console.error("customer-spending-chart element not found in the DOM");
            return;
        }

        try {
            // Get canvas contexts
            const ordersCtx = ordersCanvas.getContext('2d');
            const spendingCtx = spendingCanvas.getContext('2d');

            // Create order distribution chart
            new Chart(ordersCtx, {
                type: 'bar',
                data: {
                    labels: data.orderDistribution.map(d => d.order_range),
                    datasets: [{
                        label: 'Number of Customers',
                        data: data.orderDistribution.map(d => d.customer_count),
                        backgroundColor: 'rgba(142, 45, 226, 0.7)',
                        borderColor: 'rgba(142, 45, 226, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Customer Order Frequency Distribution'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });

            // Create spending distribution chart
            new Chart(spendingCtx, {
                type: 'bar',
                data: {
                    labels: data.spendingDistribution.map(d => d.spending_range),
                    datasets: [{
                        label: 'Number of Customers',
                        data: data.spendingDistribution.map(d => d.customer_count),
                        backgroundColor: 'rgba(255, 45, 85, 0.7)',
                        borderColor: 'rgba(255, 45, 85, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Customer Spending Distribution'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });

            // Update the stats display
            document.getElementById('total-customers-insight').textContent = data.stats.total_customers || '0';
            document.getElementById('avg-orders-per-customer').textContent = (data.stats.avg_orders_per_customer || 0).toFixed(1);
            document.getElementById('avg-customer-value').textContent = `$${(data.stats.avg_customer_value || 0).toFixed(2)}`;

            console.log("Customer insights charts created successfully");
        } catch (error) {
            console.error("Error creating customer insights charts:", error);
        }
    }

    // Display top products table
    function displayTopProductsTable(data) {
        const tableBody = document.getElementById('top-products-table-body');
        tableBody.innerHTML = '';

        data.forEach((product, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${product.name}</td>
                <td>${product.units_sold}</td>
                <td>$${product.revenue.toFixed(2)}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Notification function
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Date range picker for custom reports
    const startDatePicker = document.getElementById('start-date');
    const endDatePicker = document.getElementById('end-date');
    const refreshButton = document.getElementById('refresh-data');

    refreshButton.addEventListener('click', () => {
        if (startDatePicker.value && endDatePicker.value) {
            const params = new URLSearchParams({
                start_date: startDatePicker.value,
                end_date: endDatePicker.value
            });

            fetch(`/api/admin/analytics/sales-by-date?${params}`)
                .then(response => response.json())
                .then(data => {
                    createSalesChart(data);
                })
                .catch(error => {
                    console.error('Error loading filtered sales data:', error);
                    showNotification('Error loading filtered sales data', 'error');
                });
        } else {
            loadSalesByDate();
        }
    });
});