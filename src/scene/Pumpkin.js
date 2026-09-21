import * as THREE from 'three';

/**
 * Photorealistic 3D Carved Pumpkin with Internal Firelight & Levitation:
 * - Completely round, full spherical 10-lobe ribbed pumpkin geometry
 * - Creepy jack-o'-lantern face with 2 BIG menacing carved eyes and a sinister jagged grin
 * - Physically sound internal firelight: faint eerie candle flicker initially,
 *   surging into an intense roaring blaze on click
 * - Interactive click: fire roars, boiling honey liquid pours out of BOTH large eyes,
 *   puddle spreads, bright vines sprout, and pumpkin smoothly levitates to 5'10" user eye level (Y = 1.78)
 */
export class Pumpkin {
  constructor(scene, boilingLiquid, bats) {
    this.scene = scene;
    this.boilingLiquid = boilingLiquid;
    this.bats = bats;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Initial position resting on the asphalt road in the middle of the highway far back
    this.baseY = 0.65;
    this.eyeLevelY = 1.78; // Exact 5'10" user eye level
    this.position = new THREE.Vector3(0, this.baseY, -13.5);
    this.group.position.copy(this.position);

    this.isClicked = false;
    this.isLevitating = false;
    this.levitateProgress = 0.0;
    this.levitateTime = 0.0;
    this.fireIntensity = 0.35; // Starts with a very faint, eerie interior candle glow
    this.targetFireIntensity = 0.35;

    this.raycastableMeshes = [];

    this.initPumpkinGeometry();
    this.initCarvedFaceAndFire();
    this.initHeadLeapingFire();
  }

  initPumpkinGeometry() {
    const textureLoader = new THREE.TextureLoader();
    this.texture = textureLoader.load('/textures/pumpkin texture_generated.png', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.repeat.set(2.0, 1.0);
      tex.anisotropy = 16;
      tex.needsUpdate = true;
    });

