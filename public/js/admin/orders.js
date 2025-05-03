document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const ordersTableBody = document.getElementById('orders-table-body');
    const statusFilter = document.getElementById('status-filter');
    const startDateFilter = document.getElementById('start-date-filter');
    const endDateFilter = document.getElementById('end-date-filter');
    const applyFiltersBtn = document.getElementById('apply-filters');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const paginationDiv = document.getElementById('pagination');
    const orderModal = document.getElementById('order-modal');
    const orderDetails = document.getElementById('order-details');
    const closeModal = document.querySelector('.close');

    // State
    let currentPage = 1;
    let totalPages = 1;

    // Load orders
    loadOrders();

    // Event listeners
    applyFiltersBtn.addEventListener('click', () => {
        currentPage = 1;
        loadOrders();
    });

    resetFiltersBtn.addEventListener('click', () => {
        statusFilter.value = '';
        startDateFilter.value = '';
        endDateFilter.value = '';
        currentPage = 1;
        loadOrders();
    });

    closeModal.addEventListener('click', () => {
        orderModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === orderModal) {
            orderModal.style.display = 'none';
        }
    });

    // Functions
    function loadOrders() {
        const params = new URLSearchParams({
            page: currentPage,
            limit: 20,
            status: statusFilter.value || '',
            startDate: startDateFilter.value || '',
            endDate: endDateFilter.value || ''
        });

        fetch(`/api/admin/orders?${params}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Orders data:', data); // Debug log
                displayOrders(data.orders || []);
                setupPagination(data.pagination || { totalPages: 1 });
            })
            .catch(error => {
                console.error('Error loading orders:', error);
                showNotification('Error loading orders', 'error');
                // Display empty table on error
                ordersTableBody.innerHTML = '<tr><td colspan="7">Error loading orders</td></tr>';
            });
    }

    function displayOrders(orders) {
        ordersTableBody.innerHTML = '';

        orders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${order.order_id}</td>
                <td>${order.username}</td>
                <td>
                    <select class="status-dropdown" data-order-id="${order.order_id}">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
                <td>$${order.total_amount.toFixed(2)}</td>
                <td>${order.item_count}</td>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn-small view-order" data-order-id="${order.order_id}">View</button>
                </td>
            `;
            ordersTableBody.appendChild(row);

            // Add event listeners
            const statusDropdown = row.querySelector('.status-dropdown');
            statusDropdown.addEventListener('change', () => updateOrderStatus(order.order_id, statusDropdown.value));

            const viewBtn = row.querySelector('.view-order');
            viewBtn.addEventListener('click', () => viewOrderDetails(order.order_id));
        });
    }

    function setupPagination(pagination) {
        paginationDiv.innerHTML = '';
        totalPages = pagination.totalPages;

        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.innerHTML = '&laquo;';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                loadOrders();
            }
        });
        paginationDiv.appendChild(prevBtn);

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = 'pagination-btn' + (i === currentPage ? ' active' : '');
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => {
                currentPage = i;
                loadOrders();
            });
            paginationDiv.appendChild(pageBtn);
        }

        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.innerHTML = '&raquo;';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                loadOrders();
            }
        });
        paginationDiv.appendChild(nextBtn);
    }

    function updateOrderStatus(orderId, status) {
        fetch(`/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('Order status updated successfully', 'success');
                }
            })
            .catch(error => {
                console.error('Error updating order status:', error);
                showNotification('Error updating order status', 'error');
            });
    }

    function viewOrderDetails(orderId) {
        fetch(`/api/admin/orders/${orderId}`)
            .then(response => response.json())
            .then(order => {
                orderDetails.innerHTML = `
                    <h3>Order #${order.order_id}</h3>
                    <p><strong>Customer:</strong> ${order.username} (${order.email})</p>
                    <p><strong>Status:</strong> ${order.status}</p>
                    <p><strong>Total Amount:</strong> $${order.total_amount.toFixed(2)}</p>
                    <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
                    <p><strong>Shipping Address:</strong> ${order.shipping_address}</p>
                    <p><strong>Payment Method:</strong> ${order.payment_method}</p>
                    
                    <h4>Order Items:</h4>
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Quantity</th>
                                <th>Price</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.items.map(item => `
                                <tr>
                                    <td>${item.name}</td>
                                    <td>${item.quantity}</td>
                                    <td>$${item.price.toFixed(2)}</td>
                                    <td>$${(item.quantity * item.price).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
                orderModal.style.display = 'block';
            })
            .catch(error => {
                console.error('Error loading order details:', error);
                showNotification('Error loading order details', 'error');
            });
    }

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