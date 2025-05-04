document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const productTable = document.getElementById('product-table');
    const tableBody = document.getElementById('table-body');
    const searchInput = document.getElementById('search-input');
    const filterSelect = document.getElementById('filter-select');
    const stockFilter = document.getElementById('stock-filter');
    const applyButton = document.getElementById('apply-updates');
    const lowStockAlert = document.getElementById('low-stock-alert');
    const lowStockCount = document.getElementById('low-stock-count');

    // State
    let products = [];
    let filteredProducts = [];
    let pendingUpdates = {};

    // Load data
    loadInventory();
    loadCategories();
    checkLowStock();

    // Event listeners
    searchInput.addEventListener('input', filterProducts);
    filterSelect.addEventListener('change', filterProducts);
    stockFilter.addEventListener('change', filterProducts);
    applyButton.addEventListener('click', applyBulkUpdates);

    function loadCategories() {
        fetch('/api/products/categories')
            .then(response => response.json())
            .then(categories => {
                const filterSelect = document.getElementById('filter-select');

                // Keep the default "All Categories" option
                filterSelect.innerHTML = '<option value="">All Categories</option>';

                // Add main categories
                categories.forEach(category => {
                    const mainOption = document.createElement('option');
                    mainOption.value = category.category_id;
                    mainOption.textContent = category.name;
                    filterSelect.appendChild(mainOption);

                    // Add subcategories without special formatting
                    if (category.subcategories && category.subcategories.length > 0) {
                        category.subcategories.forEach(subcat => {
                            const subOption = document.createElement('option');
                            subOption.value = subcat.category_id;
                            // No indentation or special formatting
                            subOption.textContent = subcat.name;
                            filterSelect.appendChild(subOption);
                        });
                    }
                });
            })
            .catch(error => {
                console.error('Error loading categories:', error);
                showNotification('Error loading categories', 'error');
            });
    }

    function loadInventory() {
        fetch('/api/admin/inventory/products')
            .then(response => response.json())
            .then(data => {
                products = data;
                filteredProducts = data;
                renderTable();
            })
            .catch(error => {
                console.error('Error loading inventory:', error);
                showNotification('Error loading inventory data', 'error');
            });
    }

    function checkLowStock() {
        fetch('/api/admin/inventory/low-stock')
            .then(response => response.json())
            .then(data => {
                lowStockCount.textContent = data.length;
                lowStockAlert.style.display = data.length > 0 ? 'block' : 'none';
            })
            .catch(error => {
                console.error('Error checking low stock:', error);
            });
    }

    function filterProducts() {
        const searchTerm = searchInput.value.toLowerCase();
        const categoryFilter = filterSelect.value;
        const stockStatus = stockFilter.value;

        filteredProducts = products.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
                product.category_name?.toLowerCase().includes(searchTerm);
            const matchesCategory = !categoryFilter || product.category_id == categoryFilter;
            const matchesStock = stockStatus === 'all' ||
                (stockStatus === 'low' && product.stock_quantity <= product.low_stock_threshold) ||
                (stockStatus === 'ok' && product.stock_quantity > product.low_stock_threshold);

            return matchesSearch && matchesCategory && matchesStock;
        });

        renderTable();
    }

    function renderTable() {
        tableBody.innerHTML = '';

        filteredProducts.forEach(product => {
            const row = createTableRow(product);
            tableBody.appendChild(row);
        });

        // Update apply button state
        updateApplyButton();
    }

    function createTableRow(product) {
        const row = document.createElement('tr');
        const stockStatus = product.stock_quantity <= product.low_stock_threshold ? 'low' : 'normal';

        row.innerHTML = `
            <td>${product.product_id}</td>
            <td>${product.name}</td>
            <td>${product.category_name || 'Uncategorized'}</td>
            <td>
                <input type="number" 
                       class="form-control stock-input" 
                       value="${product.stock_quantity}" 
                       data-product-id="${product.product_id}"
                       min="0">
            </td>
            <td>
                <input type="number" 
                       class="form-control threshold-input" 
                       value="${product.low_stock_threshold}" 
                       data-product-id="${product.product_id}"
                       min="0">
            </td>
            <td>
                <input type="number" 
                       class="form-control price-input" 
                       value="${product.price}" 
                       data-product-id="${product.product_id}"
                       step="0.01"
                       min="0">
            </td>
            <td>
                <span class="stock-status ${stockStatus}">
                    ${stockStatus === 'low' ? 'Low Stock' : 'OK'}
                </span>
            </td>
        `;

        // Add event listeners to inputs
        const stockInput = row.querySelector('.stock-input');
        const thresholdInput = row.querySelector('.threshold-input');
        const priceInput = row.querySelector('.price-input');

        stockInput.addEventListener('change', () => trackUpdate(product.product_id, 'stock_quantity', stockInput.value));
        thresholdInput.addEventListener('change', () => trackUpdate(product.product_id, 'low_stock_threshold', thresholdInput.value));
        priceInput.addEventListener('change', () => trackUpdate(product.product_id, 'price', priceInput.value));

        return row;
    }

    function trackUpdate(productId, field, value) {
        if (!pendingUpdates[productId]) {
            pendingUpdates[productId] = {};
        }
        pendingUpdates[productId][field] = value;
        updateApplyButton();
    }

    function updateApplyButton() {
        const hasUpdates = Object.keys(pendingUpdates).length > 0;
        applyButton.disabled = !hasUpdates;
        applyButton.textContent = hasUpdates ? `Apply ${Object.keys(pendingUpdates).length} Changes` : 'No Changes';
    }

    function applyBulkUpdates() {
        if (Object.keys(pendingUpdates).length === 0) return;

        const updates = Object.entries(pendingUpdates).map(([productId, changes]) => {
            const product = products.find(p => p.product_id == productId);
            return {
                product_id: parseInt(productId),
                stock_quantity: changes.stock_quantity !== undefined ? parseInt(changes.stock_quantity) : product.stock_quantity,
                low_stock_threshold: changes.low_stock_threshold !== undefined ? parseInt(changes.low_stock_threshold) : product.low_stock_threshold,
                price: changes.price !== undefined ? parseFloat(changes.price) : product.price
            };
        });

        // First send individual updates
        Promise.all(updates.map(update =>
            fetch(`/api/admin/inventory/products/${update.product_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(update)
            })
        ))
            .then(responses => Promise.all(responses.map(r => r.json())))
            .then(results => {
                const failures = results.filter(r => !r.success);
                if (failures.length > 0) {
                    showNotification(`${failures.length} updates failed`, 'error');
                } else {
                    showNotification('All updates applied successfully', 'success');
                }

                // Clear pending updates
                pendingUpdates = {};

                // Reload data
                loadInventory();
                checkLowStock();
            })
            .catch(error => {
                console.error('Error applying updates:', error);
                showNotification('Error applying updates', 'error');
            });
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Show the notification
        setTimeout(() => notification.classList.add('show'), 10);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
});