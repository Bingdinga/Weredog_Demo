// Updated /public/js/home-products.js
import { ProductCardModel } from '/js/product-card-model.js';

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

                    // Create model container for 3D visualization
                    const modelContainer = document.createElement('div');
                    modelContainer.className = 'product-model-container';
                    modelContainer.id = `product-model-${product.product_id}`;
                    modelContainer.style.height = '200px';
                    
                    productCard.appendChild(modelContainer);

                    // Add product info
                    const productInfo = document.createElement('div');
                    productInfo.className = 'product-info';
                    productInfo.innerHTML = `
                        <h3 class="product-title">${product.name}</h3>
                        <p class="product-price">$${product.price.toFixed(2)}</p>
                        <a href="/product/${product.product_id}" class="btn">View Details</a>
                    `;
                    
                    productCard.appendChild(productInfo);
                    productGrid.appendChild(productCard);

                    // Initialize 3D model with a small delay to ensure DOM is updated
                    setTimeout(() => {
                        new ProductCardModel(document.getElementById(`product-model-${product.product_id}`), product.product_id);
                    }, 10);
                });
            }
        })
        .catch(error => {
            console.error('Error loading featured products:', error);
        });
});