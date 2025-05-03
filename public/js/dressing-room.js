import { applyRandomMatteMaterial } from '/js/utils/materialHelper.js';

document.addEventListener('DOMContentLoaded', () => {

    if (!THREE) {
        console.error('THREE.js is not loaded. Please make sure three.min.js is properly included.');
        document.getElementById('dressing-room-canvas').innerHTML =
            '<div style="padding: 20px; color: red;">Error: THREE.js is not available. Please check your console for details.</div>';
        return;
    }

    // Check if OrbitControls is available
    const hasOrbitControls = typeof THREE.OrbitControls === 'function';
    if (!hasOrbitControls) {
        console.warn('THREE.OrbitControls is not available. Using basic camera controls instead.');
    }

    // Scene variables
    let scene, camera, renderer, controls;
    let mannequin, product;
    let productModels = {};
    let currentProductId = null;

    // Elements
    const canvas = document.getElementById('dressing-room-canvas');
    const loadingOverlay = document.getElementById('loading-overlay');
    const productSelect = document.getElementById('product-select');
    const mannequinSelect = document.getElementById('mannequin-select');
    const productName = document.getElementById('product-name');
    const productPrice = document.getElementById('product-price');
    const productDescription = document.getElementById('product-description');
    const productLink = document.getElementById('product-link');
    const resetButton = document.getElementById('reset-position');

    // Movement configuration
    const moveSpeed = 0.05;
    const rotateSpeed = 0.05;
    const keyState = {
        ArrowUp: false,
        ArrowDown: false,
        ArrowLeft: false,
        ArrowRight: false,
        KeyW: false,
        KeyA: false,
        KeyS: false,
        KeyD: false
    };

    // Initialize
    init();

    // Main initialization function
    function init() {
        // Setup Three.js scene
        setupScene();

        // Load mannequin
        loadMannequin(mannequinSelect.value);

        // Fetch and populate product dropdown
        fetchProducts();

        // Setup event listeners
        setupEventListeners();

        // Start animation loop
        animate();
    }

    // Setup Three.js scene
    function setupScene() {
        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x121212);

        // Create camera
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.set(0, 1.6, 3); // Position camera at eye level

        // Create renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;

        // Clear any existing canvas
        while (canvas.firstChild) {
            canvas.removeChild(canvas.firstChild);
        }

        canvas.appendChild(renderer.domElement);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 2, 3);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
        backLight.position.set(-1, 1, -1);
        scene.add(backLight);

        // Add orbit controls if available, otherwise skip
        if (typeof THREE.OrbitControls === 'function') {
            // Use THREE.OrbitControls since we added it to the THREE namespace
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.25;
            controls.screenSpacePanning = false;
            controls.maxPolarAngle = Math.PI / 1.5;
            controls.minDistance = 1;
            controls.maxDistance = 10;
        } else {
            // Fallback if something still goes wrong
            console.warn('OrbitControls not available. Using basic camera controls instead.');
            controls = { update: function () { } };
        }

        // Add a grid helper for reference
        const gridHelper = new THREE.GridHelper(10, 10, 0x555555, 0x333333);
        scene.add(gridHelper);

        // Handle window resize
        window.addEventListener('resize', onWindowResize);
    }

    // Load mannequin model
    function loadMannequin(modelPath) {
        // Remove existing mannequin if any
        if (mannequin) {
            scene.remove(mannequin);
            mannequin = null;
        }

        const loader = new THREE.GLTFLoader();

        // Show loading overlay
        loadingOverlay.classList.remove('hide');

        loader.load(
            modelPath,
            (gltf) => {
                mannequin = gltf.scene;
                scene.add(mannequin);

                // Get the bounding box to determine size
                const box = new THREE.Box3().setFromObject(mannequin);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());

                // Calculate appropriate scale based on the model's height
                const height = size.y;

                // Target height for mannequin (adjust this value as needed)
                const targetHeight = 2.5; // Example: aim for 2.5 units tall

                // Calculate scale to achieve target height
                let scale = targetHeight / height;

                // You can add specific scaling for different models if needed
                if (modelPath.includes('male')) {
                    scale *= 1.1; // Make male mannequin slightly taller
                } else if (modelPath.includes('female')) {
                    scale *= 0.95; // Make female mannequin slightly shorter
                } else if (modelPath.includes('athletic')) {
                    scale *= 1.05; // Athletic mannequin slightly taller
                }

                // Apply the scale
                mannequin.scale.set(scale, scale, scale);

                // Recalculate center after scaling
                const scaledBox = new THREE.Box3().setFromObject(mannequin);
                const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

                // Position mannequin
                mannequin.position.x = -scaledCenter.x;
                mannequin.position.y = 0; // Keep the feet on the ground
                mannequin.position.z = -scaledCenter.z;

                // Set up shadows
                mannequin.traverse(node => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });

                // Hide loading overlay
                loadingOverlay.classList.add('hide');

                // Log for debugging
                console.log(`Mannequin loaded: ${modelPath}`);
                console.log(`Original height: ${height.toFixed(2)}, Scale: ${scale.toFixed(2)}`);
            },
            (xhr) => {
                // Loading progress
                const percentage = Math.floor((xhr.loaded / xhr.total) * 100);
                console.log(`Loading mannequin: ${percentage}%`);
            },
            (error) => {
                // Error handling
                console.error('Error loading mannequin model:', error);

                // Create a fallback geometry for testing
                createFallbackMannequin();
            }
        );
    }

    // Create a fallback mannequin if the model fails to load
    function createFallbackMannequin() {
        // Create a simple humanoid shape
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.25, 32, 32),
            new THREE.MeshStandardMaterial({ color: 0xbbbbbb })
        );
        head.position.y = 1.7;

        const torso = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25, 0.25, 0.5, 32),
            new THREE.MeshStandardMaterial({ color: 0xbbbbbb })
        );
        torso.position.y = 1.3;

        const lowerBody = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25, 0.2, 0.4, 32),
            new THREE.MeshStandardMaterial({ color: 0xbbbbbb })
        );
        lowerBody.position.y = 0.9;

        const leftLeg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 0.9, 32),
            new THREE.MeshStandardMaterial({ color: 0xbbbbbb })
        );
        leftLeg.position.set(-0.1, 0.45, 0);

        const rightLeg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 0.9, 32),
            new THREE.MeshStandardMaterial({ color: 0xbbbbbb })
        );
        rightLeg.position.set(0.1, 0.45, 0);

        const leftArm = new THREE.Mesh(
            new THREE.CylinderGeometry(0.075, 0.075, 0.7, 32),
            new THREE.MeshStandardMaterial({ color: 0xbbbbbb })
        );
        leftArm.position.set(-0.35, 1.3, 0);
        leftArm.rotation.z = Math.PI / 6;

        const rightArm = new THREE.Mesh(
            new THREE.CylinderGeometry(0.075, 0.075, 0.7, 32),
            new THREE.MeshStandardMaterial({ color: 0xbbbbbb })
        );
        rightArm.position.set(0.35, 1.3, 0);
        rightArm.rotation.z = -Math.PI / 6;

        // Create group for the mannequin
        mannequin = new THREE.Group();
        mannequin.add(head, torso, lowerBody, leftLeg, rightLeg, leftArm, rightArm);

        scene.add(mannequin);
        loadingOverlay.classList.add('hide');
    }

    // Fetch available products and populate the dropdown
    function fetchProducts() {
        // Fetch all products from API
        fetch('/api/products')
            .then(response => response.json())
            .then(data => {
                productModels = {};

                // First fetch all models for each product
                const modelFetchPromises = data.map(product =>
                    fetch(`/api/products/${product.product_id}`)
                        .then(response => response.json())
                        .then(productDetails => {
                            if (productDetails.models && productDetails.models.length > 0) {
                                const highResModel = productDetails.models.find(m => m.resolution === 'high');

                                if (highResModel && highResModel.model_path) {
                                    productModels[product.product_id] = {
                                        id: product.product_id,
                                        name: product.name,
                                        price: product.price,
                                        description: product.description,
                                        modelPath: highResModel.model_path
                                    };
                                }
                            }
                        })
                );

                // After all model data is fetched, populate the dropdown
                Promise.all(modelFetchPromises)
                    .then(() => {
                        // Clear loading option
                        productSelect.innerHTML = '<option value="">Select a product</option>';

                        // Add options for each product with a model
                        Object.values(productModels).forEach(product => {
                            const option = document.createElement('option');
                            option.value = product.id;
                            option.textContent = product.name;
                            productSelect.appendChild(option);
                        });
                    });
            })
            .catch(error => {
                console.error('Error fetching products:', error);
                productSelect.innerHTML = '<option value="">Error loading products</option>';
            });
    }

    // Handle product selection change
    function handleProductChange() {
        const selectedProductId = productSelect.value;

        // Clear previous product
        if (product) {
            scene.remove(product);
            product = null;
        }

        // If no product selected, clear info
        if (!selectedProductId) {
            productName.textContent = 'Select a product to see details';
            productPrice.textContent = '';
            productDescription.textContent = '';
            productLink.style.display = 'none';
            return;
        }

        currentProductId = selectedProductId;
        const selectedProduct = productModels[selectedProductId];

        // Update product info
        productName.textContent = selectedProduct.name;
        productPrice.textContent = `$${selectedProduct.price.toFixed(2)}`;
        productDescription.textContent = selectedProduct.description;
        productLink.href = `/product/${selectedProductId}`;
        productLink.style.display = 'inline-block';

        // Show loading overlay
        loadingOverlay.classList.remove('hide');

        // Load product model
        loadProduct(selectedProduct.modelPath);

        // NEW CODE: Blur the dropdown to remove focus after selection
        productSelect.blur();

        // Optional: Also focus on the canvas to ensure keyboard events go there
        canvas.focus();
    }

    // Load product model
    function loadProduct(modelPath) {
        const loader = new THREE.GLTFLoader();

        loader.load(
            modelPath,
            (gltf) => {
                product = gltf.scene;

                // Apply random material to all meshes
                applyRandomMatteMaterial(product);

                scene.add(product);

                // Position the product
                positionProductOnMannequin();

                // Set up shadows
                product.traverse(node => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });

                // Hide loading overlay
                loadingOverlay.classList.add('hide');
            },
            (xhr) => {
                // Loading progress
                const percentage = Math.floor((xhr.loaded / xhr.total) * 100);
                console.log(`Loading product: ${percentage}%`);
            },
            (error) => {
                // Error handling
                console.error('Error loading product model:', error);
                loadingOverlay.classList.add('hide');
                alert('Error loading the selected product model.');
            }
        );
    }

    // Position the product on the mannequin
    function positionProductOnMannequin() {
        if (!product) return;

        // Reset product position and rotation
        product.position.set(0, 0.7, 0.8); // Default position at torso height
        product.rotation.set(0, 0, 0);

        // Scale product appropriately
        const box = new THREE.Box3().setFromObject(product);
        const size = box.getSize(new THREE.Vector3());

        // Calculate scale to make product reasonable size relative to mannequin
        // This is a simplified approach - you might need to adjust for specific products
        const maxDim = Math.max(size.x, size.y, size.z);

        // Use a much smaller target size to prevent the product from being too large
        // Adjust this value based on your mannequin size
        const targetSize = 0.5; // Reduced from 0.5 to 0.3 - adjust as needed

        const scale = targetSize / maxDim;

        product.scale.set(scale, scale, scale);

        console.log(`Product size: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}, Scale: ${scale.toFixed(4)}`);
    }

    // Handle movement with arrow keys
    function updateProductPosition() {
        if (!product) return;

        // Calculate forward and right vectors based on camera orientation
        const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);

        // Remove vertical component to keep movement horizontal
        cameraForward.y = 0;
        cameraRight.y = 0;
        cameraForward.normalize();
        cameraRight.normalize();

        // Apply movement based on key states
        if (keyState.ArrowUp) {
            product.position.addScaledVector(cameraForward, moveSpeed);
        }
        if (keyState.ArrowDown) {
            product.position.addScaledVector(cameraForward, -moveSpeed);
        }
        if (keyState.ArrowLeft) {
            product.position.addScaledVector(cameraRight, -moveSpeed);
        }
        if (keyState.ArrowRight) {
            product.position.addScaledVector(cameraRight, moveSpeed);
        }

        // Rotate product
        if (keyState.KeyW) {
            product.rotation.x += rotateSpeed;
        }
        if (keyState.KeyS) {
            product.rotation.x -= rotateSpeed;
        }
        if (keyState.KeyA) {
            product.rotation.y += rotateSpeed;
        }
        if (keyState.KeyD) {
            product.rotation.y -= rotateSpeed;
        }
    }

    // Reset product position
    function resetProductPosition() {
        if (product) {
            // First remove the product from the scene to clear any transformations
            scene.remove(product);

            // Then reload the current product
            const selectedProduct = productModels[currentProductId];
            if (selectedProduct && selectedProduct.modelPath) {
                // Show loading overlay
                loadingOverlay.classList.remove('hide');

                // Load product again (this will position it correctly)
                loadProduct(selectedProduct.modelPath);
            } else {
                console.error('Cannot reset product: no valid product selected');
            }
        }
    }

    // Window resize handler
    function onWindowResize() {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);

        // Update product position based on keys
        updateProductPosition();

        // Update orbit controls
        controls.update();

        // Render scene
        renderer.render(scene, camera);
    }

    // Setup event listeners
    function setupEventListeners() {
        // Product selection change
        productSelect.addEventListener('change', handleProductChange);

        // Reset button
        resetButton.addEventListener('click', resetProductPosition);

        mannequinSelect.addEventListener('change', (e) => {
            // Save current product if any
            const currentProductId = productSelect.value;

            // Load new mannequin
            loadMannequin(e.target.value);

            // Restore product if one was selected
            if (currentProductId && productModels[currentProductId]) {
                // Small delay to ensure mannequin is loaded
                setTimeout(() => {
                    loadProduct(productModels[currentProductId].modelPath);
                }, 500);
            }
        });

        // Key controls for product movement
        window.addEventListener('keydown', (e) => {
            if (keyState.hasOwnProperty(e.code)) {
                keyState[e.code] = true;
                // Prevent scrolling when using arrow keys
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                    e.preventDefault();
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (keyState.hasOwnProperty(e.code)) {
                keyState[e.code] = false;
            }
        });

        // Clear key states when window loses focus
        window.addEventListener('blur', () => {
            Object.keys(keyState).forEach(key => {
                keyState[key] = false;
            });
        });
    }
});