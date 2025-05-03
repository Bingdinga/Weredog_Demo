import { applyMaterialToModel } from '/js/utils/materialHelper.js';

/**
 * Product Card 3D Model Renderer
 * Creates and manages small 3D model previews for product cards
 */
class ProductCardModel {
    constructor(container, productId) {
        this.container = container;
        this.productId = productId;
        this.useExistingTexture = false;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.model = null;
        this.initialized = false;

        // Initialize only if Three.js is available
        if (typeof THREE !== 'undefined' && container) {
            this.init();
        }
    }

    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x121212); // Match dark theme

        // Create camera
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.z = 4;

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1).normalize();
        this.scene.add(directionalLight);

        const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
        backLight.position.set(-1, -1, -1).normalize();
        this.scene.add(backLight);

        // Load model
        this.loadModel();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        this.initialized = true;

        // Start animation loop
        this.animate();
    }

    loadModel() {
        // If THREE.GLTFLoader is not available, show fallback
        if (!THREE.GLTFLoader) {
            this.createFallbackModel();
            return;
        }

        const loader = new THREE.GLTFLoader();

        // Try to load model based on product ID
        // Default to placeholder if specific model isn't found
        fetch(`/api/products/${this.productId}`)
            .then(response => response.json())
            .then(product => {
                this.useExistingTexture = Boolean(product.use_existing_texture);
                // Check if product has models
                if (product.models && product.models.length > 0) {
                    // Use low resolution for card previews to save bandwidth
                    const lowResModel = product.models.find(m => m.resolution === 'low');
                    const modelPath = lowResModel ? lowResModel.model_path :
                        (product.models[0].model_path || '/models/low/default_placeholder.glb');

                    this.loadGLTFModel(modelPath);
                } else {
                    // Fallback to default placeholder
                    this.loadGLTFModel('/models/low/default_placeholder.glb');
                }
            })
            .catch(error => {
                console.error(`Error loading product ${this.productId} data:`, error);
                this.createFallbackModel();
            });
    }

    loadGLTFModel(modelPath) {
        const loader = new THREE.GLTFLoader();
        loader.load(
            modelPath,
            (gltf) => {
                if (this.model && this.scene) {
                    this.scene.remove(this.model);
                }

                this.model = gltf.scene;

                // Use the texture flag
                console.log(`Applying materials to product card model. useExistingTexture: ${this.useExistingTexture}`);
                applyMaterialToModel(this.model, this.useExistingTexture);

                this.scene.add(this.model);
                this.centerModel();
            },
            undefined,
            (error) => {
                console.error('Error loading model:', error);
                this.createFallbackModel();
            }
        );
    }


    centerModel() {
        if (!this.model) return;

        // Create bounding box
        const box = new THREE.Box3().setFromObject(this.model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Get the maximum dimension
        const maxDim = Math.max(size.x, size.y, size.z);
        const scaleFactor = 2 / maxDim; // Smaller scale for cards

        this.model.scale.set(scaleFactor, scaleFactor, scaleFactor);

        // Recalculate bounding box after scaling
        box.setFromObject(this.model);
        box.getCenter(center);

        // Center the model
        this.model.position.sub(center);
    }

    createFallbackModel() {
        // Create a simple cube as fallback
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({
            color: 0x8e2de2, // Purple color matching the site theme
            roughness: 0.7,
            metalness: 0.3
        });
        this.model = new THREE.Mesh(geometry, material);
        this.scene.add(this.model);
    }

    onWindowResize() {
        if (!this.camera || !this.renderer) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        if (!this.initialized) return;

        requestAnimationFrame(() => this.animate());

        // Rotate the model slowly
        if (this.model) {
            this.model.rotation.y += 0.003;
        }

        // Render scene
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    // Cleanup method to prevent memory leaks
    dispose() {
        this.initialized = false;

        if (this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }

        if (this.model) {
            this.scene.remove(this.model);
            this.model = null;
        }

        this.scene = null;
        this.camera = null;
        this.renderer = null;
    }
}

export { ProductCardModel };