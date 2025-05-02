// JavaScript for loading featured products
document.addEventListener('DOMContentLoaded', function () {
    // Load featured products from API
    fetch('/api/products/featured')
        .then(response => response.json())
        .then(products => {
            if (products && products.length > 0) {
                const productGrid = document.querySelector('.product-grid');
                productGrid.innerHTML = ''; // Clear placeholder

                products.forEach(product => {
                    const productCard = document.createElement('div');
                    productCard.className = 'product-card';

                    const imagePath = product.image_path || '/img/placeholder.png';

                    productCard.innerHTML = `
                        <div class="product-image">
                            <img src="${imagePath}" alt="${product.name}">
                        </div>
                        <div class="product-info">
                            <h3 class="product-title">${product.name}</h3>
                            <p class="product-price">$${product.price.toFixed(2)}</p>
                            <a href="/product/${product.product_id}" class="btn">View Details</a>
                        </div>
                    `;

                    productGrid.appendChild(productCard);
                });
            }
        })
        .catch(error => {
            console.error('Error loading featured products:', error);
        });
});