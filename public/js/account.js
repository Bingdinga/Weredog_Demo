document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    fetch('/api/auth/check')
        .then(response => response.json())
        .then(data => {
            if (!data.authenticated) {
                // Redirect to login if not authenticated
                window.location.href = '/login?redirect=/account';
                return;
            }

            // Initialize account page with user data
            initializeAccount(data.user);
        })
        .catch(error => {
            console.error('Error checking authentication:', error);
        });

    // Navigation
    document.querySelectorAll('.account-nav a[data-section]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            const section = link.dataset.section;

            // Update active link
            document.querySelectorAll('.account-nav a').forEach(navLink => {
                navLink.classList.remove('active');
            });
            link.classList.add('active');

            // Show selected section
            document.querySelectorAll('.account-section').forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById(`${section}-section`).classList.add('active');

            // Load section data if needed
            if (section === 'orders' && !ordersLoaded) {
                loadOrders();
                ordersLoaded = true;
            } else if (section === 'addresses' && !addressesLoaded) {
                loadAddresses();
                addressesLoaded = true;
            } else if (section === 'wishlist' && !wishlistLoaded) {
                loadWishlist();
                wishlistLoaded = true;
            }
        });
    });

    // Logout
    document.getElementById('logout-link').addEventListener('click', (e) => {
        e.preventDefault();

        fetch('/api/auth/logout', {
            method: 'POST'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Notify any listeners that authentication status changed
                    window.dispatchEvent(new Event('authStatusChanged'));

                    window.location.href = '/';
                }
            })
            .catch(error => {
                console.error('Error logging out:', error);
            });
    });

    // Track if sections have been loaded
    let ordersLoaded = false;
    let addressesLoaded = false;
    let wishlistLoaded = false;

    // Initialize account page
    function initializeAccount(user) {
        // Fill profile form
        document.getElementById('username').value = user.username || '';
        document.getElementById('email').value = user.email || '';
        document.getElementById('first-name').value = user.first_name || '';
        document.getElementById('last-name').value = user.last_name || '';

        // Profile form submission
        document.getElementById('profile-form').addEventListener('submit', (e) => {
            e.preventDefault();

            const profileData = {
                email: document.getElementById('email').value,
                firstName: document.getElementById('first-name').value,
                lastName: document.getElementById('last-name').value
            };

            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            // If password fields are filled, include password change data
            if (currentPassword) {
                if (!newPassword) {
                    showMessage('profile-message', 'Please enter a new password', 'error');
                    return;
                }

                if (newPassword !== confirmPassword) {
                    showMessage('profile-message', 'New passwords do not match', 'error');
                    return;
                }

                profileData.currentPassword = currentPassword;
                profileData.newPassword = newPassword;
            }

            updateProfile(profileData);
        });

        // Address form
        const addAddressBtn = document.getElementById('add-address-btn');
        const cancelAddressBtn = document.getElementById('cancel-address-btn');
        const addressForm = document.getElementById('address-form');
        const addressFormElement = document.getElementById('address-form-element');

        addAddressBtn.addEventListener('click', () => {
            // Clear form and show it
            addressFormElement.reset();
            document.getElementById('address-id').value = '';
            addressForm.classList.add('active');
        });

        cancelAddressBtn.addEventListener('click', () => {
            addressForm.classList.remove('active');
        });

        addressFormElement.addEventListener('submit', (e) => {
            e.preventDefault();

            const addressData = {
                addressId: document.getElementById('address-id').value || null,
                streetAddress: document.getElementById('street-address').value,
                city: document.getElementById('city').value,
                state: document.getElementById('state').value,
                postalCode: document.getElementById('postal-code').value,
                country: document.getElementById('country').value,
                isDefault: document.getElementById('is-default').checked
            };

            saveAddress(addressData);
        });
    }

    // Load orders
    function loadOrders() {
        const ordersContainer = document.getElementById('orders-container');

        fetch('/api/orders')
            .then(response => response.json())
            .then(orders => {
                if (orders.length === 0) {
                    const emptyTemplate = document.getElementById('empty-orders-template').content.cloneNode(true);
                    ordersContainer.innerHTML = '';
                    ordersContainer.appendChild(emptyTemplate);
                    return;
                }

                ordersContainer.innerHTML = '';

                orders.forEach(order => {
                    fetch(`/api/orders/${order.order_id}`)
                        .then(response => response.json())
                        .then(orderDetails => {
                            const orderTemplate = document.getElementById('order-template').content.cloneNode(true);

                            orderTemplate.querySelector('.order-id').textContent = orderDetails.order_id;
                            orderTemplate.querySelector('.order-date').textContent = new Date(orderDetails.created_at).toLocaleDateString();
                            orderTemplate.querySelector('.order-status').textContent = orderDetails.status.charAt(0).toUpperCase() + orderDetails.status.slice(1);
                            orderTemplate.querySelector('.order-total').textContent = `$${orderDetails.total_amount.toFixed(2)}`;
                            orderTemplate.querySelector('.order-shipping').textContent = orderDetails.shipping_address;
                            orderTemplate.querySelector('.order-payment').textContent = orderDetails.payment_method;

                            const orderItemsContainer = orderTemplate.querySelector('.order-items');

                            orderDetails.items.forEach(item => {
                                const itemTemplate = document.getElementById('order-item-template').content.cloneNode(true);

                                const itemImage = itemTemplate.querySelector('.order-item-image img');
                                itemImage.src = item.image_path || '/img/placeholder.svg';
                                itemImage.alt = item.name;

                                itemTemplate.querySelector('.order-item-name').textContent = item.name;
                                itemTemplate.querySelector('.order-item-price').textContent = `$${item.price.toFixed(2)}`;
                                itemTemplate.querySelector('.item-quantity').textContent = item.quantity;

                                orderItemsContainer.appendChild(itemTemplate);
                            });

                            ordersContainer.appendChild(orderTemplate);
                        })
                        .catch(error => {
                            console.error('Error loading order details:', error);
                        });
                });
            })
            .catch(error => {
                console.error('Error loading orders:', error);
                ordersContainer.innerHTML = '<div class="error-message">Error loading orders. Please try again.</div>';
            });
    }

    // Load addresses
    function loadAddresses() {
        const addressesContainer = document.getElementById('addresses-container');

        fetch('/api/shipping-addresses')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }
                return response.json();
            })
            .then(addresses => {
                // Ensure addresses is an array
                if (!Array.isArray(addresses)) {
                    console.error('Expected array but got:', addresses);
                    addresses = [];
                }

                if (addresses.length === 0) {
                    const emptyTemplate = document.getElementById('empty-addresses-template').content.cloneNode(true);
                    addressesContainer.innerHTML = '';
                    addressesContainer.appendChild(emptyTemplate);
                    return;
                }

                addressesContainer.innerHTML = '';

                addresses.forEach(address => {
                    const addressTemplate = document.getElementById('address-template').content.cloneNode(true);
                    const addressCard = addressTemplate.querySelector('.address-card');

                    addressCard.dataset.addressId = address.address_id;

                    // Set address data
                    addressTemplate.querySelector('.address-street').textContent = address.street_address;
                    addressTemplate.querySelector('.address-city').textContent = address.city;
                    addressTemplate.querySelector('.address-state').textContent = address.state;
                    addressTemplate.querySelector('.address-postal').textContent = address.postal_code;
                    addressTemplate.querySelector('.address-country').textContent = address.country;

                    if (address.is_default) {
                        addressTemplate.querySelector('.address-default').textContent = 'Default Address';
                        addressCard.classList.add('default-address');
                    } else {
                        addressTemplate.querySelector('.address-default').textContent = '';
                    }

                    // Add event listeners for edit and delete
                    const editBtn = addressTemplate.querySelector('.edit-address');
                    const deleteBtn = addressTemplate.querySelector('.delete-address');

                    editBtn.addEventListener('click', () => {
                        editAddress(address);
                    });

                    deleteBtn.addEventListener('click', () => {
                        if (confirm('Are you sure you want to delete this address?')) {
                            deleteAddress(address.address_id);
                        }
                    });

                    addressesContainer.appendChild(addressTemplate);
                });
            })
            .catch(error => {
                console.error('Error loading addresses:', error);
                // Show a user-friendly error message
                addressesContainer.innerHTML = '<div class="error-message">Error loading addresses. Please try again later.</div>';
            });
    }

    // Load wishlist
    function loadWishlist() {
        const wishlistContainer = document.getElementById('wishlist-container');

        fetch('/api/wishlist')
            .then(response => response.json())
            .then(wishlistItems => {
                if (wishlistItems.length === 0) {
                    const emptyTemplate = document.getElementById('empty-wishlist-template').content.cloneNode(true);
                    wishlistContainer.innerHTML = '';
                    wishlistContainer.appendChild(emptyTemplate);
                    return;
                }

                const wishlistItemsGrid = document.createElement('div');
                wishlistItemsGrid.className = 'wishlist-items';
                wishlistContainer.innerHTML = '';
                wishlistContainer.appendChild(wishlistItemsGrid);

                wishlistItems.forEach(item => {
                    const itemTemplate = document.getElementById('wishlist-item-template').content.cloneNode(true);

                    const itemImage = itemTemplate.querySelector('.product-image img');
                    itemImage.src = item.image_path || '/img/placeholder.svg';
                    itemImage.alt = item.name;

                    itemTemplate.querySelector('.product-title').textContent = item.name;
                    itemTemplate.querySelector('.product-price').textContent = `$${item.price.toFixed(2)}`;
                    itemTemplate.querySelector('.product-actions a').href = `/product/${item.product_id}`;

                    const removeBtn = itemTemplate.querySelector('.remove-from-wishlist');
                    removeBtn.dataset.wishlistId = item.wishlist_id;

                    removeBtn.addEventListener('click', () => {
                        removeFromWishlist(item.wishlist_id);
                    });

                    wishlistItemsGrid.appendChild(itemTemplate);
                });
            })
            .catch(error => {
                console.error('Error loading wishlist:', error);
                wishlistContainer.innerHTML = '<div class="error-message">Error loading wishlist. Please try again.</div>';
            });
    }

    // Update profile
    function updateProfile(profileData) {
        fetch('/api/auth/update-profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(profileData)
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showMessage('profile-message', 'Profile updated successfully', 'success');

                    // Clear password fields
                    document.getElementById('current-password').value = '';
                    document.getElementById('new-password').value = '';
                    document.getElementById('confirm-password').value = '';
                } else {
                    showMessage('profile-message', data.error || 'Failed to update profile', 'error');
                }
            })
            .catch(error => {
                console.error('Error updating profile:', error);
                showMessage('profile-message', 'Error updating profile. Please try again.', 'error');
            });
    }

    // Save address
    function saveAddress(addressData) {
        const isNewAddress = !addressData.addressId;
        const method = isNewAddress ? 'POST' : 'PUT';
        const url = isNewAddress ? '/api/shipping-addresses' : `/api/shipping-addresses/${addressData.addressId}`;

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(addressData)
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('address-form').classList.remove('active');
                    loadAddresses(); // Reload addresses
                } else {
                    showMessage('address-form-message', data.error || 'Failed to save address', 'error');
                }
            })
            .catch(error => {
                console.error('Error saving address:', error);
                showMessage('address-form-message', 'Error saving address. Please try again.', 'error');
            });
    }

    // Edit address
    function editAddress(address) {
        document.getElementById('address-id').value = address.address_id;
        document.getElementById('street-address').value = address.street_address;
        document.getElementById('city').value = address.city;
        document.getElementById('state').value = address.state;
        document.getElementById('postal-code').value = address.postal_code;
        document.getElementById('country').value = address.country;
        document.getElementById('is-default').checked = address.is_default;

        document.getElementById('address-form').classList.add('active');
    }

    // Delete address
    function deleteAddress(addressId) {
        fetch(`/api/shipping-addresses/${addressId}`, {
            method: 'DELETE'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    loadAddresses(); // Reload addresses
                } else {
                    alert(data.error || 'Failed to delete address');
                }
            })
            .catch(error => {
                console.error('Error deleting address:', error);
                alert('Error deleting address. Please try again.');
            });
    }

    // Remove from wishlist
    function removeFromWishlist(wishlistId) {
        fetch(`/api/wishlist/${wishlistId}`, {
            method: 'DELETE'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    loadWishlist(); // Reload wishlist
                } else {
                    alert(data.error || 'Failed to remove item from wishlist');
                }
            })
            .catch(error => {
                console.error('Error removing from wishlist:', error);
                alert('Error removing item from wishlist. Please try again.');
            });
    }

    // Show message
    function showMessage(elementId, message, type = 'success') {
        const messageElement = document.getElementById(elementId);
        messageElement.textContent = message;
        messageElement.className = `message message-${type}`;

        // Clear message after 5 seconds
        setTimeout(() => {
            messageElement.textContent = '';
            messageElement.className = 'message';
        }, 5000);
    }
});