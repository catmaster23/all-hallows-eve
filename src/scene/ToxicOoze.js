import * as THREE from 'three';

/**
 * Thick, boiling hot, bubbling orange toxic liquid seeping out of the pumpkin onto Route 13
 */
export class ToxicOoze {
  constructor(scene, pumpkinPos) {
    this.scene = scene;
    this.pumpkinPos = pumpkinPos || new THREE.Vector3(0, 1.2, -2);
    this.group = new THREE.Group();

    this.createPuddle();
    this.createBoilingBubbles(24);
    this.createSteamParticles(20);
    this.createOozeLight();

    this.scene.add(this.group);
  }

  createPuddle() {
    // Canvas texture for viscous boiling fluid surface
    this.puddleCanvas = document.createElement('canvas');
    this.puddleCanvas.width = 512;
    this.puddleCanvas.height = 512;
    this.pctx = this.puddleCanvas.getContext('2d');

    this.puddleTexture = new THREE.CanvasTexture(this.puddleCanvas);
    this.drawPuddleCanvas(0);

    // Irregular organic puddle geometry spreading forward from the pumpkin base
    const puddleGeo = new THREE.PlaneGeometry(5.2, 4.4, 32, 32);
    this.puddleMat = new THREE.MeshStandardMaterial({
      map: this.puddleTexture,
      transparent: true,
      roughness: 0.18, // Wet viscous sheen
      metalness: 0.1,
      emissive: new THREE.Color(0xff4400),
      emissiveIntensity: 0.85
    });

    this.puddleMesh = new THREE.Mesh(puddleGeo, this.puddleMat);
    this.puddleMesh.rotation.x = -Math.PI / 2;
    this.puddleMesh.position.set(this.pumpkinPos.x, 0.02, this.pumpkinPos.z + 0.6);
    this.puddleMesh.receiveShadow = true;
    this.group.add(this.puddleMesh);
  }

