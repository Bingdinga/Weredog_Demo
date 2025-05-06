// /public/js/shared.js

// Function to update cart count in navigation
function updateCartCount() {
    fetch('/api/cart')
        .then(response => response.json())
        .then(data => {
            const cartCount = document.getElementById('cart-count');
            if (cartCount) {
                cartCount.textContent = data.totalQuantity || 0;

                if (data.totalQuantity > 0) {
                    cartCount.classList.add('has-items');
                } else {
                    cartCount.classList.remove('has-items');
                }
            }
            // No warning/console log if element doesn't exist
        })
        .catch(error => {
            console.error('Error updating cart count:', error);
        });
}

// Function to update cart count immediately with a value
function setCartCount(count) {
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        cartCount.textContent = count;

        // Add visual feedback class
        cartCount.classList.add('updating');

        // Remove the class after animation
        setTimeout(() => {
            cartCount.classList.remove('updating');
        }, 500);

        if (count > 0) {
            cartCount.classList.add('has-items');
        } else {
            cartCount.classList.remove('has-items');
        }
    }
}

// Custom cart events
const CartEvents = {
    UPDATED: 'cartUpdated',
    ITEM_ADDED: 'cartItemAdded',
    ITEM_REMOVED: 'cartItemRemoved',
    ITEM_UPDATED: 'cartItemUpdated'
};

// Dispatch cart event
function dispatchCartEvent(eventType, data = {}) {
    const event = new CustomEvent(eventType, { detail: data });
    window.dispatchEvent(event);
}

// Function to update navigation based on authentication status
function updateNavigation() {
    fetch('/api/auth/check')
        .then(response => response.json())
        .then(data => {
            // Only run this code if the account link exists (customer view)
            const accountLink = document.querySelector('a[href="/account"]');

            if (accountLink) {
                const navItem = accountLink.closest('li');

                if (data.authenticated && data.user) {
                    const displayName = data.user.first_name || data.user.username;
                    accountLink.textContent = `Hi, ${displayName}`;
                    accountLink.classList.add('authenticated');

                    // Create dropdown menu if it doesn't exist
                    if (!navItem.querySelector('.user-dropdown')) {
                        const dropdown = document.createElement('div');
                        dropdown.className = 'user-dropdown';
                        dropdown.innerHTML = `
                            <a href="/account">Account Settings</a>
                            <a href="/account#orders">Order History</a>
                            <a href="/wishlist">Wishlist</a>
                            <a href="#" id="dropdown-logout">Logout</a>
                        `;
                        navItem.appendChild(dropdown);

                        // Add dropdown logout handler
                        dropdown.querySelector('#dropdown-logout').addEventListener('click', (e) => {
                            e.preventDefault();
                            logout();
                        });
                    }
                } else {
                    accountLink.textContent = 'Account';
                    accountLink.classList.remove('authenticated');

                    // Remove dropdown if it exists
                    const dropdown = navItem.querySelector('.user-dropdown');
                    if (dropdown) {
                        dropdown.remove();
                    }
                }
            } else {
                // Log for debugging - this means we're on an admin page
                // console.log('No account link found - likely on admin page');
            }
        })
        .catch(error => {
            console.error('Error checking authentication status:', error);
        });
}

function logout() {
    fetch('/api/auth/logout', {
        method: 'POST'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.dispatchEvent(new Event('authStatusChanged'));
                window.location.href = '/';
            }
        })
        .catch(error => {
            console.error('Error logging out:', error);
        });
}

// Make functions globally available
window.updateCartCount = updateCartCount;
window.setCartCount = setCartCount;
window.dispatchCartEvent = dispatchCartEvent;
window.CartEvents = CartEvents;
window.updateNavigation = updateNavigation;

// Call functions when the page loads
document.addEventListener('DOMContentLoaded', () => {
    updateNavigation();
});

// Listen for custom events
window.addEventListener(CartEvents.UPDATED, updateCartCount);
window.addEventListener(CartEvents.ITEM_ADDED, updateCartCount);
window.addEventListener(CartEvents.ITEM_REMOVED, updateCartCount);
window.addEventListener(CartEvents.ITEM_UPDATED, updateCartCount);
window.addEventListener('authStatusChanged', updateNavigation);