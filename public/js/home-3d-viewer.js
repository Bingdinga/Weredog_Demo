// JavaScript for initializing 3D viewer in hero section
document.addEventListener('DOMContentLoaded', function () {
    // Check if Three.js is available
    if (typeof THREE === 'undefined') {
        // If Three.js is not loaded, add the required scripts
        const threeScript = document.createElement('script');
        threeScript.src = '/js/lib/three/three.min.js';
        document.head.appendChild(threeScript);

        const loaderScript = document.createElement('script');
        loaderScript.src = '/js/lib/three/GLTFLoader.js';

        threeScript.onload = function () {
            document.head.appendChild(loaderScript);
            loaderScript.onload = initHero3DViewer;
        };
    } else {
        // If Three.js is already loaded, initialize the viewer
        initHero3DViewer();
    }

    // Function to initialize the 3D viewer
    function initHero3DViewer() {
        const container = document.getElementById('hero-3d-container');
        
        // If container doesn't exist, return early
        if (!container) return;

        // Clear the loading text
        container.innerHTML = '';

        // Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x121212);

        // Create camera
        const width = container.clientWidth;
        const height = container.clientHeight;
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.z = 5;

        // Create renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1).normalize();
        scene.add(directionalLight);

        // Create a simple shape to display
        let model;

        // Check if GLTFLoader is available
        if (THREE.GLTFLoader) {
            // Try to load a real model
            const modelPath = '/models/high/default_placeholder.glb'; // Use a default model path
            const loader = new THREE.GLTFLoader();

            loader.load(
                modelPath,
                (gltf) => {
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

                    // Rotate the model a bit
                    model.rotation.y = Math.PI / 4;
                },
                undefined,
                (error) => {
                    console.error('Error loading model:', error);
                    createFallbackModel();
                }
            );
        } else {
            createFallbackModel();
        }

        // Fallback to creating a simple geometric shape
        function createFallbackModel() {
            // Create a simple cube as fallback
            const geometry = new THREE.BoxGeometry(2, 2, 2);
            const material = new THREE.MeshStandardMaterial({
                color: 0x8e2de2, // Purple color matching the site theme
                roughness: 0.7,
                metalness: 0.3
            });
            model = new THREE.Mesh(geometry, material);
            scene.add(model);
        }

        // Animation loop
        function animate() {
            requestAnimationFrame(animate);

            // Rotate the model if it exists
            if (model) {
                model.rotation.y += 0.005;
            }

            renderer.render(scene, camera);
        }

        // Handle window resize
        window.addEventListener('resize', function () {
            const width = container.clientWidth;
            const height = container.clientHeight;

            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        });

        // Start the animation loop
        animate();
    }
});