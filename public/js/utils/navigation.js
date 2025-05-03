// Navigation management
document.addEventListener('DOMContentLoaded', () => {
    loadNavigation();
});

function loadNavigation() {
    fetch('/api/auth/check')
        .then(response => response.json())
        .then(data => {
            const navLinks = document.getElementById('nav-links');
            
            if (data.authenticated && (data.user.role === 'admin' || data.user.role === 'manager')) {
                navLinks.innerHTML = getAdminNavigation(data.user);
            } else {
                navLinks.innerHTML = getCustomerNavigation(data.authenticated);
            }
        })
        .catch(error => {
            console.error('Error loading navigation:', error);
            document.getElementById('nav-links').innerHTML = getCustomerNavigation(false);
        });
}

function getAdminNavigation(user) {
    return `
        <li class="nav-dropdown">
            <a href="#" class="dropdown-trigger">Customer Views ▼</a>
            <ul class="dropdown-menu">
                <li><a href="/">Home</a></li>
                <li><a href="/products">Products</a></li>
                <li><a href="/dressing-room">Dressing Room</a></li>
                <li><a href="/cart">Cart</a></li>
                <li><a href="/wishlist">Wishlist</a></li>
            </ul>
        </li>
        <li><a href="/admin">Dashboard</a></li>
        <li><a href="/admin/inventory">Inventory</a></li>
        <li><a href="/admin/orders">Orders</a></li>
        <li><a href="/admin/analytics">Analytics</a></li>
        <li><a href="/admin/discounts">Discounts</a></li>
        <li class="nav-dropdown">
            <a href="#" class="dropdown-trigger">Hi, ${user.first_name || user.username} ▼</a>
            <ul class="dropdown-menu">
                <li><a href="/account">Account Settings</a></li>
                <li><a href="#" id="logout-link">Logout</a></li>
            </ul>
        </li>
    `;
}

function getCustomerNavigation(authenticated) {
    const accountSection = authenticated ? `
        <li class="nav-dropdown">
            <a href="/account" class="dropdown-trigger">Account ▼</a>
            <ul class="dropdown-menu">
                <li><a href="/account">Account Settings</a></li>
                <li><a href="/account#orders">Order History</a></li>
                <li><a href="/wishlist">Wishlist</a></li>
                <li><a href="#" id="logout-link">Logout</a></li>
            </ul>
        </li>
    ` : `
        <li><a href="/account">Account</a></li>
    `;

    return `
        <li><a href="/">Home</a></li>
        <li><a href="/products">Products</a></li>
        <li><a href="/dressing-room">Dressing Room</a></li>
        <li><a href="/cart">Cart <span id="cart-count" class="cart-count">0</span></a></li>
        ${accountSection}
    `;
}

// Add logout functionality
document.addEventListener('click', (e) => {
    if (e.target.id === 'logout-link') {
        e.preventDefault();
        logout();
    }
});

function logout() {
    fetch('/api/auth/logout', {
        method: 'POST'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = '/';
            }
        })
        .catch(error => {
            console.error('Error logging out:', error);
        });
}

// Listen for auth status changes
window.addEventListener('authStatusChanged', () => {
    loadNavigation();
});