    // 1. Completely Round Spherical Pumpkin Body (10 bulging organic lobes)
    const baseGeo = new THREE.SphereGeometry(0.66, 64, 48);
    const posAttr = baseGeo.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < posAttr.count; i++) {
      vertex.fromBufferAttribute(posAttr, i);

      const angle = Math.atan2(vertex.z, vertex.x);
      const heightFrac = vertex.y / 0.66; // -1 to 1

      // 10 deep organic radial rib lobes that keep the equator full and round
      const ribWave = Math.cos(angle * 10.0);
      const lobeIndent = 1.0 + ribWave * 0.082 * (1.0 - Math.pow(heightFrac, 6.0));

      vertex.x *= lobeIndent;
      vertex.z *= lobeIndent;

      // Subtle pole indentations without flattening the overall spherical volume
      if (vertex.y > 0.52) {
        vertex.y -= (vertex.y - 0.52) * 0.28;
      }
      if (vertex.y < -0.52) {
        vertex.y += (-0.52 - vertex.y) * 0.22;
      }

      posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    baseGeo.computeVertexNormals();

    const pumpkinMat = new THREE.MeshStandardMaterial({
      map: this.texture,
      bumpMap: this.texture,
      bumpScale: 0.045,
      roughness: 0.62,
      metalness: 0.06,
      color: new THREE.Color(0xff8c1a) // Rich harvest pumpkin orange
    });

    this.pumpkinMesh = new THREE.Mesh(baseGeo, pumpkinMat);
    this.pumpkinMesh.castShadow = true;
    this.pumpkinMesh.receiveShadow = true;
    this.group.add(this.pumpkinMesh);
    this.raycastableMeshes.push(this.pumpkinMesh);

    // Generous invisible click collider sphere for effortless interaction
    const colliderGeo = new THREE.SphereGeometry(1.25, 16, 16);
    const colliderMat = new THREE.MeshBasicMaterial({ visible: false });
    this.clickCollider = new THREE.Mesh(colliderGeo, colliderMat);
    this.group.add(this.clickCollider);
    this.raycastableMeshes.push(this.clickCollider);

    // 2. Gnarled Twisted Wooden Stem
    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.42, 0),
      new THREE.Vector3(0.03, 0.56, 0.02),
      new THREE.Vector3(0.08, 0.68, -0.04),
      new THREE.Vector3(0.12, 0.75, -0.08)
    ]);
    const stemGeo = new THREE.TubeGeometry(stemCurve, 16, 0.036, 8, false);
    const stemMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x382c16), // Dark weathered stem wood
      roughness: 0.92,
      metalness: 0.02
    });
    const stemMesh = new THREE.Mesh(stemGeo, stemMat);
    stemMesh.castShadow = true;
    this.group.add(stemMesh);
  }

  initCarvedFaceAndFire() {
    // 1. High-Definition Canvas for Classic Menacing Eyes, Carved Nose, and Jagged Wicked Grin
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 1024, 1024);

    const drawCutout = (points) => {
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
      }
      ctx.closePath();

      // Outer beveled rind stroke (encoded in green channel for pulp depth)
      ctx.lineWidth = 18;
      ctx.strokeStyle = 'rgba(255, 140, 20, 0.95)';
      ctx.stroke();

      // Core aperture cut (encoded in red channel for hollow opening)
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    };

    // 2 Big Classic Menacing Eyes: Slanted terrifying predator brows
    const leftBigEye = [
      [195, 335], // Outer sharp corner
      [315, 230], // Upper brow peak
      [425, 275], // Inner top corner
      [395, 385], // Inner lower corner
      [285, 395]  // Bottom curve
    ];
    drawCutout(leftBigEye);

    const rightBigEye = [
      [829, 335], // Outer sharp corner
      [709, 230], // Upper brow peak
      [599, 275], // Inner top corner
      [629, 385], // Inner lower corner
      [739, 395]  // Bottom curve
    ];
    drawCutout(rightBigEye);

    // Sharp carved triangular nose
    const carvedNose = [
      [512, 375], // Top apex
      [465, 455], // Left bottom corner
      [559, 455]  // Right bottom corner
    ];
    drawCutout(carvedNose);

    // Creepy wide jagged grin with menacing triangular teeth
    const creepyMouth = [
      [175, 540], // Left mouth corner
      [265, 580], [315, 525], [370, 600], [425, 535], [475, 605],
      [512, 550], // Center top
      [549, 605], [599, 535], [654, 600], [709, 525], [759, 580],
      [849, 540], // Right mouth corner
      [775, 655], [725, 605], [670, 685], [615, 615], [560, 690],
      [512, 635], // Center bottom
      [464, 690], [409, 615], [354, 685], [299, 605], [249, 655]
    ];
    drawCutout(creepyMouth);

    const faceTexture = new THREE.CanvasTexture(canvas);
    faceTexture.colorSpace = THREE.SRGBColorSpace;

    // 2. Animated Physically-Sound Fire Shader with Realistic Hollow Cavity Depth & Rind Bevel
    this.faceMat = new THREE.ShaderMaterial({
      uniforms: {
        tMask: { value: faceTexture },
        uTime: { value: 0 },
        uFirePower: { value: 0.35 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tMask;
        uniform float uTime;
        uniform float uFirePower;
        varying vec2 vUv;

        // Procedural organic flame turbulence
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }

        void main() {
          vec4 mask = texture2D(tMask, vUv);
          if (mask.a < 0.03) discard;

          // uFirePower: 0.35 (faint eerie candle) -> 4.2 (surging roaring blaze)
          float blazeNorm = clamp((uFirePower - 0.35) / (4.2 - 0.35), 0.0, 1.0);

          // 1. Carved Rind Wall Bevel: Warm translucent glowing pumpkin flesh at the cut boundary
          float isRind = smoothstep(0.05, 0.65, mask.g) * (1.0 - smoothstep(0.70, 0.98, mask.r));
          vec3 rindFlesh = mix(vec3(0.55, 0.18, 0.02), vec3(0.98, 0.52, 0.08), blazeNorm * 0.7 + 0.3);

          // 2. Hollow Cavity Flame Simulation inside the aperture
          // Multi-octave convective upward lick with rapid turbulence
          vec2 fireCoord1 = vec2(vUv.x * 9.0, vUv.y * 11.0 - uTime * (3.2 + blazeNorm * 4.5));
          vec2 fireCoord2 = vec2(vUv.x * 16.0 + sin(uTime * 3.0), vUv.y * 18.0 - uTime * 5.0);
          float n1 = noise(fireCoord1);
          float n2 = noise(fireCoord2);
          float flameTongue = n1 * 0.62 + n2 * 0.38;

          // Socket convective heat: ensure interior is always warm and glowing, never pitch-black
          // Base heat floor ensures visible flame even at top eye sockets
          float baseHeat = mix(0.38, 0.75, blazeNorm);
          float flameHeat = clamp(baseHeat + flameTongue * (0.35 + blazeNorm * 0.55), 0.0, 1.4);

          // Physically realistic flame color spectrum:
          // Deep cavity coal -> Crimson ember -> Vibrant pumpkin fire -> Incandescent gold -> White-hot core
          vec3 deepCoal = vec3(0.40, 0.08, 0.02);
          vec3 crimsonFlame = vec3(0.85, 0.15, 0.02);
          vec3 orangeFire = vec3(1.0, 0.52, 0.04);
          vec3 incandescentGold = vec3(1.0, 0.88, 0.30);
          vec3 whiteHotCore = vec3(1.0, 0.98, 0.85);

          vec3 flameCol = mix(deepCoal, crimsonFlame, smoothstep(0.0, 0.35, flameHeat));
          flameCol = mix(flameCol, orangeFire, smoothstep(0.35, 0.70, flameHeat));
          flameCol = mix(flameCol, incandescentGold, smoothstep(0.70, 1.05, flameHeat));
          flameCol = mix(flameCol, whiteHotCore, smoothstep(1.05, 1.35, flameHeat) * blazeNorm);

          // Composite rind bevel and internal flame cavity
          vec3 finalColor = mix(flameCol, rindFlesh, isRind * 0.75);

          // Soft edge alpha
          float alpha = mask.a * smoothstep(0.03, 0.18, mask.a);

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    // Conformal curved cylinder section wrapping across the round pumpkin front
    const faceGeo = new THREE.CylinderGeometry(
      0.672, 0.672, 0.65,
      32, 1, true,
      -Math.PI * 0.32, Math.PI * 0.64
    );
    this.faceMat.polygonOffset = true;
    this.faceMat.polygonOffsetFactor = -3.0;
    this.faceMat.polygonOffsetUnits = -3.0;

    this.faceMesh = new THREE.Mesh(faceGeo, this.faceMat);
    this.faceMesh.position.set(0, 0.08, 0.0);
    this.faceMesh.rotation.y = 0;
    this.group.add(this.faceMesh);
    this.raycastableMeshes.push(this.faceMesh);

    // 3. Physically-sound Internal Firelight PointLight (inside the hollow core)
    this.fireLight = new THREE.PointLight(0xff7711, 0.45, 9.0, 2.0);
    this.fireLight.position.set(0, 0.10, 0.02);
    this.fireLight.castShadow = true;
    this.fireLight.shadow.bias = -0.002;
    this.group.add(this.fireLight);

    // Forward beam spill projecting through the eyes/mouth onto the road
    this.forwardGlow = new THREE.PointLight(0xff6611, 0.22, 7.0, 2.0);
    this.forwardGlow.position.set(0, -0.32, 1.05);
    this.group.add(this.forwardGlow);
  }

  initHeadLeapingFire() {
    // 4. Enraged Leaping Head Fire (Violent flame tongues bursting upward from the head aperture)
    this.headFlamesGroup = new THREE.Group();
    this.headFlamesGroup.position.set(0, 0.48, 0);
    this.group.add(this.headFlamesGroup);

    this.headFlameMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uFirePower: { value: 0.35 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        void main() {
          vUv = uv;
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uFirePower;
        varying vec2 vUv;
        varying vec3 vPos;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }

        void main() {
          // Fire power norm: 0.0 when candle flicker, 1.0 when roaring blaze
          float blaze = clamp((uFirePower - 0.5) / 3.5, 0.0, 1.0);
          if (blaze <= 0.01) discard;

          // Upward convective flame tongue distortion
          vec2 uv1 = vec2(vUv.x * 4.0, vUv.y * 5.0 - uTime * (4.5 + blaze * 4.0));
          vec2 uv2 = vec2(vUv.x * 7.0 + sin(uTime * 4.0), vUv.y * 9.0 - uTime * 6.5);
          float n = noise(uv1) * 0.65 + noise(uv2) * 0.35;

          // Flame shape: wider at base, licking into sharp tongues at top
          float shape = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x);
          float heightTaper = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 0.85);
          float flameIntensity = (shape * heightTaper * (0.4 + n * 0.9)) * blaze;

          if (flameIntensity < 0.06) discard;

          // Realistic fire spectrum: deep orange -> brilliant pumpkin gold -> incandescent white
          vec3 deepAmber = vec3(0.85, 0.22, 0.02);
          vec3 brightGold = vec3(1.0, 0.65, 0.08);
          vec3 whiteCore = vec3(1.0, 0.95, 0.80);

          vec3 flameCol = mix(deepAmber, brightGold, smoothstep(0.12, 0.55, flameIntensity));
          flameCol = mix(flameCol, whiteCore, smoothstep(0.55, 0.95, flameIntensity));

          float alpha = clamp(flameIntensity * 1.6, 0.0, 0.95) * blaze;
          gl_FragColor = vec4(flameCol, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    // 4 Crossed vertical flame quads encircling the stem
    const flameGeo = new THREE.PlaneGeometry(0.55, 0.95);
    flameGeo.translate(0, 0.45, 0);

    for (let r = 0; r < 4; r++) {
      const flameMesh = new THREE.Mesh(flameGeo, this.headFlameMat);
      flameMesh.rotation.y = (Math.PI / 4) * r;
      this.headFlamesGroup.add(flameMesh);
    }

    // 5. Rising Ember Sparks from Head Fire
    const emberCount = 20;
    const emberGeo = new THREE.BufferGeometry();
    const emberPos = new Float32Array(emberCount * 3);
    this.emberData = [];

    for (let i = 0; i < emberCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.22;
      const x = Math.cos(angle) * r;
      const y = 0.5 + Math.random() * 0.3;
      const z = Math.sin(angle) * r;

      emberPos[i * 3] = x;
      emberPos[i * 3 + 1] = y;
      emberPos[i * 3 + 2] = z;

      this.emberData.push({
        baseX: x,
        baseZ: z,
        y: y,
        speedY: 0.8 + Math.random() * 0.7,
        swayPhase: Math.random() * Math.PI * 2,
        life: Math.random()
      });
    }

    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));

    const emberMat = new THREE.PointsMaterial({
      color: 0xffaa22,
      size: 0.09,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });

    this.emberPoints = new THREE.Points(emberGeo, emberMat);
    this.headFlamesGroup.add(this.emberPoints);
  }

  /**
   * Returns current world-space coordinates of both carved eyes
   * for the dual boiling honey liquid streams.
   */
  getEyeWorldPositions() {
    // Local eye coordinates relative to pumpkin center
    const leftLocal = new THREE.Vector3(-0.25, 0.22, 0.58);
    const rightLocal = new THREE.Vector3(0.25, 0.22, 0.58);

    const leftWorld = new THREE.Vector3();
    const rightWorld = new THREE.Vector3();

    this.group.localToWorld(leftWorld.copy(leftLocal));
    this.group.localToWorld(rightWorld.copy(rightLocal));

    return { leftEye: leftWorld, rightEye: rightWorld };
  }

  onPointerDown(raycaster) {
    const intersects = raycaster.intersectObjects(this.raycastableMeshes, true);
    if (intersects.length > 0) {
      this.triggerClickSequence();
      return true;
    }
    return false;
  }

  triggerClickSequence() {
    // 1. Subtle physical wobble impulse
    let t = 0;
    const wobbleInterval = setInterval(() => {
      t += 0.08;
      this.pumpkinMesh.rotation.z = Math.sin(t * 15.0) * 0.04 * Math.exp(-t * 2.0);
      if (t > 1.5) {
        clearInterval(wobbleInterval);
        this.pumpkinMesh.rotation.z = 0;
      }
    }, 16);

    // Subsequent clicks trigger additional bat swarms and wobbles
    if (this.isClicked) {
      if (this.bats) {
        this.bats.triggerHeroTextSwarm();
      }
      return;
    }

    this.isClicked = true;

    // 2. Fire surges rapidly into an enraged violent roaring blaze
    this.targetFireIntensity = 4.6;

    // 3. Activate boiling honey liquid pouring out of BOTH eyes onto the road
    const eyePositions = this.getEyeWorldPositions();
    if (this.boilingLiquid) {
      this.boilingLiquid.activateDual(eyePositions.leftEye, eyePositions.rightEye, this);
    }

    // Levitation is strictly delayed until BoilingLiquid expands to road shoulders (|X| >= 4.5)
    this.isLevitating = false;
  }

  /**
   * Triggered once the boiling liquid reaches the road shoulders,
   * smoothly levitating the pumpkin to 5'10" eye level (Y = 1.78).
   */
  triggerLevitation() {
    if (this.isLevitating) return;
    this.isLevitating = true;
    this.levitateProgress = 0.0;
    this.levitateTime = 0.0;
  }

  update(delta, elapsed) {
    // 1. Fire Intensity Lerp (faint candle glow -> blazing fire on click)
    this.fireIntensity += (this.targetFireIntensity - this.fireIntensity) * (delta * 3.5);

    if (this.fireLight) {
      // Natural organic flame harmonics
      const flicker1 = Math.sin(elapsed * 18.0) * 0.35;
      const flicker2 = Math.cos(elapsed * 31.0) * 0.25;
      const flickerNoise = Math.sin(elapsed * 7.5 + Math.sin(elapsed * 23.0)) * 0.20;

      const dynamicIntensity = Math.max(0.1, this.fireIntensity + (flicker1 + flicker2 + flickerNoise) * (this.fireIntensity / 4.0));
      this.fireLight.intensity = dynamicIntensity;
      this.forwardGlow.intensity = dynamicIntensity * 0.45;
    }

    // 2. Update carved face fire shader
    if (this.faceMat && this.faceMat.uniforms.uTime) {
      this.faceMat.uniforms.uTime.value = elapsed;
      this.faceMat.uniforms.uFirePower.value = this.fireIntensity;
    }

    // 3. Update Enraged Leaping Head Fire & Sparks
    if (this.headFlameMat) {
      this.headFlameMat.uniforms.uTime.value = elapsed;
      this.headFlameMat.uniforms.uFirePower.value = this.fireIntensity;

      // Animate head embers if enraged
      if (this.emberPoints && this.fireIntensity > 0.8) {
        const blazeNorm = Math.min(1.0, (this.fireIntensity - 0.8) / 3.2);
        this.emberPoints.material.opacity = blazeNorm * 0.85;

        const posAttr = this.emberPoints.geometry.attributes.position;
        for (let i = 0; i < this.emberData.length; i++) {
          const ed = this.emberData[i];
          ed.life += delta * 0.8;
          if (ed.life > 1.0) {
            ed.life = 0.0;
            ed.y = 0.52;
          }
          ed.y += ed.speedY * delta;
          const curX = ed.baseX + Math.sin(elapsed * 4.0 + ed.swayPhase) * 0.08;
          const curZ = ed.baseZ + Math.cos(elapsed * 4.0 + ed.swayPhase) * 0.08;
          posAttr.setXYZ(i, curX, ed.y, curZ);
        }
        posAttr.needsUpdate = true;
      } else if (this.emberPoints) {
        this.emberPoints.material.opacity = 0.0;
      }
    }

    // 4. Smooth Levitation to 5'10" Eye Level (Y = 1.78)
    if (this.isLevitating) {
      this.levitateTime += delta;
      if (this.levitateProgress < 1.0) {
        this.levitateProgress = Math.min(1.0, this.levitateProgress + delta * 0.32);
        const easeY = THREE.MathUtils.smoothstep(this.levitateProgress, 0.0, 1.0);
        this.position.y = THREE.MathUtils.lerp(this.baseY, this.eyeLevelY, easeY);
      }
    }

    // 5. Subtle Supernatural Floating Sway while hovering at eye level
    if (this.isLevitating) {
      const hoverBob = Math.sin(elapsed * 2.2) * 0.035;
      const hoverTilt = Math.cos(elapsed * 1.5) * 0.025;
      this.group.position.y = this.position.y + hoverBob;
      this.group.rotation.z = hoverTilt;
    } else {
      this.group.position.copy(this.position);
    }
  }
}