  drawPuddleCanvas(elapsed) {
    const { pctx: ctx } = this;
    const s = 512;
    const cx = s / 2;
    const cy = s / 2;

    ctx.clearRect(0, 0, s, s);

    // Outer molten toxic orange gradient with viscous pseudopods
    const grad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 240);
    grad.addColorStop(0, '#ffffaa'); // Boiling yellow-white core
    grad.addColorStop(0.25, '#ffaa00'); // Hot orange
    grad.addColorStop(0.55, '#ff4400'); // Deep burning orange
    grad.addColorStop(0.85, '#aa1500'); // Thick sludge rim
    grad.addColorStop(1, 'rgba(60, 5, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    // Organic wavy puddle edge
    const numPoints = 28;
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const wave = Math.sin(angle * 5 + elapsed * 1.5) * 18 + Math.cos(angle * 3 - elapsed) * 12;
      const r = 210 + wave;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * (r * 0.82); // slightly oblong
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Concentric hot viscous ripple rings
    ctx.strokeStyle = 'rgba(255, 230, 100, 0.45)';
    ctx.lineWidth = 3;
    for (let ring = 1; ring <= 4; ring++) {
      const ringR = ((elapsed * 25 + ring * 55) % 190) + 15;
      const alpha = Math.max(0, 1 - ringR / 190) * 0.4;
      ctx.strokeStyle = `rgba(255, 220, 80, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, ringR, ringR * 0.78, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (this.puddleTexture) this.puddleTexture.needsUpdate = true;
  }

  createBoilingBubbles(count) {
    this.bubbles = [];
    const bubbleGeo = new THREE.SphereGeometry(0.18, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.65);
    const bubbleMat = new THREE.MeshStandardMaterial({
      color: 0xff8800,
      emissive: 0xff5500,
      emissiveIntensity: 1.2,
      roughness: 0.15
    });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(bubbleGeo, bubbleMat);
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 1.8;
      const x = this.pumpkinPos.x + Math.cos(angle) * dist;
      const z = this.pumpkinPos.z + 0.6 + Math.sin(angle) * (dist * 0.75);

      mesh.position.set(x, 0.02, z);

      this.bubbles.push({
        mesh,
        baseX: x,
        baseZ: z,
        progress: Math.random(),
        speed: 0.6 + Math.random() * 0.8,
        maxScale: 0.8 + Math.random() * 0.9
      });

      this.group.add(mesh);
    }
  }

  createSteamParticles(count) {
    this.steam = [];
    const steamGeo = new THREE.PlaneGeometry(0.5, 0.5);
    
    // Steam puff texture
    const sCanvas = document.createElement('canvas');
    sCanvas.width = 64;
    sCanvas.height = 64;
    const sctx = sCanvas.getContext('2d');
    const sGrad = sctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    sGrad.addColorStop(0, 'rgba(255, 120, 40, 0.35)');
    sGrad.addColorStop(0.5, 'rgba(255, 60, 10, 0.15)');
    sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sctx.fillStyle = sGrad;
    sctx.fillRect(0, 0, 64, 64);

    const steamTex = new THREE.CanvasTexture(sCanvas);
    const steamMat = new THREE.MeshBasicMaterial({
      map: steamTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(steamGeo, steamMat);
      mesh.rotation.x = -Math.PI / 4;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 1.6;

      this.steam.push({
        mesh,
        baseX: this.pumpkinPos.x + Math.cos(angle) * dist,
        baseZ: this.pumpkinPos.z + 0.6 + Math.sin(angle) * dist,
        y: Math.random() * 1.2,
        speedY: 0.35 + Math.random() * 0.4,
        scale: 0.5 + Math.random() * 0.8
      });

      this.group.add(mesh);
    }
  }

  createOozeLight() {
    this.oozeLight = new THREE.PointLight(0xff5500, 2.5, 9, 1.8);
    this.oozeLight.position.set(this.pumpkinPos.x, 0.15, this.pumpkinPos.z + 0.6);
    this.group.add(this.oozeLight);
  }

  update(delta, elapsed) {
    // Redraw boiling fluid texture every few frames
    this.drawPuddleCanvas(elapsed);

    // Animate Boiling Bubbles (Swell, pop, and respawn)
    this.bubbles.forEach(b => {
      b.progress += delta * b.speed;
      if (b.progress >= 1.0) {
        b.progress = 0;
        // Relocate randomly across the pool
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 1.8;
        b.baseX = this.pumpkinPos.x + Math.cos(angle) * dist;
        b.baseZ = this.pumpkinPos.z + 0.6 + Math.sin(angle) * (dist * 0.75);
        b.mesh.position.set(b.baseX, 0.02, b.baseZ);
      }

      // Parabolic bubble growth and pop
      const s = Math.sin(b.progress * Math.PI) * b.maxScale;
      b.mesh.scale.set(s, s * 1.2, s);
      b.mesh.position.y = 0.02 + s * 0.08;
    });

    // Animate Steam Puffs
    this.steam.forEach(s => {
      s.y += s.speedY * delta;
      if (s.y > 1.6) {
        s.y = 0.05;
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 1.6;
        s.baseX = this.pumpkinPos.x + Math.cos(angle) * dist;
        s.baseZ = this.pumpkinPos.z + 0.6 + Math.sin(angle) * dist;
      }
      s.mesh.position.set(s.baseX + Math.sin(elapsed * 2 + s.y) * 0.08, s.y, s.baseZ);
      const life = 1.0 - (s.y / 1.6);
      s.mesh.scale.setScalar(s.scale * (1.0 + (1.0 - life) * 1.5));
    });

    // Boiling heat pulse light
    const pulse = Math.sin(elapsed * 5.0) * 0.4 + Math.cos(elapsed * 8.5) * 0.2;
    this.oozeLight.intensity = Math.max(1.2, 2.5 + pulse);
  }
}
