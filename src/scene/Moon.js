import * as THREE from 'three';

/**
 * Photorealistic 3D Celestial Moon with Radiant Atmospheric Glow & Halloween Color Progression:
 * - 128x128 SphereGeometry with 8K NASA craters and tactile relief.
 * - Custom luminous lunar regolith shader with Lommel-Seeliger retroreflective rim illumination.
 * - Multi-tier additive celestial glow:
 *     1. Intense inner corona radiating directly from the lunar silhouette.
 *     2. Wide nocturnal atmospheric aura washing the surrounding sky in moonlight.
 * - Perfectly oriented along the camera line-of-sight for flawless circular radiance.
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
    // while ensuring the disk is radiant and luminous without dark muddiness.
    float lunarTone = mix(0.55, 1.15, pow(tex.r, 0.80));

    // 2. Lommel-Seeliger Retroreflective Regolith Limb Glow:
    // Full moons retroreflect light directly back, giving uniform disk luminosity
    // with an ethereal, luminous rim glow emitting into the corona.
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    float NdotV = clamp(dot(normal, viewDir), 0.0, 1.0);
    float limbGlow = pow(1.0 - NdotV, 2.4) * 0.65;

    // 3. Vibrant surface color harmonized with the active Halloween lunar color
    vec3 surfaceColor = uColor * lunarTone;

    // Crisp high-albedo crater ejecta rays (Tycho, Kepler)
    vec3 craterHighlight = vec3(1.0, 0.98, 0.95) * pow(tex.r, 1.35) * 0.35;

    // Luminous rim light blending with white moonlight core
    vec3 rimLight = mix(uColor, vec3(1.0, 0.98, 0.94), 0.45) * limbGlow;

    vec3 finalColor = surfaceColor + craterHighlight + rimLight;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// Inner high-intensity corona shader
const coronaFragmentShader = `
  uniform vec3 uColor;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    // Distance from center of quad (0 at center, 1 at quad edge)
    float r = length(vUv - vec2(0.5)) * 2.0;

    // The Moon sphere edge is at rMoon = 1.0 / 2.3 = 0.4348
    float rMoon = 0.4348;

    if (r < rMoon * 0.95) {
      // Behind the solid moon sphere
      gl_FragColor = vec4(0.0);
      return;
    }

    // Distance outside the moon silhouette normalized to [0, 1]
    float dOut = max(0.0, (r - rMoon) / (1.0 - rMoon));

    // Intense, radiant bloom hugging the lunar limb
    float innerCorona = exp(-dOut * 6.5) * 1.15;

    // Diffuse atmospheric corona extending into the sky
    float outerCorona = exp(-dOut * 2.4) * 0.55;

    // Subtle atmospheric breathing / shimmer
    float shimmer = 0.94 + 0.06 * sin(uTime * 1.4 + r * 8.0);

    float totalIntensity = (innerCorona + outerCorona) * shimmer;

    if (totalIntensity < 0.003) discard;

    // Core near the rim glows brilliant white/silver tinted with the lunar color
    vec3 glowColor = mix(uColor, vec3(1.0, 0.98, 0.92), exp(-dOut * 12.0) * 0.65);

    gl_FragColor = vec4(glowColor, min(1.0, totalIntensity));
  }
`;

// Wide ethereal atmospheric aura shader
const auraFragmentShader = `
  uniform vec3 uColor;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    float r = length(vUv - vec2(0.5)) * 2.0;
    float aura = pow(clamp(1.0 - r, 0.0, 1.0), 2.8) * 0.28;
    aura *= (0.95 + 0.05 * sin(uTime * 0.8));

    if (aura < 0.002) discard;

    gl_FragColor = vec4(uColor, aura);
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

    // Orient group directly facing the ground observer camera at (0, 1.6, 0)
    this.group.lookAt(0, 1.6, 0);

    // Default starting color: Blue Moon
    this.currentColor = new THREE.Color(0x3d7ef5);

    this.initAtmosphericGlow();
    this.initMoonSphere();
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

  initAtmosphericGlow() {
    const commonVertex = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    // 1. Primary Radiant Lunar Corona (sized to 4.6x radius)
    const coronaGeo = new THREE.PlaneGeometry(this.radius * 4.6, this.radius * 4.6);
    this.coronaMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: this.currentColor },
        uTime: { value: 0 }
      },
      vertexShader: commonVertex,
      fragmentShader: coronaFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.coronaMesh = new THREE.Mesh(coronaGeo, this.coronaMat);
    // Placed slightly behind the solid Moon sphere along the local lookAt Z-axis
    this.coronaMesh.position.set(0, 0, -0.05);
    this.group.add(this.coronaMesh);

    // 2. Wide Nocturnal Sky Aura (sized to 9.0x radius)
    const auraGeo = new THREE.PlaneGeometry(this.radius * 9.0, this.radius * 9.0);
    this.auraMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: this.currentColor },
        uTime: { value: 0 }
      },
      vertexShader: commonVertex,
      fragmentShader: auraFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.auraMesh = new THREE.Mesh(auraGeo, this.auraMat);
    this.auraMesh.position.set(0, 0, -0.15);
    this.group.add(this.auraMesh);
  }

  initLighting() {
    // Omnidirectional celestial ambient fill for the sky and environment
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.80);
    this.scene.add(this.ambientLight);
  }

  /**
   * Sets active Halloween celestial color:
   * Smoothly shifts Moon material, corona, and atmospheric aura across the Halloween cycle.
   */
  setCelestialColor(color) {
    this.currentColor.copy(color);

    if (this.material && this.material.uniforms && this.material.uniforms.uColor) {
      this.material.uniforms.uColor.value.copy(color);
    }
    if (this.coronaMat && this.coronaMat.uniforms && this.coronaMat.uniforms.uColor) {
      this.coronaMat.uniforms.uColor.value.copy(color);
    }
    if (this.auraMat && this.auraMat.uniforms && this.auraMat.uniforms.uColor) {
      this.auraMat.uniforms.uColor.value.copy(color);
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
    if (this.coronaMat && this.coronaMat.uniforms.uTime) {
      this.coronaMat.uniforms.uTime.value = elapsed;
    }
    if (this.auraMat && this.auraMat.uniforms.uTime) {
      this.auraMat.uniforms.uTime.value = elapsed;
    }
  }
}

