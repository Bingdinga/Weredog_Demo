document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const ordersTableBody = document.getElementById('orders-table-body');
    const statusFilter = document.getElementById('status-filter');
    const startDateFilter = document.getElementById('start-date-filter');
    const endDateFilter = document.getElementById('end-date-filter');
    // const applyFiltersBtn = document.getElementById('apply-filters');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const paginationDiv = document.getElementById('pagination');
    const orderModal = document.getElementById('order-modal');
    const orderDetails = document.getElementById('order-details');
    const closeModal = document.querySelector('.close');
    // const sortFilter = document.getElementById('sort-filter');
    const usernameSearch = document.getElementById('username-search');

    // State
    let currentPage = 1;
    let totalPages = 1;
    let currentSort = 'created_at';
    let sortDirection = 'desc'; // 'asc' or 'desc'

    // Load orders
    loadOrders();

    // debugPaginationData();

    // Add event listeners for sortable columns and initialize the UI
    document.querySelectorAll('th.sortable').forEach(th => {
        // Set initial sort indicator based on default sort
        if (th.dataset.sort === currentSort) {
            th.classList.add(`sort-${sortDirection}`);
        }

        th.addEventListener('click', () => {
            const sortField = th.dataset.sort;

            // Toggle sort direction if clicking the same column
            if (sortField === currentSort) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort = sortField;
                sortDirection = 'desc'; // Default to descending for new sort column
            }

            // Update UI to show sort direction
            document.querySelectorAll('th.sortable').forEach(header => {
                header.classList.remove('sort-asc', 'sort-desc');
            });
            th.classList.add(`sort-${sortDirection}`);

            // Reset to first page and load orders with new sort
            currentPage = 1;
            loadOrders();
        });
    });

    // Event listeners for filter changes

    let searchTimeout;
    usernameSearch.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1; // Reset to first page when searching
            loadOrders();
        }, 300); // 300ms delay to avoid too many requests while typing
    });

    statusFilter.addEventListener('change', () => {
        currentPage = 1;
        loadOrders();
    });

    // sortFilter.addEventListener('change', () => {
    //     currentPage = 1; // Reset to first page when changing sort
    //     loadOrders();
    // });

    startDateFilter.addEventListener('change', () => {
        currentPage = 1;
        loadOrders();
    });

    endDateFilter.addEventListener('change', () => {
        currentPage = 1;
        loadOrders();
    });

    resetFiltersBtn.addEventListener('click', () => {
        statusFilter.value = '';
        startDateFilter.value = '';
        endDateFilter.value = '';
        usernameSearch.value = ''; // Clear the search
        // Reset to default sort
        currentSort = 'created_at';
        sortDirection = 'desc';

        // Update UI to show current sort
        document.querySelectorAll('th.sortable').forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
            if (header.dataset.sort === currentSort) {
                header.classList.add(`sort-${sortDirection}`);
            }
        });

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

    paginationDiv.addEventListener('click', (e) => {
        // Find the closest button element to the click target
        const button = e.target.closest('button');
        if (!button) return; // Click wasn't on a button

        // console.log("Pagination click detected:", button.textContent || button.innerHTML);

        // Handle previous button
        if (button.innerHTML === '&laquo;' && currentPage > 1) {
            currentPage--;
            loadOrders();
            return;
        }

        // Handle next button
        if (button.innerHTML === '&raquo;' && currentPage < totalPages) {
            currentPage++;
            loadOrders();
            return;
        }

        // Handle page number buttons
        const pageNum = parseInt(button.textContent);
        if (!isNaN(pageNum) && pageNum !== currentPage) {
            currentPage = pageNum;
            loadOrders();
        }
    });

    function debugPaginationData() {
        const params = new URLSearchParams({
            page: 1,
            limit: 5 // Small limit to ensure multiple pages
        });

        fetch(`/api/admin/orders?${params}`)
            .then(response => response.json())
            .then(data => {
                console.log("DEBUG - Pagination data:", data.pagination);
                console.log("DEBUG - Has multiple pages:", data.pagination.totalPages > 1);
                console.log("DEBUG - Total records:", data.pagination.total);
            })
            .catch(error => {
                console.error("DEBUG - Error fetching pagination data:", error);
            });
    }

    // Functions
    function loadOrders() {
        // console.log("loadOrders called with currentPage:", currentPage);

        const params = new URLSearchParams({
            page: currentPage,
            limit: 20,
            status: statusFilter.value || '',
            startDate: startDateFilter.value || '',
            endDate: endDateFilter.value || '',
            sort: currentSort,
            direction: sortDirection,
            search: usernameSearch.value || ''
        });

        // console.log("Fetching orders with params:", params.toString());

        // Show loading indicator
        ordersTableBody.innerHTML = '<tr><td colspan="7" class="loading-cell">Loading orders...</td></tr>';

        fetch(`/api/admin/orders?${params}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // console.log("Orders response:", {
                //     orderCount: data.orders ? data.orders.length : 0,
                //     pagination: data.pagination
                // });

                displayOrders(data.orders || []);
                setupPagination(data.pagination || { page: 1, total: 0, limit: 20 });
            })
            .catch(error => {
                console.error('Error loading orders:', error);
                showNotification('Error loading orders', 'error');
                ordersTableBody.innerHTML = '<tr><td colspan="7" class="error-cell">Error loading orders</td></tr>';
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
        // console.log("Setting up pagination with data:", pagination);

        paginationDiv.innerHTML = '';

        // Extract pagination data with safe fallbacks
        const page = parseInt(pagination.page) || 1;
        const total = parseInt(pagination.total) || 0;
        const limit = parseInt(pagination.limit) || 20;
        let totalPages = pagination.totalPages;

        // Calculate totalPages if it's missing or invalid
        if (!totalPages || totalPages < 1) {
            totalPages = Math.max(1, Math.ceil(total / limit));
        }

        // Update the current state
        currentPage = page;

        // console.log("Pagination values:", { page, totalPages, total, limit });

        // Don't show pagination if there's only one page
        if (total <= limit && page === 1) {
            paginationDiv.innerHTML = `<span class="pagination-info">Showing all ${total} records</span>`;
            return;
        }

        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn prev-page';
        prevBtn.innerHTML = '&laquo;';
        prevBtn.disabled = page <= 1;
        prevBtn.dataset.page = page - 1;
        paginationDiv.appendChild(prevBtn);

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = 'pagination-btn page-number' + (i === page ? ' active' : '');
            pageBtn.textContent = i;
            pageBtn.dataset.page = i;
            paginationDiv.appendChild(pageBtn);
        }

        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn next-page';
        nextBtn.innerHTML = '&raquo;';
        nextBtn.disabled = page >= totalPages;
        nextBtn.dataset.page = page + 1;
        paginationDiv.appendChild(nextBtn);

        // Add page info text
        const pageInfo = document.createElement('span');
        pageInfo.className = 'pagination-info';
        pageInfo.textContent = `Page ${page} of ${totalPages} (${total} total)`;
        paginationDiv.appendChild(pageInfo);

        // Set up a single event listener for all pagination buttons
        paginationDiv.addEventListener('click', function (e) {
            // Find the button that was clicked
            const button = e.target.closest('.pagination-btn');
            if (!button || button.disabled) return;

            // Get the page number from data attribute
            const newPage = parseInt(button.dataset.page);
            if (isNaN(newPage) || newPage === currentPage) return;

            // console.log(`Changing page from ${currentPage} to ${newPage}`);
            currentPage = newPage;
            loadOrders();
        });

        // console.log("Pagination setup complete with", totalPages, "pages");
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