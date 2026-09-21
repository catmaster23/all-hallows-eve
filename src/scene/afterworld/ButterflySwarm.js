import * as THREE from 'three';

/**
 * ButterflySwarm:
 * Majestic, glowing butterflies inspired by Disney/Pixar's Coco and Up.
 * 
 * Features:
 * - Multi-layered 3D wings (distinct forewing and hindwing pairs) with aerofoil camber
 * - Procedural high-resolution bioluminescent stained-glass textures with glowing veins and edge pearls
 * - Dual-wing flapping dynamics with realistic phase-lag between forewings and hindwings
 * - Soft luminous billboard halo / corona sprites around each butterfly (matching concept art)
 * - Dynamic PointLights casting real-time light bounces onto ivory bones and meadow grass
 * - 3D flight trajectories weaving directly through the interior of the skeleton's ribcage
 * - Ethereal stardust particle trails drifting on the wind
 */
export class ButterflySwarm {
  constructor(windSystem, skeletonAnchor = new THREE.Vector3(0, 1.2, -4.5)) {
    this.windSystem = windSystem;
    this.skeletonAnchor = skeletonAnchor;
    this.group = new THREE.Group();

    this.butterflies = [];
    this.perchLocations = [];
    this.raycaster = new THREE.Raycaster();

    this.initWingTextures();
    this.initWingGeometries();
    this.initWingMaterials();
    this.initHaloTextures();
    this.initPerchLocations();
    this.createButterflies(11); // Calibrated to 11 delicate butterflies matching the line art & hand-painted concept
    this.initParticleTrails(250);
  }

  /**
   * High-resolution procedural stained-glass bioluminescent wing textures
   */
  initWingTextures() {
    this.wingTextures = [];
    for (let t = 0; t < 3; t++) {
      this.wingTextures.push(this.createStainedGlassTexture(t));
    }
  }

  createStainedGlassTexture(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base background gradient:
    // Type 0: Electric Morpho Cyan
    // Type 1: Sunset Marigold & Amber
    // Type 2: Twilight Magenta / Violet
    const grad = ctx.createRadialGradient(80, 256, 30, 256, 256, 280);
    if (type === 0) {
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.18, '#38f8ff');
      grad.addColorStop(0.55, '#00b0ff');
      grad.addColorStop(0.85, '#0d47a1');
      grad.addColorStop(1.0, '#040b20');
    } else if (type === 1) {
      grad.addColorStop(0.0, '#fff9c4');
      grad.addColorStop(0.2, '#ffea00');
      grad.addColorStop(0.5, '#ff9100');
      grad.addColorStop(0.85, '#d50000');
      grad.addColorStop(1.0, '#260404');
    } else {
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.2, '#ff80ab');
      grad.addColorStop(0.55, '#d500f9');
      grad.addColorStop(0.85, '#4a148c');
      grad.addColorStop(1.0, '#120224');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Intricate butterfly venation (dark structural veins branching to outer margins)
    ctx.strokeStyle = '#05060d';
    ctx.lineWidth = 5.0;
    ctx.lineCap = 'round';

    const mainVeins = [
      [[60, 256], [180, 100], [380, 40], [480, 70]],
      [[60, 256], [220, 160], [420, 150], [490, 180]],
      [[60, 256], [240, 230], [430, 260], [490, 280]],
      [[60, 256], [220, 320], [410, 370], [470, 410]],
      [[60, 256], [180, 400], [340, 460], [420, 490]]
    ];

