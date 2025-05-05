document.addEventListener('DOMContentLoaded', () => {
    // Chart context
    let salesChart, topProductsChart, orderFrequencyChart, orderValueChart;

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
        // Default to last year if no dates are specified
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1); // Last year

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
            })
            .catch(error => {
                console.error('Error loading top products:', error);
                showNotification('Error loading top products', 'error');
            });
    }

    // Function to load customer insights
    function loadCustomerInsights() {
        fetch('/api/admin/analytics/customer-insights')
            .then(response => response.json())
            .then(data => {
                displayCustomerMetrics(data);
                createCustomerInsightsCharts(data);
            })
            .catch(error => {
                console.error('Error loading customer insights:', error);
                showNotification('Error loading customer insights', 'error');
            });
    }

    // Display customer metrics
    function displayCustomerMetrics(data) {
        // Customer counts
        document.getElementById('customers-all-time').textContent = data.customers.allTime;
        document.getElementById('customers-year').textContent = data.customers.year;
        document.getElementById('customers-quarter').textContent = data.customers.quarter;
        document.getElementById('customers-month').textContent = data.customers.month;

        // Average orders per customer
        document.getElementById('avg-orders-all-time').textContent = data.avgOrdersPerCustomer.allTime.toFixed(1);
        document.getElementById('avg-orders-year').textContent = data.avgOrdersPerCustomer.year.toFixed(1);
        document.getElementById('avg-orders-quarter').textContent = data.avgOrdersPerCustomer.quarter.toFixed(1);
        document.getElementById('avg-orders-month').textContent = data.avgOrdersPerCustomer.month.toFixed(1);

        // Average order value
        document.getElementById('avg-value-all-time').textContent = `$${data.avgOrderValue.allTime.toFixed(2)}`;
        document.getElementById('avg-value-year').textContent = `$${data.avgOrderValue.year.toFixed(2)}`;
        document.getElementById('avg-value-quarter').textContent = `$${data.avgOrderValue.quarter.toFixed(2)}`;
        document.getElementById('avg-value-month').textContent = `$${data.avgOrderValue.month.toFixed(2)}`;
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
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
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
    function createCustomerInsightsCharts(data) {
        createOrderFrequencyChart(data.orderDistribution);
        createOrderValueChart(data.avgOrderValueDistribution);
    }

    function createOrderFrequencyChart(orderDistribution) {
        const canvas = document.getElementById('customer-orders-chart');
        if (!canvas) {
            console.error("customer-orders-chart element not found in the DOM");
            return;
        }

        const ctx = canvas.getContext('2d');

        if (orderFrequencyChart) {
            orderFrequencyChart.destroy();
        }

        orderFrequencyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: orderDistribution.map(d => d.order_count.toString()),
                datasets: [{
                    label: 'Number of Customers',
                    data: orderDistribution.map(d => d.customer_count),
                    backgroundColor: 'rgba(142, 45, 226, 0.7)',
                    borderColor: 'rgba(142, 45, 226, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,  // Add this line to control aspect ratio
                plugins: {
                    title: {
                        display: true,
                        text: 'Customer Order Frequency'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Number of Orders'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Customers'
                        },
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    // Update the createOrderValueChart function
    function createOrderValueChart(orderValueDistribution) {
        const canvas = document.getElementById('order-value-chart');
        if (!canvas) {
            console.error("order-value-chart element not found in the DOM");
            return;
        }

        const ctx = canvas.getContext('2d');

        if (orderValueChart) {
            orderValueChart.destroy();
        }

        orderValueChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: orderValueDistribution.map(d => `$${d.bin_floor}-$${d.bin_ceiling}`),
                datasets: [{
                    label: 'Number of Orders',
                    data: orderValueDistribution.map(d => d.order_count),
                    backgroundColor: 'rgba(255, 45, 85, 0.7)',
                    borderColor: 'rgba(255, 45, 85, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,  // Add this line to control aspect ratio
                plugins: {
                    title: {
                        display: true,
                        text: 'Order Value Distribution'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Order Value Range'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Orders'
                        },
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
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
});