import * as THREE from 'three';

/**
 * Photorealistic 3D Celestial Moon:
 * - High-density 128x128 SphereGeometry
 * - Dual-resolution loading: instant 2K boot with async upgrade to 8K NASA texture
 * - Crisp crater relief and high-contrast tactile shadows across Mare Tranquillitatis and Tycho
 * - Near-side orientation displaying iconic lunar features directly to observer
 * - Natural celestial lighting calibrated so surface textures, craters, and maria are sharply visible
 */
export class Moon {
  constructor(scene) {
    this.scene = scene;
    this.radius = 2.85;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Positioned in the celestial sky as viewed from the ground observer
    this.position = new THREE.Vector3(0, 12, -35);
    this.group.position.copy(this.position);

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
      if (this.material) this.material.needsUpdate = true;
    });

    // 2. High-density Sphere (128x128) for smooth spherical profile
    const geometry = new THREE.SphereGeometry(this.radius, 128, 128);

    // 3. Crisp Astronomical Lunar Material:
    // Calibrated so crater ridges and dark basaltic maria are sharply defined
    this.material = new THREE.MeshStandardMaterial({
      map: this.texture,
      bumpMap: this.texture,
      bumpScale: 0.22,
      roughness: 0.82,
      metalness: 0.0,
      color: new THREE.Color(0xf2f2f2),
      emissive: new THREE.Color(0x181a20),
      emissiveIntensity: 0.08
    });

    this.mesh = new THREE.Mesh(geometry, this.material);

    // Orient Near Side (Mare Tranquillitatis, Tycho, Copernicus) directly at observer
    this.mesh.rotation.y = -Math.PI * 0.5;
    this.mesh.rotation.x = 0.06;

    this.group.add(this.mesh);

    // 4. Asynchronously background load the 15MB 8K NASA texture from Project Solaris
    textureLoader.load(
      '/textures/8k_moon.jpg',
      (tex8k) => {
        tex8k.colorSpace = THREE.SRGBColorSpace;
        tex8k.anisotropy = 16;
        tex8k.wrapS = THREE.ClampToEdgeWrapping;
        tex8k.wrapT = THREE.ClampToEdgeWrapping;
        tex8k.generateMipmaps = true;
        tex8k.minFilter = THREE.LinearMipmapLinearFilter;
        
        if (this.material) {
          this.material.map = tex8k;
          this.material.bumpMap = tex8k;
          this.material.bumpScale = 0.24;
          this.material.needsUpdate = true;
        }
        console.log('[Moon] Upgraded to 8K Ultra-High-Definition Lunar Texture.');
      },
      undefined,
      (err) => {
        console.warn('[Moon] 8K texture fallback to 2K:', err);
      }
    );
  }

  initLighting() {
    // Front-facing directional sunlight with slight offset to cast crisp crater shadows
    this.sunLight = new THREE.DirectionalLight(0xfff7e8, 2.3);
    this.sunLight.position.set(5, 7, 24);
    this.sunLight.target = new THREE.Object3D();
    this.sunLight.target.position.copy(this.position);
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Soft celestial ambient fill preserving shadow depth
    this.fillLight = new THREE.DirectionalLight(0x283042, 0.45);
    this.fillLight.position.set(-14, -2, -10);
    this.fillLight.target = new THREE.Object3D();
    this.fillLight.target.position.copy(this.position);
    this.scene.add(this.fillLight);
    this.scene.add(this.fillLight.target);
  }

  update(delta, elapsed) {
    // Extremely subtle celestial libration
    if (this.mesh) {
      this.mesh.rotation.y += delta * 0.0006;
    }
  }
}