    mainVeins.forEach((pts) => {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      ctx.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]);
      ctx.stroke();
    });

    // Secondary connecting cross-veins
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 22; i++) {
      const sx = 140 + Math.random() * 220;
      const sy = 80 + Math.random() * 340;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(
        sx + (Math.random() - 0.5) * 45,
        sy + (Math.random() - 0.5) * 55,
        sx + 50 + Math.random() * 50,
        sy + (Math.random() - 0.5) * 65
      );
      ctx.stroke();
    }

    // Outer margin dark border
    ctx.lineWidth = 16.0;
    ctx.strokeStyle = '#05060d';
    ctx.strokeRect(8, 8, 496, 496);

    // Bioluminescent margin pearls
    ctx.fillStyle = '#ffffff';
    for (let p = 0; p < 30; p++) {
      const px = 465 + Math.sin(p * 0.4) * 18;
      const py = 35 + p * 15;
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /**
   * Radial glowing sprite halos for that ethereal Pixar/Coco glow
   */
  initHaloTextures() {
    this.haloTextures = [
      this.createHaloTexture(0x00e5ff),
      this.createHaloTexture(0xffa000),
      this.createHaloTexture(0xff4081)
    ];
  }

  createHaloTexture(hexColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    const c = new THREE.Color(hexColor);
    grad.addColorStop(0.0, `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, 0.95)`);
    grad.addColorStop(0.35, `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, 0.45)`);
    grad.addColorStop(0.7, `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, 0.12)`);
    grad.addColorStop(1.0, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Contoured 3D Wing Geometries: Forewing and Hindwing
   * Scaled to realistic real-world delicate butterfly wingspan (~20cm / 8 inches)
   */
  initWingGeometries() {
    // 1. Forewing (elongated, curved arched leading edge)
    const foreShape = new THREE.Shape();
    foreShape.moveTo(0, 0);
    foreShape.bezierCurveTo(0.2, 0.45, 0.65, 0.75, 1.05, 0.52); // Arched leading edge
    foreShape.bezierCurveTo(1.15, 0.35, 0.95, -0.05, 0.65, -0.22); // Outer margin
    foreShape.bezierCurveTo(0.4, -0.32, 0.15, -0.15, 0, 0);       // Inner margin
    this.forewingGeo = new THREE.ShapeGeometry(foreShape, 12);
    this.forewingGeo.scale(0.18, 0.18, 0.18); // Realistic delicate scale

    // Add subtle 3D camber curve
    const posF = this.forewingGeo.attributes.position;
    for (let i = 0; i < posF.count; i++) {
      const u = posF.getX(i);
      posF.setZ(i, Math.sin(u * 8.0) * 0.01);
    }
    this.forewingGeo.computeVertexNormals();

    // 2. Hindwing (rounded, scalloped rear wing)
    const hindShape = new THREE.Shape();
    hindShape.moveTo(0, -0.05);
    hindShape.bezierCurveTo(0.25, -0.12, 0.65, -0.35, 0.55, -0.65);
    hindShape.bezierCurveTo(0.45, -0.85, 0.18, -0.75, 0.05, -0.55);
    hindShape.bezierCurveTo(-0.02, -0.35, -0.02, -0.15, 0, -0.05);
    this.hindwingGeo = new THREE.ShapeGeometry(hindShape, 10);
    this.hindwingGeo.scale(0.15, 0.15, 0.15); // Realistic delicate scale

    const posH = this.hindwingGeo.attributes.position;
    for (let i = 0; i < posH.count; i++) {
      const u = posH.getX(i);
      posH.setZ(i, Math.sin(u * 8.0) * 0.008);
    }
    this.hindwingGeo.computeVertexNormals();
  }

  initWingMaterials() {
    this.wingMaterials = [];
    const glowColors = [0x00e5ff, 0xff9100, 0xff4081];

    for (let i = 0; i < 3; i++) {
      const tex = this.wingTextures[i];
      const mat = new THREE.MeshPhysicalMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: new THREE.Color(glowColors[i]),
        emissiveIntensity: 1.3,
        roughness: 0.25,
        transmission: 0.35,
        thickness: 0.15,
        clearcoat: 0.55,
        clearcoatRoughness: 0.2,
        iridescence: 0.75,
        side: THREE.DoubleSide
      });
      this.wingMaterials.push(mat);
    }

    this.bodyMat = new THREE.MeshStandardMaterial({
      color: 0x16120e,
      roughness: 0.6,
      metalness: 0.1
    });
  }

  initPerchLocations() {
    // Exact perching coordinates calibrated to the 3D GLB skeleton
    this.perchLocations = [
      // Skull cranium & brow
      { pos: new THREE.Vector3(0.1, 5.25, -4.6), normal: new THREE.Vector3(0, 1, 0) },
      { pos: new THREE.Vector3(-0.35, 4.9, -4.4), normal: new THREE.Vector3(-0.4, 0.8, 0.2) },
      // Collarbones / Clavicles
      { pos: new THREE.Vector3(0.75, 3.75, -4.2), normal: new THREE.Vector3(0.2, 0.9, 0.3) },
      { pos: new THREE.Vector3(-0.75, 3.75, -4.2), normal: new THREE.Vector3(-0.2, 0.9, 0.3) },
      // Unburied Left Hand resting peacefully on grass
      { pos: new THREE.Vector3(-2.2, 0.38, -4.1), normal: new THREE.Vector3(0, 1, 0.15) },
      // Unburied Right Hand resting peacefully on grass
      { pos: new THREE.Vector3(2.2, 0.35, -4.1), normal: new THREE.Vector3(0, 1, 0.15) },
      // Ribcage rims & inside thoracic cavity
      { pos: new THREE.Vector3(0.85, 2.4, -4.2), normal: new THREE.Vector3(0.7, 0.6, 0.2) },
      { pos: new THREE.Vector3(-0.85, 2.4, -4.2), normal: new THREE.Vector3(-0.7, 0.6, 0.2) },
      // Surrounding flower blooms
      { pos: new THREE.Vector3(-1.6, 0.65, -1.8), normal: new THREE.Vector3(0, 1, 0) },
      { pos: new THREE.Vector3(1.8, 0.70, -1.2), normal: new THREE.Vector3(0, 1, 0) },
      { pos: new THREE.Vector3(0.4, 0.60, 0.8), normal: new THREE.Vector3(0, 1, 0) }
    ];
  }

  createButterflyMesh(matIndex) {
    const root = new THREE.Group();

    // 1. Sleek, delicate insect thorax & abdomen
    const bodyGeo = new THREE.CylinderGeometry(0.005, 0.008, 0.09, 6);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMesh = new THREE.Mesh(bodyGeo, this.bodyMat);
    root.add(bodyMesh);

    // Delicate antennae
    const antGeo = new THREE.BufferGeometry();
    const antPos = new Float32Array([
      0, 0.006, 0.045,  -0.025, 0.03, 0.085,
      0, 0.006, 0.045,   0.025, 0.03, 0.085
    ]);
    antGeo.setAttribute('position', new THREE.BufferAttribute(antPos, 3));
    const antLine = new THREE.LineSegments(antGeo, new THREE.LineBasicMaterial({ color: 0x111111 }));
    root.add(antLine);

    const mat = this.wingMaterials[matIndex % this.wingMaterials.length];

    // 2. Dual-Wing Assembly: Forewings & Hindwings
    // Left Wing Pivot (root axis)
    const leftWingRoot = new THREE.Group();
    leftWingRoot.position.set(-0.008, 0.006, 0);

    const leftForewing = new THREE.Mesh(this.forewingGeo, mat);
    leftForewing.rotation.y = Math.PI;
    leftWingRoot.add(leftForewing);

    const leftHindwingPivot = new THREE.Group();
    const leftHindwing = new THREE.Mesh(this.hindwingGeo, mat);
    leftHindwing.rotation.y = Math.PI;
    leftHindwingPivot.add(leftHindwing);
    leftWingRoot.add(leftHindwingPivot);
    root.add(leftWingRoot);

    // Right Wing Pivot (root axis)
    const rightWingRoot = new THREE.Group();
    rightWingRoot.position.set(0.008, 0.006, 0);

    const rightForewing = new THREE.Mesh(this.forewingGeo, mat);
    rightWingRoot.add(rightForewing);

    const rightHindwingPivot = new THREE.Group();
    const rightHindwing = new THREE.Mesh(this.hindwingGeo, mat);
    rightHindwingPivot.add(rightHindwing);
    rightWingRoot.add(rightHindwingPivot);
    root.add(rightWingRoot);

    // 3. Ethereal glowing halo sprite (scaled to subtle delicate glow)
    const haloMat = new THREE.SpriteMaterial({
      map: this.haloTextures[matIndex % this.haloTextures.length],
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const haloSprite = new THREE.Sprite(haloMat);
    haloSprite.scale.set(0.42, 0.42, 0.42);
    haloSprite.position.set(0, 0.02, 0);
    root.add(haloSprite);

    return {
      root,
      leftWingRoot,
      leftHindwingPivot,
      rightWingRoot,
      rightHindwingPivot,
      haloSprite,
      color: mat.emissive
    };
  }

  createButterflies(count) {
    const lightColors = [0x00e5ff, 0xff9100, 0xff4081];

    for (let i = 0; i < count; i++) {
      const matIndex = i % 3;
      const {
        root,
        leftWingRoot,
        leftHindwingPivot,
        rightWingRoot,
        rightHindwingPivot,
        haloSprite,
        color
      } = this.createButterflyMesh(matIndex);

      // Distribute across reasonable flight area
      const x = (Math.random() - 0.5) * 16;
      const y = 1.2 + Math.random() * 4.0;
      const z = -10.0 + Math.random() * 12.0;

      root.position.set(x, y, z);
      const scale = 0.95 + Math.random() * 0.25;
      root.scale.setScalar(scale);
      this.group.add(root);

      // Real-time physical PointLights on 3 prominent butterflies only (delicate subtle glow)
      let pointLight = null;
      if (i < 3) {
        pointLight = new THREE.PointLight(lightColors[matIndex], 0.55, 2.8, 1.8);
        pointLight.position.set(0, 0.05, 0);
        root.add(pointLight);
      }

      // Initial state: ~40% perched, ~60% flying
      const isPerched = i < this.perchLocations.length && Math.random() < 0.45;
      const targetPerch = isPerched ? this.perchLocations[i % this.perchLocations.length] : null;

      if (isPerched && targetPerch) {
        root.position.copy(targetPerch.pos);
        root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), targetPerch.normal);
      }

      // Designate 35% as ribcage weavers (weaving directly inside and through the skeleton's ribs)
      const isRibcageWeaver = i % 3 === 0;

      this.butterflies.push({
        root,
        leftWingRoot,
        leftHindwingPivot,
        rightWingRoot,
        rightHindwingPivot,
        haloSprite,
        pointLight,
        color,
        state: isPerched ? 'PERCHED' : 'FLYING',
        perchTimer: 3.0 + Math.random() * 6.0,
        perchSpot: targetPerch,
        position: root.position.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 2.0,
          (Math.random() - 0.5) * 1.2,
          (Math.random() - 0.5) * 2.0
        ),
        targetPos: new THREE.Vector3(x, y, z),
        wingPhase: Math.random() * Math.PI * 2,
        wingSpeed: 15.0 + Math.random() * 7.0,
        trailTimer: 0,
        isRibcageWeaver,
        ribcagePhase: Math.random() * Math.PI * 2
      });
    }
  }

  /**
   * Luminous Particle Trails
   */
  initParticleTrails(maxParticles = 500) {
    this.maxParticles = maxParticles;
    this.trailGeo = new THREE.BufferGeometry();
    this.trailPositions = new Float32Array(maxParticles * 3);
    this.trailColors = new Float32Array(maxParticles * 3);
    this.trailAlphas = new Float32Array(maxParticles);
    this.trailLifetimes = new Float32Array(maxParticles);
    this.trailMaxLifetimes = new Float32Array(maxParticles);

    for (let i = 0; i < maxParticles; i++) {
      this.trailAlphas[i] = 0.0;
      this.trailLifetimes[i] = 0.0;
    }

    this.trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    this.trailGeo.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));
    this.trailGeo.setAttribute('alpha', new THREE.BufferAttribute(this.trailAlphas, 1));

    this.trailMat = new THREE.ShaderMaterial({
      uniforms: {
        uSize: { value: 3.2 }
      },
      vertexShader: `
        attribute float alpha;
        attribute vec3 color;
        varying float vAlpha;
        varying vec3 vColor;
        uniform float uSize;

        void main() {
          vAlpha = alpha;
          vColor = color;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uSize * (22.0 / -mvPos.z) * vAlpha;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vColor;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float glow = smoothstep(0.5, 0.0, dist);
          gl_FragColor = vec4(vColor, vAlpha * glow * 0.85);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.trailPoints = new THREE.Points(this.trailGeo, this.trailMat);
    this.group.add(this.trailPoints);
    this.trailHead = 0;
  }

  emitTrailParticle(pos, color) {
    const idx = this.trailHead;
    this.trailPositions[idx * 3] = pos.x + (Math.random() - 0.5) * 0.12;
    this.trailPositions[idx * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.12;
    this.trailPositions[idx * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.12;

    this.trailColors[idx * 3] = color.r;
    this.trailColors[idx * 3 + 1] = color.g;
    this.trailColors[idx * 3 + 2] = color.b;

    this.trailAlphas[idx] = 0.9;
    const life = 2.5 + Math.random() * 1.5;
    this.trailLifetimes[idx] = life;
    this.trailMaxLifetimes[idx] = life;

    this.trailHead = (this.trailHead + 1) % this.maxParticles;
  }

  checkCursorStartle(mouseNDC, camera) {
    if (!camera) return;
    this.raycaster.setFromCamera(mouseNDC, camera);

    const tempV = new THREE.Vector3();
    for (const b of this.butterflies) {
      tempV.copy(b.root.position);
      tempV.project(camera);

      const dx = tempV.x - mouseNDC.x;
      const dy = tempV.y - mouseNDC.y;
      const screenDistSq = dx * dx + dy * dy;

      if (screenDistSq < 0.06) {
        this.startleButterfly(b);
      }
    }
  }

  startleButterfly(b) {
    if (b.state === 'PERCHED' || (b.state === 'FLYING' && Math.random() < 0.45)) {
      b.state = 'FLYING';
      b.perchTimer = 4.5 + Math.random() * 5.0;
      b.velocity.y = 2.8 + Math.random() * 2.2;
      b.velocity.x += (Math.random() - 0.5) * 4.5;
      b.velocity.z += (Math.random() - 0.5) * 4.5;
      b.wingSpeed = 28.0;

      if (window.audioController?.soundEngine) {
        window.audioController.soundEngine.playButterflyFlap(0.4);
      }
    }
  }

  triggerBurst() {
    for (const b of this.butterflies) {
      this.startleButterfly(b);
      const blastDir = new THREE.Vector3().subVectors(b.root.position, this.skeletonAnchor).normalize();
      b.velocity.addScaledVector(blastDir, 4.2);
    }
  }

  update(delta, elapsed, camera, mouseNDC) {
    if (mouseNDC && camera) {
      this.checkCursorStartle(mouseNDC, camera);
    }

    const windVec = new THREE.Vector3();

    for (let i = 0; i < this.butterflies.length; i++) {
      const b = this.butterflies[i];

      // Soft halo breathing pulse (subtle, delicate ethereal glow)
      if (b.haloSprite) {
        const pulse = 0.40 + Math.sin(elapsed * 4.0 + b.wingPhase) * 0.06;
        b.haloSprite.scale.set(pulse, pulse, pulse);
      }

      if (b.state === 'PERCHED') {
        // Slow peaceful wing breathing while resting on bones/flowers
        const breathAngle = Math.sin(elapsed * 2.2 + b.wingPhase) * 0.35 + 0.42;
        b.leftWingRoot.rotation.y = breathAngle;
        b.leftHindwingPivot.rotation.y = -0.1;
        b.rightWingRoot.rotation.y = -breathAngle;
        b.rightHindwingPivot.rotation.y = 0.1;

        b.perchTimer -= delta;
        if (b.perchTimer <= 0) {
          b.state = 'FLYING';
          b.perchTimer = 5.0 + Math.random() * 8.0;
          b.velocity.set((Math.random() - 0.5) * 2.0, 1.5, (Math.random() - 0.5) * 2.0);
        }
      } else {
        // State: FLYING
        b.wingPhase += delta * b.wingSpeed;
        const flapAngle = Math.sin(b.wingPhase) * 0.85;

        // Forewings flap
        b.leftWingRoot.rotation.y = Math.PI * 0.15 + flapAngle;
        b.rightWingRoot.rotation.y = -Math.PI * 0.15 - flapAngle;

        // Hindwings flap with subtle phase lag for organic Disney flutter
        const hindFlap = Math.sin(b.wingPhase - 0.28) * 0.72;
        b.leftHindwingPivot.rotation.y = (hindFlap - flapAngle) * 0.5;
        b.rightHindwingPivot.rotation.y = -(hindFlap - flapAngle) * 0.5;

        if (b.wingSpeed > 16.0) {
          b.wingSpeed -= delta * 5.5;
        }

        // Emit luminous stardust trail
        b.trailTimer += delta;
        if (b.trailTimer > 0.05) {
          this.emitTrailParticle(b.root.position, b.color);
          b.trailTimer = 0;
        }

        // Steer butterfly
        if (b.isRibcageWeaver) {
          // Continuous 3D figure-8 path passing directly inside and through the ribcage
          b.ribcagePhase += delta * 0.75;
          const rP = b.ribcagePhase;
          // Ribcage center: (0, 1.8, -4.5)
          const targetX = Math.sin(rP) * 1.8;
          const targetY = 1.8 + Math.cos(rP * 2.0) * 0.8;
          const targetZ = -4.5 + Math.sin(rP * 2.0) * 1.6; // Weaves from in-front (-2.9) to behind (-6.1)
          b.targetPos.set(targetX, targetY, targetZ);
        } else {
          if (b.root.position.distanceTo(b.targetPos) < 2.5 || Math.random() < 0.01) {
            b.targetPos.set(
              (Math.random() - 0.5) * 22.0,
              0.8 + Math.random() * 4.8,
              -15.0 + Math.random() * 18.0
            );
          }
        }

        const steer = new THREE.Vector3().subVectors(b.targetPos, b.root.position).normalize().multiplyScalar(2.4);
        b.velocity.lerp(steer, delta * 2.4);

        // Wind drift influence
        this.windSystem.getWindAt(b.root.position.x, b.root.position.z, elapsed, windVec);
        b.velocity.x += windVec.x * delta * 1.8;
        b.velocity.z += windVec.z * delta * 1.8;
        b.velocity.y += windVec.y * delta * 0.8;

        b.root.position.addScaledVector(b.velocity, delta);

        // Aerodynamic orientation
        if (b.velocity.lengthSq() > 0.01) {
          const lookDir = b.velocity.clone().normalize();
          const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), lookDir);
          b.root.quaternion.slerp(targetQuat, delta * 5.5);
        }

        // Perch decision
        b.perchTimer -= delta;
        if (b.perchTimer <= 0 && Math.random() < 0.025) {
          const candidate = this.perchLocations[Math.floor(Math.random() * this.perchLocations.length)];
          b.root.position.copy(candidate.pos);
          b.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), candidate.normal);
          b.state = 'PERCHED';
          b.perchTimer = 4.0 + Math.random() * 7.0;
        }
      }
    }

    // 3. Update Luminous Particle Trails
    for (let p = 0; p < this.maxParticles; p++) {
      if (this.trailLifetimes[p] > 0) {
        this.trailLifetimes[p] -= delta;
        const progress = Math.max(0, this.trailLifetimes[p] / this.trailMaxLifetimes[p]);
        this.trailAlphas[p] = Math.pow(progress, 1.3) * 0.9;

        const px = this.trailPositions[p * 3];
        const pz = this.trailPositions[p * 3 + 2];
        this.windSystem.getWindAt(px, pz, elapsed, windVec);

        this.trailPositions[p * 3] += (windVec.x * 0.6 + 0.1) * delta;
        this.trailPositions[p * 3 + 1] += (0.16 + (Math.random() - 0.5) * 0.1) * delta;
        this.trailPositions[p * 3 + 2] += (windVec.z * 0.6) * delta;
      } else {
        this.trailAlphas[p] = 0.0;
      }
    }

    this.trailGeo.attributes.position.needsUpdate = true;
    this.trailGeo.attributes.alpha.needsUpdate = true;
  }
}
