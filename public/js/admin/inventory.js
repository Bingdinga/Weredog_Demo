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
    const paginationDiv = document.createElement('div');
    paginationDiv.id = 'pagination';
    paginationDiv.className = 'pagination';

    productTable.parentNode.insertBefore(paginationDiv, productTable.nextSibling);

    // State
    let products = [];
    let pendingUpdates = {};
    let categoryHierarchy = {};
    let currentPage = 1;
    let totalPages = 1;
    let currentSort = 'product_id';
    let sortDirection = 'desc';

    // Load data
    loadInventory();
    loadCategories();
    checkLowStock();

    // Event listeners
    searchInput.addEventListener('input', () => {
        currentPage = 1; // Reset to first page when searching
        loadInventory();
    });

    filterSelect.addEventListener('change', () => {
        currentPage = 1;
        loadInventory();
    });

    stockFilter.addEventListener('change', () => {
        currentPage = 1;
        loadInventory();
    });

    applyButton.addEventListener('click', applyBulkUpdates);

    // Add sorting functionality to table headers
    document.querySelectorAll('#product-table th').forEach(th => {
        // Add sortable class to columns that should be sortable
        const sortableColumns = ['ID', 'Product Name', 'Stock', 'Price'];
        if (sortableColumns.includes(th.textContent.trim())) {
            th.classList.add('sortable');

            // Map header text to database column name
            const columnMap = {
                'ID': 'product_id',
                'Product Name': 'name',
                'Stock': 'stock_quantity',
                'Price': 'price'
            };

            th.dataset.sort = columnMap[th.textContent.trim()];

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

                // Reset to first page and load products with new sort
                currentPage = 1;
                loadInventory();
            });
        }
    });

    function loadCategories() {
        fetch('/api/products/categories')
            .then(response => response.json())
            .then(categories => {
                const filterSelect = document.getElementById('filter-select');

                // Keep the default "All Categories" option
                filterSelect.innerHTML = '<option value="">All Categories</option>';

                // Build category hierarchy data structure
                categoryHierarchy = {};

                // Add main categories
                categories.forEach(category => {
                    const mainOption = document.createElement('option');
                    mainOption.value = category.category_id;
                    mainOption.textContent = category.name;
                    filterSelect.appendChild(mainOption);

                    // Store subcategory IDs for this parent
                    categoryHierarchy[category.category_id] = [];

                    // Add subcategories without special formatting
                    if (category.subcategories && category.subcategories.length > 0) {
                        category.subcategories.forEach(subcat => {
                            const subOption = document.createElement('option');
                            subOption.value = subcat.category_id;
                            // No indentation or special formatting
                            subOption.textContent = subcat.name;
                            filterSelect.appendChild(subOption);

                            // Add to hierarchy
                            categoryHierarchy[category.category_id].push(subcat.category_id);
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
        // Build query parameters
        const params = new URLSearchParams({
            page: currentPage,
            limit: 20,
            sort: currentSort,
            direction: sortDirection
        });

        // Add filter parameters if they exist
        if (searchInput.value) {
            params.append('search', searchInput.value);
        }

        if (filterSelect.value) {
            params.append('category', filterSelect.value);
        }

        if (stockFilter.value !== 'all') {
            params.append('stockFilter', stockFilter.value);
        }

        // Show loading indicator
        tableBody.innerHTML = '<tr><td colspan="7" class="loading-cell">Loading products...</td></tr>';

        fetch(`/api/admin/inventory/products?${params}`)
            .then(response => response.json())
            .then(data => {
                products = data.products || [];
                renderTable();
                setupPagination(data.pagination || { page: 1, total: 0, limit: 20, totalPages: 1 });
            })
            .catch(error => {
                console.error('Error loading inventory:', error);
                showNotification('Error loading inventory data', 'error');
                tableBody.innerHTML = '<tr><td colspan="7" class="error-cell">Error loading inventory data</td></tr>';
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
            // Check if product matches search term
            const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
                product.category_name?.toLowerCase().includes(searchTerm);

            // Check if product matches category filter
            let matchesCategory = true;
            if (categoryFilter) {
                // If the selected category is a parent category with subcategories
                if (categoryHierarchy[categoryFilter] && categoryHierarchy[categoryFilter].length > 0) {
                    // Match if product is in the parent category OR any of its subcategories
                    matchesCategory = (product.category_id == categoryFilter) ||
                        categoryHierarchy[categoryFilter].includes(Number(product.category_id));
                } else {
                    // Direct category match (for subcategories or categories without children)
                    matchesCategory = product.category_id == categoryFilter;
                }
            }

            // Check if product matches stock filter
            const matchesStock = stockStatus === 'all' ||
                (stockStatus === 'low' && product.stock_quantity <= product.low_stock_threshold) ||
                (stockStatus === 'ok' && product.stock_quantity > product.low_stock_threshold);

            return matchesSearch && matchesCategory && matchesStock;
        });

        renderTable();
    }

    function renderTable() {
        tableBody.innerHTML = '';

        products.forEach(product => {
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

    function setupPagination(pagination) {
        paginationDiv.innerHTML = '';

        // Extract pagination data with safe fallbacks
        const page = parseInt(pagination.page) || 1;
        const total = parseInt(pagination.total) || 0;
        const limit = parseInt(pagination.limit) || 20;
        const totalPages = pagination.totalPages || Math.max(1, Math.ceil(total / limit));

        // Update the current state
        currentPage = page;

        // Don't show pagination if there's only one page
        if (total <= limit && page === 1) {
            paginationDiv.innerHTML = `<span class="pagination-info">Showing all ${total} products</span>`;
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

        // Add click event listener
        paginationDiv.addEventListener('click', function (e) {
            const button = e.target.closest('.pagination-btn');
            if (!button || button.disabled) return;

            const newPage = parseInt(button.dataset.page);
            if (isNaN(newPage) || newPage === currentPage) return;

            currentPage = newPage;
            loadInventory();
        });
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