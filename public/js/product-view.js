// Import Three.js modules directly in HTML with type="module"
// This file contains the logic for 3D product visualization

class ProductViewer {
  constructor(containerId, modelPath) {
    this.container = document.getElementById(containerId);
    this.modelPath = modelPath;
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.model = null;
    
    this.init();
  }
  
  init() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x121212);
    
    // Create camera
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 5;
    
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
    
    // Add orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.25;
    this.controls.screenSpacePanning = false;
    this.controls.maxPolarAngle = Math.PI / 1.5;
    
    // Load model
    this.loadModel();
    
    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
    
    // Start animation loop
    this.animate();
  }
  
  loadModel() {
    const loader = new GLTFLoader();
    
    // Add loading indicator
    const loadingElement = document.createElement('div');
    loadingElement.style.position = 'absolute';
    loadingElement.style.top = '50%';
    loadingElement.style.left = '50%';
    loadingElement.style.transform = 'translate(-50%, -50%)';
    loadingElement.style.color = '#b3b3b3'; // Match --color-text-secondary
    loadingElement.style.fontFamily = 'Arial, sans-serif';
    loadingElement.style.fontSize = '14px';
    loadingElement.textContent = 'Loading 3D model...';
    this.container.appendChild(loadingElement);
    
    // Load the model
    loader.load(
      this.modelPath,
      (gltf) => {
        // Model loaded successfully
        this.model = gltf.scene;
        this.scene.add(this.model);
        
        // Center and scale the model
        this.centerModel();
        
        // Remove loading indicator
        this.container.removeChild(loadingElement);
      },
      (xhr) => {
        // Loading progress
        const percentage = Math.floor((xhr.loaded / xhr.total) * 100);
        loadingElement.textContent = `Loading 3D model: ${percentage}%`;
      },
      (error) => {
        // Error handling
        console.error('Error loading 3D model:', error);
        loadingElement.textContent = 'Error loading 3D model';
        loadingElement.style.color = 'red';
      }
    );
  }
  
  centerModel() {
    if (!this.model) return;
    
    // Create bounding box
    const boundingBox = new THREE.Box3().setFromObject(this.model);
    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());
    
    // Get the maximum dimension of the model
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Scale the model to fit in the view
    const scaleFactor = 4 / maxDim;
    this.model.scale.set(scaleFactor, scaleFactor, scaleFactor);
    
    // Recalculate bounding box after scaling
    boundingBox.setFromObject(this.model);
    boundingBox.getCenter(center);
    
    // Center the model
    this.model.position.sub(center);
    
    // Update controls
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }
  
  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  
  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Update controls
    this.controls.update();
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Export the class for use in other modules
export default ProductViewer;
