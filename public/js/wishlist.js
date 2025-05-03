import { ProductCardModel } from '/js/product-card-model.js';

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const wishlistContent = document.getElementById('wishlist-content');
    const wishlistItemTemplate = document.getElementById('wishlist-item-template');
    const emptyWishlistTemplate = document.getElementById('empty-wishlist-template');

    // Load wishlist
    loadWishlist();

    function loadWishlist() {
        fetch('/api/wishlist')
            .then(response => {
                // Check if user is authenticated
                if (!response.ok) {
                    if (response.status === 401) {
                        // Redirect to login if not authenticated
                        window.location.href = '/login?redirect=/wishlist';
                        return Promise.reject('Authentication required');
                    }
                    return response.json().then(data => Promise.reject(data.error || 'Error occurred'));
                }
                return response.json();
            })
            .then(wishlistItems => {
                // Clear loading message
                wishlistContent.innerHTML = '';

                if (wishlistItems.length === 0) {
                    // Show empty wishlist
                    const emptyWishlist = emptyWishlistTemplate.content.cloneNode(true);
                    wishlistContent.appendChild(emptyWishlist);
                    return;
                }

                // Add wishlist items
                wishlistItems.forEach(item => {
                    const wishlistItem = createWishlistItemElement(item);
                    wishlistContent.appendChild(wishlistItem);

                    // Initialize 3D model for this item
                    setTimeout(() => {
                        const modelContainer = document.getElementById(`product-model-${item.product_id}`);
                        if (modelContainer) {
                            new ProductCardModel(modelContainer, item.product_id);
                        }
                    }, 10);
                });
            })
            .catch(error => {
                if (error !== 'Authentication required') {
                    console.error('Error loading wishlist:', error);
                    wishlistContent.innerHTML = '<div class="error-message">Error loading wishlist. Please try again.</div>';
                }
            });
    }

    function createWishlistItemElement(item) {
        const wishlistItem = wishlistItemTemplate.content.cloneNode(true);

        // Find elements
        const productCard = wishlistItem.querySelector('.product-card');
        const modelContainer = wishlistItem.querySelector('.product-model-container');
        const productTitle = wishlistItem.querySelector('.product-title');
        const productPrice = wishlistItem.querySelector('.product-price');
        const productLink = wishlistItem.querySelector('.product-actions a');
        const removeBtn = wishlistItem.querySelector('.remove-from-wishlist');

        // Set data
        productCard.dataset.wishlistId = item.wishlist_id;
        modelContainer.id = `product-model-${item.product_id}`;
        productTitle.textContent = item.name;
        productPrice.textContent = `$${item.price.toFixed(2)}`;
        productLink.href = `/product/${item.product_id}`;

        // Remove button click handler
        removeBtn.addEventListener('click', () => {
            removeFromWishlist(item.wishlist_id, productCard);
        });

        return wishlistItem;
    }

    function removeFromWishlist(wishlistId, element) {
        fetch(`/api/wishlist/${wishlistId}`, {
            method: 'DELETE'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Animate removal
                    element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    element.style.opacity = '0';
                    element.style.transform = 'scale(0.9)';

                    setTimeout(() => {
                        element.remove();

                        // Check if wishlist is now empty
                        if (wishlistContent.children.length === 0) {
                            const emptyWishlist = emptyWishlistTemplate.content.cloneNode(true);
                            wishlistContent.appendChild(emptyWishlist);
                        }
                    }, 300);
                } else {
                    alert(data.error || 'Failed to remove item from wishlist');
                }
            })
            .catch(error => {
                console.error('Error removing from wishlist:', error);
                alert('Error removing item from wishlist');
            });
    }
});