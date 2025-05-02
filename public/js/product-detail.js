document.addEventListener('DOMContentLoaded', () => {
    // Dynamically import Three.js
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = () => {
        console.log('Three.js loaded successfully');
        // Get product data after Three.js is loaded
        loadProductData();
    };
    document.head.appendChild(script);

    // Get product ID from URL
    const productId = window.location.pathname.split('/').pop();

    // Elements
    const productName = document.getElementById('product-name');
    const productPrice = document.getElementById('product-price');
    const productDescription = document.getElementById('product-description');
    const productCategory = document.getElementById('product-category');
    const productStock = document.getElementById('product-stock');
    const modelLoadingOverlay = document.getElementById('model-loading-overlay');
    // const fullscreenToggle = document.getElementById('fullscreen-toggle');
    const productViewer = document.getElementById('product-viewer');


    // Quantity controls
    const decreaseBtn = document.getElementById('decrease-quantity');
    const increaseBtn = document.getElementById('increase-quantity');
    const quantityInput = document.getElementById('quantity');

    // Action buttons
    const addToCartBtn = document.getElementById('add-to-cart');
    const wishlistBtn = document.getElementById('add-to-wishlist');

    // Quantity control events
    decreaseBtn.addEventListener('click', () => {
        const current = parseInt(quantityInput.value);
        if (current > 1) {
            quantityInput.value = current - 1;
        }
    });

    increaseBtn.addEventListener('click', () => {
        const current = parseInt(quantityInput.value);
        quantityInput.value = current + 1;
    });

    quantityInput.addEventListener('change', () => {
        if (quantityInput.value < 1) {
            quantityInput.value = 1;
        }
    });

    // Add to cart event
    addToCartBtn.addEventListener('click', () => {
        const quantity = parseInt(quantityInput.value);
        addToCart(productId, quantity);
    });

    // Toggle wishlist event
    wishlistBtn.addEventListener('click', () => {
        toggleWishlist(productId);
    });

    // Load product data from API
    function loadProductData() {
        fetch(`/api/products/${productId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Product not found');
                }
                return response.json();
            })
            .then(product => {
                // Set product details
                document.title = `${product.name} | 3D Shop`;
                productName.textContent = product.name;
                productPrice.textContent = `$${product.price.toFixed(2)}`;
                productDescription.textContent = product.description;
                productStock.textContent = product.stock_quantity > 0
                    ? `${product.stock_quantity} items`
                    : 'Out of stock';

                // Initialize 3D viewer with a simple cube
                initSimple3DViewer();
            })
            .catch(error => {
                console.error('Error loading product:', error);
                productDescription.textContent = 'Error loading product details.';

                // Hide loading overlay even on error
                modelLoadingOverlay.classList.add('hide');
            });
    }

    // Initialize a simple 3D viewer without OrbitControls
    function initSimple3DViewer() {
        if (!window.THREE) {
            console.error('Three.js not loaded');
            modelLoadingOverlay.classList.add('hide');
            return;
        }

        const container = document.getElementById('product-viewer');
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x121212);

        // Create camera
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.z = 5;

        // Create renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);

        // Find any existing canvas and remove it
        const existingCanvas = container.querySelector('canvas');
        if (existingCanvas) {
            container.removeChild(existingCanvas);
        }

        container.appendChild(renderer.domElement);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1).normalize();
        scene.add(directionalLight);

        // Create a simple cube
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshStandardMaterial({
            color: 0x8e2de2,
            roughness: 0.7,
            metalness: 0.3
        });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);

        // Hide loading overlay when the model is ready
        setTimeout(() => {
            modelLoadingOverlay.classList.add('hide');
        }, 500); // Short delay to ensure the scene is rendered

        // Add manual rotation with mouse
        let isDragging = false;
        let previousMousePosition = {
            x: 0,
            y: 0
        };

        // Mouse events for manual rotation
        container.addEventListener('mousedown', (e) => {
            isDragging = true;
            previousMousePosition = {
                x: e.clientX,
                y: e.clientY
            };
        });

        container.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const deltaX = e.clientX - previousMousePosition.x;
                const deltaY = e.clientY - previousMousePosition.y;

                cube.rotation.y += deltaX * 0.01;
                cube.rotation.x += deltaY * 0.01;

                previousMousePosition = {
                    x: e.clientX,
                    y: e.clientY
                };
            }
        });

        container.addEventListener('mouseup', () => {
            isDragging = false;
        });

        container.addEventListener('mouseleave', () => {
            isDragging = false;
        });

        // Mouse wheel for zoom
        container.addEventListener('wheel', (e) => {
            e.preventDefault();

            // Zoom in/out based on scroll direction
            if (e.deltaY < 0) {
                // Zoom in
                camera.position.z = Math.max(2, camera.position.z - 0.5);
            } else {
                // Zoom out
                camera.position.z = Math.min(10, camera.position.z + 0.5);
            }
        });

        // Animation function
        function animate() {
            requestAnimationFrame(animate);

            // Add slight automatic rotation when not interacting
            if (!isDragging) {
                cube.rotation.y += 0.005;
            }

            renderer.render(scene, camera);
        }

        animate();

        // Handle window resize
        window.addEventListener('resize', () => {
            // Get current dimensions from the container
            const newWidth = container.clientWidth;
            const newHeight = container.clientHeight;

            // Update camera
            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();

            // Update renderer
            renderer.setSize(newWidth, newHeight);

            console.log('Resized to:', newWidth, newHeight); // Debug info
        });
    }

    // Add to cart function
    function addToCart(productId, quantity) {
        fetch('/api/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ productId, quantity })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Product added to cart successfully!');
                } else {
                    alert(data.error || 'Failed to add product to cart');
                }
            })
            .catch(error => {
                console.error('Error adding to cart:', error);
                alert('Error adding product to cart');
            });
    }

    // Toggle wishlist function
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
                    if (response.status === 401) {
                        // User not authenticated, redirect to login
                        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
                        return Promise.reject('Authentication required');
                    }
                    return response.json().then(data => Promise.reject(data.error || 'Error occurred'));
                }
                return response.json();
            })
            .then(data => {
                if (data && data.success) {
                    // Update wishlist button
                    if (data.added) {
                        wishlistBtn.textContent = '♥';
                        wishlistBtn.classList.add('active');
                        alert('Product added to wishlist!');
                    } else {
                        wishlistBtn.textContent = '♡';
                        wishlistBtn.classList.remove('active');
                        alert('Product removed from wishlist');
                    }
                }
            })
            .catch(error => {
                if (error !== 'Authentication required') {
                    console.error('Error toggling wishlist:', error);
                    alert('Error updating wishlist');
                }
            });
    }
});