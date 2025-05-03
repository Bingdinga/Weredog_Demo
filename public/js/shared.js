// /public/js/shared.js

// Function to update cart count in navigation
function updateCartCount() {
    fetch('/api/cart')
        .then(response => response.json())
        .then(data => {
            const cartCount = document.getElementById('cart-count');
            if (cartCount) {
                cartCount.textContent = data.itemCount || 0;
                
                // Add visual indicator for cart count
                if (data.itemCount > 0) {
                    cartCount.classList.add('has-items');
                } else {
                    cartCount.classList.remove('has-items');
                }
            }
        })
        .catch(error => {
            console.error('Error updating cart count:', error);
        });
}

// Make the function globally available
window.updateCartCount = updateCartCount;

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', updateCartCount);

// Call this function when cart is updated (useful for other scripts)
window.addEventListener('cartUpdated', updateCartCount);