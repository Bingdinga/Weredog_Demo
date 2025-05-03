document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const cartItems = document.getElementById('cart-items');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartShipping = document.getElementById('cart-shipping');
    const cartTotal = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    const continueShoppingBtn = document.getElementById('continue-shopping');
    const cartItemTemplate = document.getElementById('cart-item-template');
    const emptyCartTemplate = document.getElementById('empty-cart-template');

    // State
    let cart = {
        items: [],
        total: 0,
        itemCount: 0
    };

    // Initialize
    loadCart();

    // Event listeners
    checkoutBtn.addEventListener('click', () => {
        window.location.href = '/checkout';
    });

    continueShoppingBtn.addEventListener('click', () => {
        window.location.href = '/products';
    });

    // Functions
    function loadCart() {
        return fetch('/api/cart')
            .then(response => response.json())
            .then(data => {
                cart = data;
                renderCart();
                return data;
            })
            .catch(error => {
                console.error('Error loading cart:', error);
                showError('Failed to load cart');
            });
    }

    function renderCart() {
        cartItems.innerHTML = '';

        if (cart.items.length === 0) {
            const emptyCart = emptyCartTemplate.content.cloneNode(true);
            cartItems.appendChild(emptyCart);
            updateSummary();
            return;
        }

        cart.items.forEach(item => {
            const cartItemElement = createCartItemElement(item);
            cartItems.appendChild(cartItemElement);
        });

        updateSummary();
    }

    function createCartItemElement(item) {
        const cartItem = cartItemTemplate.content.cloneNode(true);

        // Find elements
        const cartItemDiv = cartItem.querySelector('.cart-item');
        const image = cartItem.querySelector('.cart-item-image img');
        const name = cartItem.querySelector('.cart-item-name');
        const price = cartItem.querySelector('.cart-item-price');
        const quantityInput = cartItem.querySelector('.quantity-input');
        const subtotal = cartItem.querySelector('.cart-item-subtotal');
        const decreaseBtn = cartItem.querySelector('.decrease-qty');
        const increaseBtn = cartItem.querySelector('.increase-qty');
        const removeBtn = cartItem.querySelector('.remove-item');

        // Set data
        cartItemDiv.dataset.itemId = item.item_id;
        image.src = item.image_path || '/img/placeholder.svg';
        image.alt = item.name;
        name.textContent = item.name;
        price.textContent = `$${item.price.toFixed(2)}`;
        quantityInput.value = item.quantity;
        subtotal.textContent = `$${item.subtotal.toFixed(2)}`;

        // Event listeners
        decreaseBtn.addEventListener('click', () => {
            const currentQuantity = parseInt(quantityInput.value);
            if (currentQuantity > 1) {
                updateQuantity(item.item_id, currentQuantity - 1);
            }
        });

        increaseBtn.addEventListener('click', () => {
            const currentQuantity = parseInt(quantityInput.value);
            updateQuantity(item.item_id, currentQuantity + 1);
        });

        quantityInput.addEventListener('change', (e) => {
            const quantity = parseInt(e.target.value);
            if (quantity > 0) {
                updateQuantity(item.item_id, quantity);
            } else {
                e.target.value = item.quantity;
            }
        });

        removeBtn.addEventListener('click', () => {
            removeItem(item.item_id);
        });

        return cartItem;
    }

    function updateQuantity(itemId, quantity) {
        fetch(`/api/cart/update/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ quantity })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    loadCart().then(() => {
                        // Emit cart updated event
                        dispatchCartEvent(CartEvents.ITEM_UPDATED, { itemId, quantity });
                    });
                } else {
                    showError(data.error || 'Failed to update quantity');
                }
            })
            .catch(error => {
                console.error('Error updating quantity:', error);
                showError('Failed to update quantity');
            });
    }

    function removeItem(itemId) {
        fetch(`/api/cart/remove/${itemId}`, {
            method: 'DELETE'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    loadCart().then(() => {
                        // Emit cart updated event
                        dispatchCartEvent(CartEvents.ITEM_REMOVED, { itemId });
                    });
                } else {
                    showError(data.error || 'Failed to remove item');
                }
            })
            .catch(error => {
                console.error('Error removing item:', error);
                showError('Failed to remove item');
            });
    }

    function updateSummary() {
        const subtotal = cart.total || 0;
        const shipping = subtotal > 100 ? 0 : 10; // Free shipping over $100
        const total = subtotal + shipping;

        cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
        cartShipping.textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
        cartTotal.textContent = `$${total.toFixed(2)}`;

        // Update checkout button state
        checkoutBtn.disabled = cart.items.length === 0;
        if (cart.items.length === 0) {
            checkoutBtn.textContent = 'Cart is Empty';
        } else {
            checkoutBtn.textContent = 'Proceed to Checkout';
        }
    }

    function showError(message) {
        // Create a simple error notification
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        // Add animation class
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
});