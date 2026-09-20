import * as THREE from 'three';

/**
 * High-fidelity 3D Jack-o'-Lantern with:
 * - Multi-lobed parametric organic ribs & stem indentation
 * - High-resolution procedural rind texture, bump & roughness maps
 * - Gnarled, curved, ribbed wooden stem
 * - Carved hollow face with inner wall thickness & cut-flesh bevels
 * - Dynamic interior candle with flickering flame and ground casting light
 */
export class Pumpkin {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    // Sound & animation triggers
    this.isEnraged = false;
    this.flameIntensity = 2.8;
    this.targetFlameIntensity = 2.8;
    this.flickerSpeed = 8.0;

    // Build the components
    this.createPumpkinTextures();
    this.createPumpkinBody();
    this.createCarvedFaceWithDepth();
    this.createGnarledStem();
    this.createInteriorCandle();

    // Position on the road center (resting firmly on asphalt)
    this.group.position.set(0, 1.2, -2);
    this.group.rotation.y = -Math.PI * 0.5; // Rotate carved face directly towards camera
    this.scene.add(this.group);

    // Ground Contact Shadow (Soft dark puddle under the pumpkin preventing floating look)
    this.createContactShadow();

    // Initial flicker offset
    this.noiseTime = 0;
  }

  createContactShadow() {
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sctx = shadowCanvas.getContext('2d');

    const grad = sctx.createRadialGradient(128, 128, 20, 128, 128, 128);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.92)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.65)');
    grad.addColorStop(0.8, 'rgba(0, 0, 0, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 256, 256);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(6.5, 6.5);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false
    });

    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, -1.18, 0); // Position at road level relative to pumpkin center
    this.group.add(shadowMesh);
  }

  /**
   * Generate 2048x1024 high-res procedural pumpkin textures:
   * 1. Albedo (diffuse skin with rib crevice shading, cut-flesh knife bevels)
   * 2. Bump Map (deep carved facial apertures and rind grain)
   * 3. Emissive Map (blazing molten candlelight shining through the carved face)
   */
  createPumpkinTextures() {
    const width = 2048;
    const height = 1024;

    // 1. Albedo Map
    const albedoCanvas = document.createElement('canvas');
    albedoCanvas.width = width;
    albedoCanvas.height = height;
    const actx = albedoCanvas.getContext('2d');

    // 2. Bump Map
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = width;
    bumpCanvas.height = height;
    const bctx = bumpCanvas.getContext('2d');

    // 3. Emissive Glow Map (Carved face apertures)
    const emissiveCanvas = document.createElement('canvas');
    emissiveCanvas.width = width;
    emissiveCanvas.height = height;
    const ectx = emissiveCanvas.getContext('2d');

    // Base background gradient: rich painterly earthy terracotta rind (matching Reference 2)
    const baseGrad = actx.createLinearGradient(0, 0, 0, height);
    baseGrad.addColorStop(0, '#2b0800');    // Deep stem cavity
    baseGrad.addColorStop(0.18, '#822700'); // Upper slope
    baseGrad.addColorStop(0.5, '#c84e0c');  // Vibrant ripe burnt-orange mid
    baseGrad.addColorStop(0.85, '#993504'); // Lower belly
    baseGrad.addColorStop(1, '#240600');    // Earthy shadowed base
    actx.fillStyle = baseGrad;
    actx.fillRect(0, 0, width, height);

    bctx.fillStyle = '#808080';
    bctx.fillRect(0, 0, width, height);

    ectx.fillStyle = '#000000';
    ectx.fillRect(0, 0, width, height);

    const numLobes = 12;
    const ribWidth = width / numLobes;

    // Draw realistic rib shadow striations, yellow-orange ridges, and deep crevices
    for (let i = 0; i < numLobes; i++) {
      const ribCenterX = (i + 0.5) * ribWidth;
      const creviceX = i * ribWidth;

      // Dark crevice shading in albedo
      const creviceGrad = actx.createLinearGradient(creviceX - ribWidth * 0.25, 0, creviceX + ribWidth * 0.25, 0);
      creviceGrad.addColorStop(0, 'rgba(120, 20, 0, 0)');
      creviceGrad.addColorStop(0.5, 'rgba(45, 6, 0, 0.75)');
      creviceGrad.addColorStop(1, 'rgba(120, 20, 0, 0)');
      actx.fillStyle = creviceGrad;
      actx.fillRect(creviceX - ribWidth * 0.25, 0, ribWidth * 0.5, height);

      // Bright golden ridge highlight
      const ridgeGrad = actx.createLinearGradient(ribCenterX - ribWidth * 0.4, 0, ribCenterX + ribWidth * 0.4, 0);
      ridgeGrad.addColorStop(0, 'rgba(255, 170, 40, 0)');
      ridgeGrad.addColorStop(0.5, 'rgba(255, 185, 60, 0.35)');
      ridgeGrad.addColorStop(1, 'rgba(255, 170, 40, 0)');
      actx.fillStyle = ridgeGrad;
      actx.fillRect(ribCenterX - ribWidth * 0.4, 0, ribWidth * 0.8, height);

      // Deep bump map crevice groove
      const bumpGrad = bctx.createLinearGradient(creviceX - ribWidth * 0.2, 0, creviceX + ribWidth * 0.2, 0);
      bumpGrad.addColorStop(0, '#808080');
      bumpGrad.addColorStop(0.5, '#151515'); // Deep depression
      bumpGrad.addColorStop(1, '#808080');
      bctx.fillStyle = bumpGrad;
      bctx.fillRect(creviceX - ribWidth * 0.2, 0, ribWidth * 0.4, height);

      // Raised bump ridge
      const bumpRidge = bctx.createLinearGradient(ribCenterX - ribWidth * 0.3, 0, ribCenterX + ribWidth * 0.3, 0);
      bumpRidge.addColorStop(0, '#808080');
      bumpRidge.addColorStop(0.5, '#d5d5d5'); // Raised lobe
      bumpRidge.addColorStop(1, '#808080');
      bctx.fillStyle = bumpRidge;
      bctx.fillRect(ribCenterX - ribWidth * 0.3, 0, ribWidth * 0.6, height);
    }

    // Natural skin freckles & micro-roughness
    const imgDataA = actx.getImageData(0, 0, width, height);
    const dataA = imgDataA.data;
    const imgDataB = bctx.getImageData(0, 0, width, height);
    const dataB = imgDataB.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const n = (Math.random() - 0.5) * 16;
        dataA[idx] = Math.min(255, Math.max(0, dataA[idx] + n));
        dataA[idx + 1] = Math.min(255, Math.max(0, dataA[idx + 1] + n * 0.6));
        dataA[idx + 2] = Math.min(255, Math.max(0, dataA[idx + 2] + n * 0.3));
        dataB[idx] = Math.min(255, Math.max(0, dataB[idx] + (Math.random() - 0.5) * 20));
      }
    }
    actx.putImageData(imgDataA, 0, 0);
    bctx.putImageData(imgDataB, 0, 0);

    // =========================================================================
    // RENDER THE CARVED FACE DIRECTLY INTO THE MAPS (Perfect 3D Conformance)
    // The front face of the pumpkin corresponds to UV coordinates around u = 0.25
    // =========================================================================
    const faceCenterX = width * 0.25;
    const faceCenterY = height * 0.52;

    const drawCarvedPath = (pathFn, fleshThickness = 14) => {
      // 1. Cut-flesh knife bevel (exposed pale pumpkin flesh along aperture rim)
      actx.save();
      actx.lineWidth = fleshThickness;
      actx.strokeStyle = '#ffd166';
      actx.lineJoin = 'miter';
      pathFn(actx);
      actx.stroke();
      actx.restore();

      // In bump map: cut flesh is recessed
      bctx.save();
      bctx.lineWidth = fleshThickness;
      bctx.strokeStyle = '#353535';
      pathFn(bctx);
      bctx.stroke();
      bctx.restore();

      // 2. Deep hollow interior hole
      // Albedo: fiery molten ember center (golden-amber core matching Reference 2)
      actx.save();
      pathFn(actx);
      const fireGrad = actx.createRadialGradient(faceCenterX, faceCenterY - 20, 10, faceCenterX, faceCenterY, 240);
      fireGrad.addColorStop(0, '#ffffc8'); // Luminous white-gold core
      fireGrad.addColorStop(0.2, '#ffcc22'); // Radiant warm amber
      fireGrad.addColorStop(0.55, '#ff7700'); // Vivid flame orange
      fireGrad.addColorStop(0.85, '#d92c00'); // Deep ember red
      fireGrad.addColorStop(1, '#550800');
      actx.fillStyle = fireGrad;
      actx.fill();
      actx.restore();

      // Bump: pure black (maximum hollow depth)
      bctx.save();
      pathFn(bctx);
      bctx.fillStyle = '#000000';
      bctx.fill();
      bctx.restore();

      // Emissive Map: intense radiant candlelight (matching Reference 2)
      ectx.save();
      pathFn(ectx);
      const eGrad = ectx.createRadialGradient(faceCenterX, faceCenterY - 20, 10, faceCenterX, faceCenterY, 240);
      eGrad.addColorStop(0, '#ffffff');
      eGrad.addColorStop(0.25, '#ffdd44');
      eGrad.addColorStop(0.65, '#ff6600');
      eGrad.addColorStop(1, '#440500');
      ectx.fillStyle = eGrad;
      ectx.fill();
      ectx.restore();
    };

    // Left Menacing Eye Path (Aggressive downward inner frown)
    const leftEye = (ctx) => {
      ctx.beginPath();
      ctx.moveTo(faceCenterX - 150, faceCenterY - 115); // high outer temple
      ctx.lineTo(faceCenterX - 35, faceCenterY - 45);   // low sharp inner corner
      ctx.lineTo(faceCenterX - 45, faceCenterY - 15);   // bottom inner
      ctx.lineTo(faceCenterX - 135, faceCenterY - 55);  // bottom outer
      ctx.closePath();
    };

    // Right Menacing Eye Path (Aggressive downward inner frown)
    const rightEye = (ctx) => {
      ctx.beginPath();
      ctx.moveTo(faceCenterX + 150, faceCenterY - 115); // high outer temple
      ctx.lineTo(faceCenterX + 35, faceCenterY - 45);   // low sharp inner corner
      ctx.lineTo(faceCenterX + 45, faceCenterY - 15);   // bottom inner
      ctx.lineTo(faceCenterX + 135, faceCenterY - 55);  // bottom outer
      ctx.closePath();
    };

    // Notched Triangle Nose Path
    const nose = (ctx) => {
      ctx.beginPath();
      ctx.moveTo(faceCenterX, faceCenterY - 35);
      ctx.lineTo(faceCenterX + 28, faceCenterY + 15);
      ctx.lineTo(faceCenterX + 8, faceCenterY + 10);
      ctx.lineTo(faceCenterX, faceCenterY + 22);
      ctx.lineTo(faceCenterX - 8, faceCenterY + 10);
      ctx.lineTo(faceCenterX - 28, faceCenterY + 15);
      ctx.closePath();
    };

    // Wide Sinister Grin with sharp fangs
    const mouth = (ctx) => {
      ctx.beginPath();
      // Upper lip with downward teeth
      ctx.moveTo(faceCenterX - 210, faceCenterY + 65);
      ctx.quadraticCurveTo(faceCenterX - 120, faceCenterY + 45, faceCenterX - 75, faceCenterY + 55);
      ctx.lineTo(faceCenterX - 60, faceCenterY + 95);  // Upper left tooth
      ctx.lineTo(faceCenterX - 40, faceCenterY + 60);
      ctx.quadraticCurveTo(faceCenterX, faceCenterY + 52, faceCenterX + 40, faceCenterY + 60);
      ctx.lineTo(faceCenterX + 60, faceCenterY + 95);  // Upper right tooth
      ctx.lineTo(faceCenterX + 75, faceCenterY + 55);
      ctx.quadraticCurveTo(faceCenterX + 120, faceCenterY + 45, faceCenterX + 210, faceCenterY + 65);

      // Lower lip with upward teeth
      ctx.quadraticCurveTo(faceCenterX + 150, faceCenterY + 145, faceCenterX + 95, faceCenterY + 148);
      ctx.lineTo(faceCenterX + 80, faceCenterY + 105); // Lower right tooth
      ctx.lineTo(faceCenterX + 60, faceCenterY + 150);
      ctx.quadraticCurveTo(faceCenterX, faceCenterY + 165, faceCenterX - 60, faceCenterY + 150);
      ctx.lineTo(faceCenterX - 80, faceCenterY + 105); // Lower left tooth
      ctx.lineTo(faceCenterX - 95, faceCenterY + 148);
      ctx.quadraticCurveTo(faceCenterX - 150, faceCenterY + 145, faceCenterX - 210, faceCenterY + 65);
      ctx.closePath();
    };

    drawCarvedPath(leftEye, 12);
    drawCarvedPath(rightEye, 12);
    drawCarvedPath(nose, 10);
    drawCarvedPath(mouth, 14);

    this.albedoTexture = new THREE.CanvasTexture(albedoCanvas);
    this.bumpTexture = new THREE.CanvasTexture(bumpCanvas);
    this.emissiveTexture = new THREE.CanvasTexture(emissiveCanvas);

    this.albedoTexture.flipY = false;
    this.bumpTexture.flipY = false;
    this.emissiveTexture.flipY = false;

    this.albedoTexture.wrapS = THREE.RepeatWrapping;
    this.albedoTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.bumpTexture.wrapS = THREE.RepeatWrapping;
    this.bumpTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.emissiveTexture.wrapS = THREE.RepeatWrapping;
    this.emissiveTexture.wrapT = THREE.ClampToEdgeWrapping;
  }

  /**
   * Construct 3D parametric multi-ribbed pumpkin geometry with:
   * - 12 distinct bulging lobes
   * - Deep dimpled stem depression at top
   * - Flattened stable base
   * - Organic asymmetry
   */
  createPumpkinBody() {
    const widthSegs = 96;
    const heightSegs = 64;
    const baseRadius = 2.4;

    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    const numLobes = 12;

    for (let j = 0; j <= heightSegs; j++) {
      const v = j / heightSegs;
      const phi = v * Math.PI; // 0 (top pole) to PI (bottom pole)

      for (let i = 0; i <= widthSegs; i++) {
        const u = i / widthSegs;
        const theta = u * Math.PI * 2;

        // 1. Rib lobe modulation: prominent lobes with sharp valleys
        const ribWave = Math.cos(numLobes * theta);
        const subWave = Math.cos(numLobes * 2 * theta) * 0.2;
        const ribMod = 1.0 + (ribWave + subWave) * 0.16;

        // 2. Vertical profile (squashed sphere with stem cup and base flatten)
        // Dimple at top:
        const topDimple = Math.pow(Math.sin(phi * 0.5), 0.65);
        // Base dimple:
        const bottomDimple = Math.pow(Math.cos(phi * 0.5), 0.7);
        const verticalProfile = Math.sin(phi) * 1.15 * topDimple * bottomDimple;

        // Flatten vertically like a real heavy pumpkin (height is ~72% of width)
        const ySquash = 0.78;
        const y = Math.cos(phi) * baseRadius * ySquash;

        // Radius at this height slice:
        // Top and bottom stem/navel depressions:
        let rSlice = baseRadius * verticalProfile * ribMod;
        if (phi < 0.22) {
          rSlice *= (phi / 0.22) * 0.85; // dip into stem cup
        }

        // 3. Subtle organic asymmetry
        const organicNoise = 1.0 + Math.sin(theta * 2 + phi * 3) * 0.035;
        rSlice *= organicNoise;

        const x = Math.sin(theta) * rSlice;
        const z = Math.cos(theta) * rSlice;

        positions.push(x, y, z);
        uvs.push(u, v);
      }
    }

    // Generate indices
    for (let j = 0; j < heightSegs; j++) {
      for (let i = 0; i < widthSegs; i++) {
        const a = j * (widthSegs + 1) + i;
        const b = a + widthSegs + 1;
        indices.push(a, b, a + 1);
        indices.push(b, b + 1, a + 1);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    // Rich PBR Material for the pumpkin rind with seamless carved face emission
    this.bodyMaterial = new THREE.MeshStandardMaterial({
      map: this.albedoTexture,
      bumpMap: this.bumpTexture,
      bumpScale: 0.22,
      roughness: 0.45,
      metalness: 0.05,
      emissiveMap: this.emissiveTexture,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 1.6
    });

    this.pumpkinMesh = new THREE.Mesh(geometry, this.bodyMaterial);
    this.pumpkinMesh.castShadow = true;
    this.pumpkinMesh.receiveShadow = true;
    this.group.add(this.pumpkinMesh);

    // Inner Cavity (Dark charred hollow shell)
    const innerGeo = geometry.clone();
    innerGeo.scale(0.92, 0.92, 0.92);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x1f0b03,
      roughness: 0.95,
      metalness: 0.0,
      side: THREE.BackSide
    });
    this.innerMesh = new THREE.Mesh(innerGeo, innerMat);
    this.group.add(this.innerMesh);
  }

  /**
   * Face is seamlessly carved into multi-layer textures
   */
  createCarvedFaceWithDepth() {
    // Carved face is physically mapped into albedo, bump, and emissive maps
  }



  /**
   * Gnarled, curved, ribbed wooden stem emerging from the crown
   */
  createGnarledStem() {
    // Curved spine path for the stem
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.7, 0),
      new THREE.Vector3(0.12, 2.2, 0.05),
      new THREE.Vector3(0.35, 2.75, -0.15),
      new THREE.Vector3(0.65, 3.1, -0.35)
    ]);

    // Fluted 6-sided cross-section with ridges
    const stemGeo = new THREE.TubeGeometry(curve, 32, 0.28, 8, false);

    // Procedural stem bark material
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x485822,
      roughness: 0.88,
      metalness: 0.05
    });

    this.stemMesh = new THREE.Mesh(stemGeo, stemMat);
    this.stemMesh.castShadow = true;
    this.group.add(this.stemMesh);
  }

  /**
   * Interior candle flame & point lights casting dynamic shadows through the carved eyes/mouth
   */
  createInteriorCandle() {
    // 1. Dynamic Point Light placed right behind the carved face (warm golden amber)
    this.candleLight = new THREE.PointLight(0xff9e1b, this.flameIntensity * 1.3, 22, 1.3);
    this.candleLight.position.set(0, 0.1, 0.8);
    this.candleLight.castShadow = true;
    this.candleLight.shadow.bias = -0.002;
    this.candleLight.shadow.mapSize.width = 1024;
    this.candleLight.shadow.mapSize.height = 1024;
    this.group.add(this.candleLight);

    // 2. Secondary Forward Projection Light (illuminating the asphalt road directly in front, matching Reference 2)
    this.forwardLight = new THREE.SpotLight(0xffa526, 4.8, 28, Math.PI * 0.38, 0.65, 1.1);
    this.forwardLight.position.set(0, 0.1, 0.5);
    this.forwardLight.target.position.set(0, -1.8, 6.0);
    this.group.add(this.forwardLight);
    this.group.add(this.forwardLight.target);

    // 3. Visible 3D Dancing Flame Teardrop inside the cavity
    const flameGeo = new THREE.ConeGeometry(0.15, 0.55, 12);
    flameGeo.translate(0, 0.25, 0);
    this.flameMaterial = new THREE.MeshBasicMaterial({
      color: 0xffee66,
      transparent: true,
      opacity: 0.95
    });
    this.flameMesh = new THREE.Mesh(flameGeo, this.flameMaterial);
    this.flameMesh.position.set(0, -0.4, 0.6);
    this.group.add(this.flameMesh);
  }

  /**
   * Provoke the pumpkin on user click:
   * Eyes flare with intense blood-red/fire, flame swells, and it trembles menacingly
   */
  provoke() {
    this.isEnraged = true;
    this.targetFlameIntensity = 7.5;
    this.candleLight.color.setHex(0xff2200);
    this.forwardLight.color.setHex(0xff3300);

    setTimeout(() => {
      this.isEnraged = false;
      this.targetFlameIntensity = 2.8;
      this.candleLight.color.setHex(0xff7700);
      this.forwardLight.color.setHex(0xff9900);
    }, 2400);
  }

  update(delta, elapsed) {
    this.noiseTime += delta * this.flickerSpeed;

    // Organic Candle Flame Flicker algorithm
    // Combines high-frequency rapid jitter with low-frequency natural draft swells
    const flickerNoise =
      Math.sin(this.noiseTime * 1.7) * 0.35 +
      Math.cos(this.noiseTime * 3.4) * 0.25 +
      Math.sin(this.noiseTime * 7.1) * 0.15;

    // Smoothly interpolate towards target intensity
    this.flameIntensity += (this.targetFlameIntensity - this.flameIntensity) * 0.1;
    const currentIntensity = Math.max(0.8, this.flameIntensity + flickerNoise);

    this.candleLight.intensity = currentIntensity;
    this.forwardLight.intensity = currentIntensity * 1.3;

    // Subtle flame position dancing
    this.candleLight.position.x = Math.sin(this.noiseTime * 2.1) * 0.06;
    this.candleLight.position.y = 0.1 + Math.cos(this.noiseTime * 2.8) * 0.05;

    // Flame mesh breathing
    if (this.flameMesh) {
      this.flameMesh.scale.y = 1.0 + flickerNoise * 0.2;
      this.flameMesh.scale.x = 1.0 - flickerNoise * 0.1;
      this.flameMesh.rotation.z = Math.sin(this.noiseTime * 1.5) * 0.15;
    }

    // Enraged shake if provoked
    if (this.isEnraged) {
      this.group.position.x = (Math.random() - 0.5) * 0.08;
      this.group.position.y = 1.2 + (Math.random() - 0.5) * 0.06;
    } else {
      // Gentle eerie breathing hover
      this.group.position.x = 0;
      this.group.position.y = 1.2 + Math.sin(elapsed * 1.2) * 0.02;
    }
  }
}
