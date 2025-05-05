document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    fetch('/api/auth/check')
        .then(response => response.json())
        .then(data => {
            if (!data.authenticated) {
                // Redirect to login if not authenticated
                window.location.href = '/login?redirect=/checkout';
                return;
            }
            
            // Load cart data
            loadCart();
        })
        .catch(error => {
            console.error('Error checking authentication:', error);
            window.location.href = '/login?redirect=/checkout';
        });

    // Elements
    const checkoutItems = document.getElementById('checkout-items');
    const checkoutSubtotal = document.getElementById('checkout-subtotal');
    const checkoutShipping = document.getElementById('checkout-shipping');
    const checkoutTax = document.getElementById('checkout-tax');
    const checkoutTotal = document.getElementById('checkout-total');
    const simulateOrderBtn = document.getElementById('simulate-order');
    const orderConfirmation = document.getElementById('order-confirmation');
    const closeModal = document.querySelector('.close');
    const orderReference = document.getElementById('order-reference');
    const continueShoppingBtn = document.getElementById('continue-shopping');

    // Load cart data
    function loadCart() {
        fetch('/api/cart')
            .then(response => response.json())
            .then(data => {
                displayCartItems(data);
                calculateTotals(data);
            })
            .catch(error => {
                console.error('Error loading cart:', error);
                checkoutItems.innerHTML = '<div class="error-message">Error loading cart items</div>';
            });
    }

    // Display cart items
    function displayCartItems(cart) {
        if (!cart.items || cart.items.length === 0) {
            checkoutItems.innerHTML = '<div class="empty-message">Your cart is empty</div>';
            simulateOrderBtn.disabled = true;
            return;
        }

        checkoutItems.innerHTML = '';
        
        cart.items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'checkout-item';
            
            itemElement.innerHTML = `
                <div class="checkout-item-image">
                    <img src="${item.image_path || '/img/placeholder.svg'}" alt="${item.name}">
                </div>
                <div class="checkout-item-details">
                    <h3>${item.name}</h3>
                    <p>Quantity: ${item.quantity}</p>
                </div>
                <div class="checkout-item-price">$${item.subtotal.toFixed(2)}</div>
            `;
            
            checkoutItems.appendChild(itemElement);
        });
    }

    // Calculate and display totals
    function calculateTotals(cart) {
        const subtotal = cart.total || 0;
        const shipping = subtotal > 100 ? 0 : 10; // Free shipping over $100
        const taxRate = 0.08; // 8% tax rate
        const tax = subtotal * taxRate;
        const total = subtotal + shipping + tax;

        checkoutSubtotal.textContent = `$${subtotal.toFixed(2)}`;
        checkoutShipping.textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
        checkoutTax.textContent = `$${tax.toFixed(2)}`;
        checkoutTotal.textContent = `$${total.toFixed(2)}`;
    }

    // Simulate order completion
    simulateOrderBtn.addEventListener('click', () => {
        // Generate a fake order reference number
        const orderNumber = 'WD-' + Date.now().toString().slice(-8);
        orderReference.textContent = orderNumber;
        
        // Show confirmation modal
        orderConfirmation.style.display = 'block';
        
        // Clear cart in the background
        fetch('/api/cart/clear', {
            method: 'DELETE'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update cart count in navigation
                    if (typeof window.updateCartCount === 'function') {
                        window.updateCartCount();
                    }
                    
                    // Dispatch cart event if available
                    if (typeof window.dispatchCartEvent === 'function' && typeof window.CartEvents === 'object') {
                        window.dispatchCartEvent(window.CartEvents.UPDATED);
                    }
                }
            })
            .catch(error => {
                console.error('Error clearing cart:', error);
            });
    });

    // Close modal
    closeModal.addEventListener('click', () => {
        orderConfirmation.style.display = 'none';
    });

    // Continue shopping button in modal
    continueShoppingBtn.addEventListener('click', () => {
        window.location.href = '/products';
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === orderConfirmation) {
            orderConfirmation.style.display = 'none';
        }
    });
});