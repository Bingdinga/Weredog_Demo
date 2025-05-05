/**
 * Material helper utilities
 */

// Add this function to ensure texture is ready
function createTextureFromCanvas(canvas) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;

    // Force update
    texture.image = canvas;

    return texture;
}

// Create a solid color texture
function createPlainTexture(color, width = 256, height = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    // Fill with solid color
    context.fillStyle = `rgb(${color.r * 255}, ${color.g * 255}, ${color.b * 255})`;
    context.fillRect(0, 0, width, height);

    return createTextureFromCanvas(canvas);
}

// Create a noisy texture
function createNoisyTexture(color1, color2, width = 256, height = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    // Create noise pattern
    const imageData = context.createImageData(width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;

            // Generate noise using multiple frequencies
            const noise1 = Math.sin(x * 0.02) * Math.cos(y * 0.02);
            const noise2 = Math.sin(x * 0.05) * Math.cos(y * 0.05);
            const noise3 = Math.sin(x * 0.1) * Math.cos(y * 0.1);

            const noiseValue = (noise1 + noise2 + noise3) / 3;
            const blend = (noiseValue + 1) / 2; // Normalize to 0-1

            // Blend between the two colors
            const r = Math.floor(color1.r * 255 * (1 - blend) + color2.r * 255 * blend);
            const g = Math.floor(color1.g * 255 * (1 - blend) + color2.g * 255 * blend);
            const b = Math.floor(color1.b * 255 * (1 - blend) + color2.b * 255 * blend);

            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
            data[i + 3] = 255; // Alpha
        }
    }

    context.putImageData(imageData, 0, 0);

    return createTextureFromCanvas(canvas);
}

// Create a ribbon texture
function createRibbonTexture(color1, color2, width = 256, height = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    // Fill with first color
    context.fillStyle = `rgb(${color1.r * 255}, ${color1.g * 255}, ${color1.b * 255})`;
    context.fillRect(0, 0, width, height);

    // Create diagonal stripes
    const stripeWidth = width / 8;
    context.strokeStyle = `rgb(${color2.r * 255}, ${color2.g * 255}, ${color2.b * 255})`;
    context.lineWidth = stripeWidth;
    context.lineCap = 'round';

    for (let i = -height; i < width + height; i += stripeWidth * 2) {
        context.beginPath();
        context.moveTo(i, 0);
        context.lineTo(i + height, height);
        context.stroke();
    }

    return createTextureFromCanvas(canvas);
}

// Generate material type (plain, noise, or ribbon)
function getMaterialType() {
    const random = Math.random();
    if (random < 0.33) {
        return 'plain';
    } else if (random < 0.66) {
        return 'noise';
    } else {
        return 'ribbon';
    }
}

/**
 * Apply material based on flag
 * @param {Object} modelObject - The 3D model to apply materials to
 * @param {boolean} preserveTextures - Whether to preserve existing textures
 */
export function applyMaterialToModel(modelObject, preserveTextures = false) {
    // console.log(`Applying materials. Preserve textures: ${preserveTextures}`);

    if (preserveTextures) {
        // Preserve existing materials and textures
        modelObject.traverse((node) => {
            if (node.isMesh && node.material) {
                // console.log('Preserving existing material on mesh:', node.name);
                // Keep existing material but ensure it's visible
                if (node.material.emissive) {
                    node.material.emissive.setHex(0x333333);
                }
                // Make sure the material is ready for rendering
                node.material.needsUpdate = true;
            }
        });
    } else {
        // Apply random matte material
        // console.log('Applying random matte materials');
        applyRandomMatteMaterial(modelObject);
    }
}

/**
 * Apply random matte material to all meshes in a model
 * @param {Object} modelObject - The 3D model to apply materials to
 */
export function applyRandomMatteMaterial(modelObject) {
    modelObject.traverse((node) => {
        if (node.isMesh) {
            // Generate primary color using HSL
            const hue = Math.random();                     // 0-1
            const saturation = 0.3 + Math.random() * 0.4;  // 0.3-0.7
            const lightness = 0.4 + Math.random() * 0.3;   // 0.4-0.7

            const primaryColor = new THREE.Color().setHSL(hue, saturation, lightness);

            // Generate secondary color (for patterns)
            const secondaryHue = (hue + 0.5) % 1;  // Complementary color
            const secondaryColor = new THREE.Color().setHSL(
                secondaryHue,
                saturation * 0.8,  // Slightly less saturated
                lightness
            );

            // Determine material type
            const materialType = getMaterialType();
            let texture;

            if (materialType === 'plain') {
                node.material = new THREE.MeshStandardMaterial({
                    color: primaryColor,
                    roughness: 0.8,
                    metalness: 0.2,
                });
            } else {
                // For noise and ribbon, mix vertex colors directly
                const colors = [];
                const position = node.geometry.attributes.position;

                for (let i = 0; i < position.count; i++) {
                    // Create pattern based on vertex position
                    const x = position.getX(i);
                    const y = position.getY(i);

                    let blend = 0.5;
                    if (materialType === 'noise') {
                        // Create noise based on position
                        blend = (Math.sin(x * 3) * Math.cos(y * 3) + 1) / 2;
                    } else if (materialType === 'ribbon') {
                        // Create stripe pattern
                        blend = (Math.sin((x + y) * 5) + 1) / 2;
                    }

                    // Blend colors
                    const color = primaryColor.clone().lerp(secondaryColor, blend);
                    colors.push(color.r, color.g, color.b);
                }

                node.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
                node.material = new THREE.MeshStandardMaterial({
                    vertexColors: true,
                    roughness: 0.8,
                    metalness: 0.2,
                });
            }
        }
    });
}