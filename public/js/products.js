import { ProductCardModel } from '/js/product-card-model.js';

document.addEventListener('DOMContentLoaded', () => {

    // Check if THREE.js is available and load it if not
    if (typeof THREE === 'undefined') {
        // Load Three.js scripts
        loadScript('/js/lib/three/three.min.js')
            .then(() => loadScript('/js/lib/three/GLTFLoader.js'))
            .then(() => {
                console.log('Three.js loaded successfully');
            })
            .catch(error => {
                console.error('Error loading Three.js:', error);
            });
    }

    // Helper function to load scripts
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Elements
    const productsGrid = document.getElementById('products-grid');
    const categoryList = document.getElementById('category-list');
    const priceFilter = document.getElementById('price-filter');
    const priceValue = document.getElementById('price-value');
    const sortFilter = document.getElementById('sort-filter');
    const applyFiltersBtn = document.getElementById('apply-filters');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const pagination = document.getElementById('pagination');
    const productCardTemplate = document.getElementById('product-card-template');

    // State
    let products = [];
    let categories = [];
    let currentCategory = 'all';
    let currentMaxPrice = 200;
    let currentSort = 'featured';
    let currentSearch = '';
    let currentPage = 1;
    const productsPerPage = 12;

    // Initialize
    loadCategories();
    loadProducts();

    // Event listeners
    priceFilter.addEventListener('input', (e) => {
        currentMaxPrice = e.target.value;
        priceValue.textContent = currentMaxPrice < 200 ? `$${currentMaxPrice}` : '$200+';
    });

    applyFiltersBtn.addEventListener('click', () => {
        currentPage = 1;
        displayProducts();
    });

    searchButton.addEventListener('click', () => {
        currentSearch = searchInput.value.trim();
        currentPage = 1;
        displayProducts();
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            currentSearch = searchInput.value.trim();
            currentPage = 1;
            displayProducts();
        }
    });

    sortFilter.addEventListener('change', () => {
        currentSort = sortFilter.value;
        currentPage = 1;
        displayProducts();
    });

    // Functions
    function loadCategories() {
        fetch('/api/products/categories')
            .then(response => response.json())
            .then(data => {
                categories = data;
                renderCategories();
            })
            .catch(error => {
                console.error('Error loading categories:', error);
                categoryList.innerHTML = '<li>Error loading categories. Please try again.</li>';
            });
    }

    function renderCategories() {
        // Clear loading placeholder
        categoryList.innerHTML = '<li class="category-item"><a href="#" data-category="all" class="active">All Products</a></li>';

        // Add categories and subcategories
        categories.forEach(category => {
            // Add main category
            const mainLi = document.createElement('li');
            mainLi.className = 'category-item category-parent';

            const mainA = document.createElement('a');
            mainA.href = '#';
            mainA.textContent = category.name;
            mainA.dataset.category = category.category_id;

            mainLi.appendChild(mainA);
            categoryList.appendChild(mainLi);

            // Add subcategories if they exist
            if (category.subcategories && category.subcategories.length > 0) {
                const subUl = document.createElement('ul');
                subUl.className = 'subcategory-list';

                category.subcategories.forEach(subcat => {
                    const subLi = document.createElement('li');
                    subLi.className = 'category-item subcategory-item';

                    const subA = document.createElement('a');
                    subA.href = '#';
                    subA.textContent = subcat.name;
                    subA.dataset.category = subcat.category_id;

                    subLi.appendChild(subA);
                    subUl.appendChild(subLi);
                });

                categoryList.appendChild(subUl);
            }
        });

        // Add click handlers for all category links
        document.querySelectorAll('.category-item a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();

                // Remove active class from all category links
                document.querySelectorAll('.category-item a').forEach(navLink => {
                    navLink.classList.remove('active');
                });

                // Add active class to clicked link
                link.classList.add('active');

                // Set current category based on the data-category attribute
                currentCategory = link.dataset.category;
                currentPage = 1;
                displayProducts();
            });
        });
    }

    function loadProducts() {
        fetch('/api/products')
            .then(response => response.json())
            .then(data => {
                products = data;
                displayProducts();
            })
            .catch(error => {
                console.error('Error loading products:', error);
                productsGrid.innerHTML = '<div class="error-message">Error loading products. Please try again.</div>';
            });
    }

    function displayProducts() {
        // Filter products
        let filteredProducts = products;


        // Filter by category
        if (currentCategory !== 'all') {
            // Convert currentCategory to number for comparison
            const categoryId = parseInt(currentCategory, 10);

            // Check if this is a main category
            const mainCategory = categories.find(cat => cat.category_id == categoryId);

            if (mainCategory && mainCategory.subcategories && mainCategory.subcategories.length > 0) {
                // If it's a main category with subcategories, include products from all subcategories
                const subcategoryIds = mainCategory.subcategories.map(subcat => subcat.category_id);
                filteredProducts = filteredProducts.filter(product =>
                    product.category_id == categoryId || subcategoryIds.includes(product.category_id));
            } else {
                // Otherwise just filter by the selected category
                filteredProducts = filteredProducts.filter(product =>
                    product.category_id == categoryId);
            }
        }

        // Filter by price
        if (currentMaxPrice < 200) {
            filteredProducts = filteredProducts.filter(product =>
                product.price <= currentMaxPrice);
        }

        // Filter by search
        if (currentSearch) {
            const searchLower = currentSearch.toLowerCase();
            filteredProducts = filteredProducts.filter(product =>
                product.name.toLowerCase().includes(searchLower) ||
                (product.description && product.description.toLowerCase().includes(searchLower)));
        }

        // Sort products
        switch (currentSort) {
            case 'price-low':
                filteredProducts.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                filteredProducts.sort((a, b) => b.price - a.price);
                break;
            case 'newest':
                filteredProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            // 'featured' is default order from API
        }

        // Calculate pagination
        const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
        const startIndex = (currentPage - 1) * productsPerPage;
        const endIndex = startIndex + productsPerPage;
        const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

        // Render products
        productsGrid.innerHTML = '';

        if (paginatedProducts.length === 0) {
            productsGrid.innerHTML = '<div class="no-results">No products found. Try adjusting your filters.</div>';
            pagination.innerHTML = '';
            return;
        }

        paginatedProducts.forEach(product => {
            const productCard = productCardTemplate.content.cloneNode(true);

            // Set product data
            productCard.querySelector('.product-title').textContent = product.name;
            productCard.querySelector('.product-price').textContent = `$${product.price.toFixed(2)}`;
            productCard.querySelector('.product-actions a').href = `/product/${product.product_id}`;

            // Add wishlist functionality
            const wishlistBtn = productCard.querySelector('.wishlist-btn');
            wishlistBtn.dataset.productId = product.product_id;
            wishlistBtn.addEventListener('click', () => toggleWishlist(product.product_id));

            // Initialize 3D model container
            const modelContainer = productCard.querySelector('.product-model-container');
            modelContainer.id = `product-model-${product.product_id}`;

            productsGrid.appendChild(productCard);

            // Initialize 3D model after the card is added to the DOM
            // Use a small delay to ensure DOM is updated
            setTimeout(() => {
                new ProductCardModel(document.getElementById(`product-model-${product.product_id}`), product.product_id);
            }, 10);
        });

        // Render pagination
        renderPagination(totalPages);
    }

    function renderPagination(totalPages) {
        pagination.innerHTML = '';

        if (totalPages <= 1) return;

        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.innerHTML = '&laquo;';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                displayProducts();
                window.scrollTo(0, 0);
            }
        });
        pagination.appendChild(prevBtn);

        // Page numbers
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);

        if (endPage - startPage < 4 && startPage > 1) {
            startPage = Math.max(1, endPage - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = 'pagination-btn';
            if (i === currentPage) pageBtn.classList.add('active');
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => {
                currentPage = i;
                displayProducts();
                window.scrollTo(0, 0);
            });
            pagination.appendChild(pageBtn);
        }

        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.innerHTML = '&raquo;';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                displayProducts();
                window.scrollTo(0, 0);
            }
        });
        pagination.appendChild(nextBtn);
    }

    function toggleWishlist(productId) {
        fetch('/api/wishlist/toggle', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ productId })
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        if (response.status === 401 && data.redirectTo) {
                            // Handle authentication error by redirecting to login
                            window.location.href = `${data.redirectTo}?redirect=${encodeURIComponent(window.location.pathname)}`;
                            return Promise.reject('Authentication required');
                        }
                        return Promise.reject(data.error || 'Error occurred');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data && data.success) {
                    // Update wishlist button UI
                    const wishlistBtn = document.querySelector(`.wishlist-btn[data-product-id="${productId}"]`);
                    if (wishlistBtn) {
                        if (data.added) {
                            wishlistBtn.textContent = '♥';
                            wishlistBtn.classList.add('active');
                        } else {
                            wishlistBtn.textContent = '♡';
                            wishlistBtn.classList.remove('active');
                        }
                    }
                }
            })
            .catch(error => {
                if (error !== 'Authentication required') {
                    // Only log errors that aren't about authentication
                    console.error('Error toggling wishlist:', error);
                }
            });
    }

    function checkWishlistStatus() {
        fetch('/api/wishlist')
            .then(response => {
                // First check the content type to avoid parsing HTML as JSON
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    return Promise.reject('Response is not JSON');
                }

                return response.json();
            })
            .then(data => {
                // Check if we got an error response with authentication error
                if (data.error && data.error.includes('Authentication')) {
                    // User is not logged in, which is fine for this check
                    console.log('User not authenticated for wishlist check');
                    return;
                }

                // If we have wishlist items, update the UI
                if (Array.isArray(data) && data.length > 0) {
                    const wishlistProductIds = data.map(item => item.product_id);

                    // Update wishlist buttons
                    document.querySelectorAll('.wishlist-btn').forEach(btn => {
                        const productId = parseInt(btn.dataset.productId);
                        if (wishlistProductIds.includes(productId)) {
                            btn.textContent = '♥';
                            btn.classList.add('active');
                        }
                    });
                }
            })
            .catch(error => {
                // Log for debugging but don't show to user for this background check
                console.error('Error checking wishlist status:', error);
            });
    }

    // Initialize wishlist status check
    setTimeout(checkWishlistStatus, 1000); // Delay slightly to allow products to render first

    // Clean up 3D models when leaving the page
    window.addEventListener('unload', () => {
        // Find all model containers and dispose of their 3D contexts
        document.querySelectorAll('.product-model-container').forEach(container => {
            if (container.modelRenderer) {
                container.modelRenderer.dispose();
            }
        });
    });
});