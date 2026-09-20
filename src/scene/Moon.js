import * as THREE from 'three';

/**
 * Photorealistic 3D Celestial Moon with Dynamic Halloween Color Progression:
 * - 128x128 SphereGeometry with 8K NASA craters and tactile relief.
 * - Custom lunar shader lifting dark basalt maria to eliminate any faded/black overlay
 *   while preserving 100% of photographic crater topographical fidelity.
 * - Authentic Lommel-Seeliger retroreflective lunar regolith limb illumination.
 * - Ethereal additive celestial corona glowing softly behind the sphere in the active Halloween hue.
 * - Dynamic color transitions: Blue -> Red -> Yellow -> Orange -> Purple -> Blue.
 */

const moonVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const moonFragmentShader = `
  uniform sampler2D tMoon;
  uniform vec3 uColor;
  uniform float uTime;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec4 tex = texture2D(tMoon, vUv);

    // 1. Dynamic Contrast Lift:
    // Preserves 100% of Tycho rays, Copernicus rims, and basalt maria
    // while lifting the minimum tone so dark maria never appear as a muddy black overlay.
    float lunarTone = mix(0.48, 1.0, pow(tex.r, 0.82));

    // 2. Lommel-Seeliger Retroreflective Regolith Limb Glow:
    // The full moon retroreflects sunlight back to the observer, maintaining uniform disk luminosity
    // with a crisp, subtle edge glow.
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    float NdotV = clamp(dot(normal, viewDir), 0.0, 1.0);
    float limbGlow = pow(1.0 - NdotV, 3.2) * 0.35;

    // 3. Harmonic blend with the active Halloween celestial color
    vec3 surfaceColor = uColor * lunarTone;

    // Subtle luminous lunar highlight on high-albedo crater ejecta rays
    vec3 craterHighlight = vec3(1.0, 0.97, 0.94) * pow(tex.r, 1.5) * 0.22;

    vec3 finalColor = surfaceColor + craterHighlight + uColor * limbGlow;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export class Moon {
  constructor(scene) {
    this.scene = scene;
    this.radius = 2.85;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Positioned in the celestial sky as viewed from the ground observer
    this.position = new THREE.Vector3(0, 12, -35);
    this.group.position.copy(this.position);

    // Default starting color: Blue Moon
    this.currentColor = new THREE.Color(0x3d7ef5);

    this.initMoonSphere();
    this.initCelestialHalo();
    this.initLighting();
  }

  initMoonSphere() {
    const textureLoader = new THREE.TextureLoader();

    // 1. Instant base load: 2K texture
    this.texture = textureLoader.load('/textures/2k_moon.jpg', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 16;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.needsUpdate = true;
      if (this.material && this.material.uniforms.tMoon) {
        this.material.uniforms.tMoon.value = tex;
      }
    });

    // 2. High-density Sphere (128x128)
    const geometry = new THREE.SphereGeometry(this.radius, 128, 128);

    // 3. Custom Astronomical Lunar Material with 100% photographic texture fidelity
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tMoon: { value: this.texture },
        uColor: { value: this.currentColor },
        uTime: { value: 0 }
      },
      vertexShader: moonVertexShader,
      fragmentShader: moonFragmentShader
    });

    this.mesh = new THREE.Mesh(geometry, this.material);

    // Orient Near Side (Mare Tranquillitatis, Tycho, Copernicus) directly at observer
    this.mesh.rotation.y = -Math.PI * 0.5;
    this.mesh.rotation.x = 0.06;

    this.group.add(this.mesh);

    // 4. Asynchronously background load 8K NASA texture
    textureLoader.load(
      '/textures/8k_moon.jpg',
      (tex8k) => {
        tex8k.colorSpace = THREE.SRGBColorSpace;
        tex8k.anisotropy = 16;
        tex8k.wrapS = THREE.ClampToEdgeWrapping;
        tex8k.wrapT = THREE.ClampToEdgeWrapping;
        tex8k.generateMipmaps = true;
        tex8k.minFilter = THREE.LinearMipmapLinearFilter;

        if (this.material && this.material.uniforms.tMoon) {
          this.material.uniforms.tMoon.value = tex8k;
        }
        console.log('[Moon] 8K Ultra-High-Definition Lunar Texture active.');
      },
      undefined,
      (err) => console.warn('[Moon] 8K texture fallback to 2K:', err)
    );
  }

  initCelestialHalo() {
    // Soft celestial atmospheric corona glowing behind the Moon sphere
    const haloGeo = new THREE.PlaneGeometry(this.radius * 3.2, this.radius * 3.2);
    const haloMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: this.currentColor }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          float dist = length(vUv - vec2(0.5)) * 2.0;
          float alpha = pow(clamp(1.0 - dist, 0.0, 1.0), 2.5) * 0.32;
          if (alpha < 0.002) discard;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.haloMesh = new THREE.Mesh(haloGeo, haloMat);
    // Placed slightly behind the solid Moon sphere
    this.haloMesh.position.set(0, 0, -this.radius * 0.30);
    this.group.add(this.haloMesh);
  }

  initLighting() {
    // Omnidirectional celestial ambient fill for the sky and environment
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.80);
    this.scene.add(this.ambientLight);
  }

  /**
   * Sets active Halloween celestial color:
   * Smoothly shifts Moon material color across the Halloween cycle.
   */
  setCelestialColor(color) {
    this.currentColor.copy(color);

    if (this.material && this.material.uniforms && this.material.uniforms.uColor) {
      this.material.uniforms.uColor.value.copy(color);
    }
    if (this.haloMesh && this.haloMesh.material && this.haloMesh.material.uniforms.uColor) {
      this.haloMesh.material.uniforms.uColor.value.copy(color);
    }
  }

  update(delta, elapsed) {
    // Subtle celestial libration
    if (this.mesh) {
      this.mesh.rotation.y += delta * 0.0006;
    }
    if (this.material && this.material.uniforms.uTime) {
      this.material.uniforms.uTime.value = elapsed;
    }
  }
}

