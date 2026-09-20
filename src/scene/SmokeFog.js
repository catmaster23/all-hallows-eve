import * as THREE from 'three';

/**
 * Volumetric Painterly Smoke & Atmospheric Fog System (matching Reference 2):
 * - Deep midnight blue, Prussian blue, and slate swirling smoke plumes
 * - Warm amber-orange illuminated smoke wrapping around the Jack-o'-Lantern
 * - Dynamic rotational turbulence and rising convection currents
 */
export class SmokeFog {
  constructor(scene, pumpkinPos) {
    this.scene = scene;
    this.pumpkinPos = pumpkinPos || new THREE.Vector3(0, 1.2, -2);
    this.group = new THREE.Group();

    this.blueSmokeTex = this.createSmokeTexture('#2a3d60', '#101a2e', 0.32);
    this.amberSmokeTex = this.createSmokeTexture('#ffaa33', '#ff5500', 0.28);

    this.smokePuffs = [];
    this.createSmokePlumes();

    this.scene.add(this.group);
  }

  createSmokeTexture(innerColor, outerColor, peakAlpha) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 256, 256);

    // Multi-lobe organic smoke puff
    for (let i = 0; i < 9; i++) {
      const cx = 128 + (Math.random() - 0.5) * 60;
      const cy = 128 + (Math.random() - 0.5) * 60;
      const r = 50 + Math.random() * 55;

      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
      grad.addColorStop(0, innerColor);
      grad.addColorStop(0.5, outerColor);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.globalAlpha = peakAlpha;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  createSmokePlumes() {
    const smokeGeo = new THREE.PlaneGeometry(5.5, 5.5);

    // 1. Warm Amber Illuminated Smoke (hugging the pumpkin and road in front)
    const amberMat = new THREE.MeshBasicMaterial({
      map: this.amberSmokeTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.55
    });

    const amberCount = 14;
    for (let i = 0; i < amberCount; i++) {
      const mesh = new THREE.Mesh(smokeGeo, amberMat);
      const angle = (i / amberCount) * Math.PI * 2 + Math.random();
      const dist = 0.8 + Math.random() * 2.2;
      const x = this.pumpkinPos.x + Math.cos(angle) * dist;
      const z = this.pumpkinPos.z + 0.4 + Math.sin(angle) * (dist * 0.8);
      const y = 0.4 + Math.random() * 2.2;

      mesh.position.set(x, y, z);
      mesh.rotation.z = Math.random() * Math.PI * 2;
      const scale = 0.8 + Math.random() * 0.9;
      mesh.scale.set(scale, scale, scale);

      this.smokePuffs.push({
        mesh,
        baseX: x,
        baseZ: z,
        y,
        rotSpeed: (Math.random() - 0.5) * 0.25,
        riseSpeed: 0.18 + Math.random() * 0.25,
        scale,
        maxY: 3.8
      });

      this.group.add(mesh);
    }

    // 2. Cold Nocturnal Blue/Slate Mist (surrounding highway and roadside shoulders)
    const blueMat = new THREE.MeshBasicMaterial({
      map: this.blueSmokeTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      opacity: 0.65
    });

    const blueCount = 22;
    for (let i = 0; i < blueCount; i++) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 8.5), blueMat);
      const x = (Math.random() - 0.5) * 26;
      const z = 4 - Math.random() * 32;
      const y = 0.6 + Math.random() * 3.5;

      mesh.position.set(x, y, z);
      mesh.rotation.z = Math.random() * Math.PI * 2;
      const scale = 1.0 + Math.random() * 1.2;
      mesh.scale.set(scale, scale, scale);

      this.smokePuffs.push({
        mesh,
        baseX: x,
        baseZ: z,
        y,
        rotSpeed: (Math.random() - 0.5) * 0.18,
        riseSpeed: 0.12 + Math.random() * 0.2,
        scale,
        maxY: 5.5
      });

      this.group.add(mesh);
    }
  }

  update(delta, elapsed) {
    this.smokePuffs.forEach(p => {
      // Gentle rotational swirl
      p.mesh.rotation.z += p.rotSpeed * delta;

      // Slow rising convective thermal
      p.y += p.riseSpeed * delta;
      if (p.y > p.maxY) {
        p.y = 0.3;
      }

      // Horizontal wave drift
      const driftX = Math.sin(elapsed * 0.6 + p.y) * 0.25;
      p.mesh.position.set(p.baseX + driftX, p.y, p.baseZ);

      // Subtle breathing expansion as smoke thins
      const progress = p.y / p.maxY;
      const expansion = 1.0 + progress * 0.45;
      p.mesh.scale.setScalar(p.scale * expansion);
    });
  }
}
