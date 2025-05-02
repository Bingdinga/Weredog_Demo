document.addEventListener('DOMContentLoaded', () => {
    // Get product ID from URL
    const productId = window.location.pathname.split('/').pop();

    // Elements
    const productName = document.getElementById('product-name');
    const productPrice = document.getElementById('product-price');
    const productDescription = document.getElementById('product-description');
    const productCategory = document.getElementById('product-category');
    const productStock = document.getElementById('product-stock');
    const modelLoadingOverlay = document.getElementById('model-loading-overlay');
    const productViewer = document.getElementById('product-viewer');
    const cycleResolutionBtn = document.getElementById('cycle-resolution');

    if (cycleResolutionBtn) {
        cycleResolutionBtn.addEventListener('click', cycleResolution);
        console.log('Added click listener to cycle resolution button');
    } else {
        console.error('Cycle resolution button not found');
    }

    // Load product data
    loadProductData();

    // Scene variables
    let scene, camera, renderer, model;
    let isDragging = false;
    let isFullscreen = false;
    let previousMousePosition = { x: 0, y: 0 };
    let userHasInteracted = false;

    let currentModelResolution = 'high';
    let productModels = {}; // Will store model paths for each resolution
    let modelLoadAttemptInProgress = false;

    console.log('Three.js loaded successfully');



    // Add fullscreen toggle functionality
    // fullscreenToggle.addEventListener('click', toggleFullscreen);

    // function toggleFullscreen() {
    //     isFullscreen = !isFullscreen;

    //     if (isFullscreen) {
    //         productViewer.classList.add('fullscreen');
    //         expandIcon.style.display = 'none';
    //         collapseIcon.style.display = 'block';
    //         document.body.style.overflow = 'hidden';
    //     } else {
    //         productViewer.classList.remove('fullscreen');
    //         expandIcon.style.display = 'block';
    //         collapseIcon.style.display = 'none';
    //         document.body.style.overflow = '';
    //     }

    //     // Update rendering after transition
    //     setTimeout(() => {
    //         onWindowResize();
    //     }, 100);
    // }

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
                // Set product details - existing code remains the same
                document.title = `${product.name} | Weredog Demo`;
                productName.textContent = product.name;
                productPrice.textContent = `$${product.price.toFixed(2)}`;
                productDescription.textContent = product.description;
                productStock.textContent = product.stock_quantity > 0
                    ? `${product.stock_quantity} items`
                    : 'Out of stock';

                // Store models by resolution
                if (product.models && product.models.length > 0) {
                    // Group models by resolution
                    product.models.forEach(model => {
                        productModels[model.resolution] = model.model_path;
                    });

                    console.log('Available model resolutions:', Object.keys(productModels));

                    // Default to high resolution if available, otherwise use the first available
                    currentModelResolution = 'high' in productModels ? 'high' :
                        ('medium' in productModels ? 'medium' :
                            ('low' in productModels ? 'low' : null));

                    // Update resolution button text
                    updateResolutionButton();

                    // If we have a valid resolution, load the model
                    if (currentModelResolution) {
                        const modelPath = productModels[currentModelResolution];
                        console.log('Loading model from path:', modelPath);

                        // Verify that THREE and GLTFLoader are loaded
                        if (window.THREE && window.THREE.GLTFLoader) {
                            init3DViewer(modelPath);
                        } else {
                            console.error('THREE.js or GLTFLoader not available');
                            initSimple3DViewer();
                        }
                    } else {
                        console.log('No models available for this product, using simple viewer');
                        initSimple3DViewer();
                    }
                } else {
                    console.log('No models available for this product, using simple viewer');
                    initSimple3DViewer();
                }
            })
            .catch(error => {
                // Error handling - existing code remains the same
                console.error('Error loading product:', error);
                productDescription.textContent = 'Error loading product details.';

                // Hide loading overlay
                if (modelLoadingOverlay) {
                    modelLoadingOverlay.classList.add('hide');
                }

                // Fall back to simple viewer
                initSimple3DViewer();
            });
    }


    // Initialize 3D viewer with GLB model
    function init3DViewer(modelPath) {
        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x121212);

        const container = document.getElementById('product-viewer');
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Create camera
        camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.z = 5;

        // Create renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
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

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
        directionalLight.position.set(1, 1, 1).normalize();
        scene.add(directionalLight);

        // Add a back light
        const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
        backLight.position.set(-1, -1, -1).normalize();
        scene.add(backLight);

        // Load the model
        const loader = new THREE.GLTFLoader();

        loader.load(
            modelPath,
            (gltf) => {
                // Model loaded successfully
                console.log('Model loaded successfully');
                model = gltf.scene;
                scene.add(model);

                // Center and scale the model
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());

                // Get the maximum dimension
                const maxDim = Math.max(size.x, size.y, size.z);
                const scaleFactor = 5 / maxDim;

                model.scale.set(scaleFactor, scaleFactor, scaleFactor);
                model.position.sub(center.multiplyScalar(scaleFactor));

                // Hide loading overlay
                modelLoadingOverlay.classList.add('hide');

                // Set up mouse control variables
                setupMouseControls();

                // Start animation loop
                animate();
            },
            (progress) => {
                // Loading progress
                const percent = Math.floor((progress.loaded / progress.total) * 100);
                console.log(`Loading model: ${percent}% loaded`);
            },
            (error) => {
                // Error handling
                console.error('Error loading 3D model:', error);
                modelLoadingOverlay.classList.add('hide');

                // Fall back to simple viewer
                initSimple3DViewer();
            }
        );

        // Window resize handling
        window.addEventListener('resize', onWindowResize);
    }

    // Fallback viewer with a simple cube
    function initSimple3DViewer() {
        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x121212);

        const container = document.getElementById('product-viewer');
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Create camera
        camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.z = 5;

        // Create renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
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
        model = new THREE.Mesh(geometry, material);
        scene.add(model);

        // Hide loading overlay
        modelLoadingOverlay.classList.add('hide');

        // Set up mouse control variables
        setupMouseControls();

        // Start animation loop
        animate();
    }

    // Mouse controls setup
    function setupMouseControls() {
        let isDragging = false;
        let previousMousePosition = {
            x: 0,
            y: 0
        };

        // Mouse events
        productViewer.addEventListener('mousedown', (e) => {
            isDragging = true;
            userHasInteracted = true;
            previousMousePosition = {
                x: e.clientX,
                y: e.clientY
            };
        });

        productViewer.addEventListener('mousemove', (e) => {
            if (isDragging && model) {
                const deltaX = e.clientX - previousMousePosition.x;
                const deltaY = e.clientY - previousMousePosition.y;

                model.rotation.y += deltaX * 0.01;
                model.rotation.x += deltaY * 0.01;

                previousMousePosition = {
                    x: e.clientX,
                    y: e.clientY
                };
            }
        });

        productViewer.addEventListener('mouseup', () => {
            isDragging = false;
        });

        productViewer.addEventListener('mouseleave', () => {
            isDragging = false;
        });

        // Mouse wheel for zoom
        productViewer.addEventListener('wheel', (e) => {
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
    }

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);

        // Add slight auto-rotation when not dragging
        if (model && !isDragging && !userHasInteracted) {
            model.rotation.y += 0.001; // Reduced from 0.005 to 0.001 for slower rotation
        }

        // Render scene
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }

    // Window resize handler
    function onWindowResize() {
        if (!camera || !renderer) return;

        const container = document.getElementById('product-viewer');
        const width = container.clientWidth;
        const height = container.clientHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);

        console.log('Resized to:', width, height);
    }

    function updateResolutionButton() {
        if (cycleResolutionBtn) {
            switch (currentModelResolution) {
                case 'high':
                    cycleResolutionBtn.textContent = 'HD';
                    break;
                case 'medium':
                    cycleResolutionBtn.textContent = 'MD';
                    break;
                case 'low':
                    cycleResolutionBtn.textContent = 'LO';
                    break;
                default:
                    cycleResolutionBtn.textContent = '??';
            }
        }
    }

    function cycleResolution() {
        console.log('Cycle resolution clicked, current resolution:', currentModelResolution);
        console.log('Available models from API:', productModels);

        if (modelLoadAttemptInProgress) {
            console.log('Model load attempt already in progress, ignoring click');
            return;
        }
        const resolutions = ['high', 'medium', 'low'];
        // const availableResolutions = resolutions.filter(res => res in productModels);

        // if (availableResolutions.length <= 1) {
        //     console.log('Only one resolution available, nothing to cycle');
        //     return; // No other resolutions to cycle through
        // }

        // Find current index
        const currentIndex = resolutions.indexOf(currentModelResolution);

        // Get next resolution (cycle back to beginning if at the end)
        const nextIndex = (currentIndex + 1) % resolutions.length;
        const nextResolution = resolutions[nextIndex];


        console.log('Attempting to switch to resolution:', nextResolution);

        // Update button right away to provide feedback
        const cycleResolutionBtn = document.getElementById('cycle-resolution');
        if (cycleResolutionBtn) {
            cycleResolutionBtn.textContent = nextResolution === 'high' ? 'HD' :
                nextResolution === 'medium' ? 'MD' : 'LO';
        }

        // Show loading overlay again
        const modelLoadingOverlay = document.getElementById('model-loading-overlay');
        if (modelLoadingOverlay) {
            modelLoadingOverlay.classList.remove('hide');
        }

        // Load the new model
        const modelPath = productModels[nextResolution] ||
            `/models/${nextResolution}/default_placeholder.glb`;

        console.log(`Attempting to load ${nextResolution} resolution from:`, modelPath);

        // Set the flag to prevent multiple simultaneous load attempts
        modelLoadAttemptInProgress = true;

        // Clear the current scene
        if (model && scene) {
            scene.remove(model);
            model = null;
        }

        // Load the new model
        tryLoadModel(modelPath, nextResolution);
    }

    function tryLoadModel(modelPath, resolution) {
        // Create a new loader
        const loader = new THREE.GLTFLoader();

        loader.load(
            modelPath,
            (gltf) => {
                // Model loaded successfully
                console.log(`${resolution} resolution model loaded successfully`);

                // Update current resolution
                currentModelResolution = resolution;

                // Store this path in productModels for future reference
                productModels[resolution] = modelPath;

                // Update the scene with the new model
                model = gltf.scene;
                scene.add(model);

                // Center and scale the model
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());

                // Get the maximum dimension
                const maxDim = Math.max(size.x, size.y, size.z);
                const scaleFactor = 5 / maxDim;

                model.scale.set(scaleFactor, scaleFactor, scaleFactor);
                model.position.sub(center.multiplyScalar(scaleFactor));

                // Hide loading overlay
                const modelLoadingOverlay = document.getElementById('model-loading-overlay');
                if (modelLoadingOverlay) {
                    modelLoadingOverlay.classList.add('hide');
                }

                // Reset the flag
                modelLoadAttemptInProgress = false;
            },
            (progress) => {
                // Loading progress - could add a progress indicator here
            },
            (error) => {
                // Error handling - try next resolution if this one failed
                console.error(`Error loading ${resolution} resolution model:`, error);

                // Reset the flag
                modelLoadAttemptInProgress = false;

                // Hide loading overlay
                const modelLoadingOverlay = document.getElementById('model-loading-overlay');
                if (modelLoadingOverlay) {
                    modelLoadingOverlay.classList.add('hide');
                }

                // Log available resolutions
                console.log('Currently available models:', Object.keys(productModels));
            }
        );
    }

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