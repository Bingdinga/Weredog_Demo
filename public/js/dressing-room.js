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
        loadMannequin();

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
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.25;
            controls.screenSpacePanning = false;
            controls.maxPolarAngle = Math.PI / 1.5;
            controls.minDistance = 1;
            controls.maxDistance = 10;
        } else {
            // Create a simple controls object with update method to avoid errors
            controls = { update: function () { } };
        }

        // Add a grid helper for reference
        const gridHelper = new THREE.GridHelper(10, 10, 0x555555, 0x333333);
        scene.add(gridHelper);

        // Handle window resize
        window.addEventListener('resize', onWindowResize);
    }

    // Load mannequin model
    function loadMannequin() {
        // You need to provide a mannequin model
        // For testing, we'll use a simple default placeholder
        const loader = new THREE.GLTFLoader();

        // Load a basic humanoid mannequin model
        // Note: You'll need to add this file to your project
        loader.load(
            '/models/mannequin.glb',
            (gltf) => {
                mannequin = gltf.scene;
                scene.add(mannequin);

                // Center the mannequin
                const box = new THREE.Box3().setFromObject(mannequin);
                const center = box.getCenter(new THREE.Vector3());
                mannequin.position.x = -center.x;
                mannequin.position.y = 0; // Keep the feet on the ground
                mannequin.position.z = -center.z;

                // Set up shadows
                mannequin.traverse(node => {
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
    }

    // Load product model
    function loadProduct(modelPath) {
        const loader = new THREE.GLTFLoader();

        loader.load(
            modelPath,
            (gltf) => {
                product = gltf.scene;
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
        product.position.set(0, 1.2, 0); // Default position at torso height
        product.rotation.set(0, 0, 0);

        // Scale product appropriately
        const box = new THREE.Box3().setFromObject(product);
        const size = box.getSize(new THREE.Vector3());

        // Calculate scale to make product reasonable size relative to mannequin
        // This is a simplified approach - you might need to adjust for specific products
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = 0.5; // Target maximum dimension in meters
        const scale = targetSize / maxDim;

        product.scale.set(scale, scale, scale);
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
            positionProductOnMannequin();
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