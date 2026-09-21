import * as THREE from 'three';

/**
 * MeadowLandscape:
 * A vast, vibrant flowery landscape inspired by Disney/Pixar's Coco and Up.
 * - Rolling hills ground mesh mapped with custom hand-painted grass texture
 * - Earthen hollow where the colossal skeleton rests
 * - Thousands of instanced 3D grass blades swaying with dynamic wind
 * - Dense clusters of 3D Mexican Marigolds (cempasúchil), purple lavender spikes,
 *   and daisies that dynamically bend and react to gentle breezes and giant movement gusts.
 */
export class MeadowLandscape {
  constructor(windSystem) {
    this.windSystem = windSystem;
    this.group = new THREE.Group();

    // Cursor tracking state for interactive grass movement
    this.cursorWorldPos = new THREE.Vector3(-999, 0, -999);
    this.cursorActive = false;

    this.textureLoader = new THREE.TextureLoader();
    this.loadGrassTexture();
    this.createTerrain();
    this.createInstancedGrass();
    this.createWildflowers();
  }

  loadGrassTexture() {
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    const grassUrl = `${origin}/Otherworld/hand painted grass texture generated.png`;

    this.grassTexture = this.textureLoader.load(grassUrl, (tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(6, 6);
      tex.colorSpace = THREE.SRGBColorSpace;
      if (this.terrainMat) {
        this.terrainMat.map = tex;
        this.terrainMat.needsUpdate = true;
      }
    });
  }

  createTerrain() {
    // 180x180 vast rolling meadow
    const geo = new THREE.PlaneGeometry(180, 180, 100, 100);
    const pos = geo.attributes.position;
    const colors = [];

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i); // PlaneGeometry in XY before rotation: z_world = -y

      // Rolling hills formula
      let h = Math.sin(x * 0.045) * Math.cos(-y * 0.045) * 3.2;
      h += Math.sin(x * 0.11 + 1.2) * Math.cos(-y * 0.08 - 0.7) * 1.4;
      h += Math.sin(x * 0.02 - (-y) * 0.02) * 2.2;

      // Earthen cradle hollow where the skeleton is buried (around x: 0, z_world: -6.4 -> y = 6.4)
      const distToSkel = Math.sqrt(x * x + (y - 6.4) * (y - 6.4));
      if (distToSkel < 12.0) {
        const factor = Math.cos((distToSkel / 12.0) * Math.PI * 0.5);
        h -= factor * 1.1; // Gentle hollow for skeleton
      }

      pos.setZ(i, h);

      // Vertex color blending:
      // Dark fertile loam around the burial cradle, warm golden-green turf elsewhere
      if (distToSkel < 7.0) {
        const t = distToSkel / 7.0;
        colors.push(
          THREE.MathUtils.lerp(0.24, 0.35, t),
          THREE.MathUtils.lerp(0.16, 0.48, t),
          THREE.MathUtils.lerp(0.09, 0.15, t)
        );
      } else {
        const hillT = THREE.MathUtils.clamp((h + 2.0) / 6.0, 0.0, 1.0);
        colors.push(
          THREE.MathUtils.lerp(0.32, 0.46, hillT),
          THREE.MathUtils.lerp(0.46, 0.58, hillT),
          THREE.MathUtils.lerp(0.14, 0.18, hillT)
        );
      }
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    this.terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.02
    });

    this.terrainMesh = new THREE.Mesh(geo, this.terrainMat);
    this.terrainMesh.rotation.x = -Math.PI / 2;
    this.terrainMesh.position.set(0, -0.4, 0);
    this.terrainMesh.receiveShadow = true;
    this.group.add(this.terrainMesh);

    // Earthen burial mound surrounding the skeleton's emergence at (0, -0.6, -4.5)
    const moundGeo = new THREE.CylinderGeometry(5.2, 7.8, 1.4, 24, 4);
    const moundPos = moundGeo.attributes.position;
    for (let i = 0; i < moundPos.count; i++) {
      const vx = moundPos.getX(i);
      const vy = moundPos.getY(i);
      const vz = moundPos.getZ(i);
      const noise = (Math.sin(vx * 2.0) + Math.cos(vz * 2.0)) * 0.22;
      moundPos.setX(i, vx + noise * 0.2);
      moundPos.setZ(i, vz + noise * 0.2);
    }
    moundGeo.computeVertexNormals();

    const moundMat = new THREE.MeshStandardMaterial({
      color: 0x54361c, // Rich dark earthen soil
      roughness: 0.95,
      metalness: 0.02
    });
    this.moundMesh = new THREE.Mesh(moundGeo, moundMat);
    this.moundMesh.position.set(0, -0.6, -6.4);
    this.moundMesh.receiveShadow = true;
    this.group.add(this.moundMesh);
  }

  /**
   * Generates a 4-blade curved ribbon tuft geometry with vertex color gradient
   */
  createGrassTuftGeometry() {
    const geo = new THREE.BufferGeometry();
    const positions = [];
    const normals = [];
    const uvs = [];
    const colors = [];
    const indices = [];

    // 4 curved tapering blades radiating in a natural cluster (realistic meadow turf scale)
    const bladeAngles = [0.15, 1.45, 2.85, 4.35];
    const bladeHeights = [0.38, 0.30, 0.42, 0.34];
    const bladeCurvatures = [0.18, 0.14, 0.20, 0.16];

    let vertOffset = 0;

    for (let b = 0; b < 4; b++) {
      const angle = bladeAngles[b];
      const h = bladeHeights[b];
      const curve = bladeCurvatures[b];
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const perpX = -sinA;
      const perpZ = cosA;

      const levels = [
        { y: 0.0, w: 0.040, curveOffset: 0.0, t: 0.0 },
        { y: h * 0.35, w: 0.032, curveOffset: curve * 0.15, t: 0.35 },
        { y: h * 0.70, w: 0.018, curveOffset: curve * 0.55, t: 0.70 },
        { y: h * 1.00, w: 0.003, curveOffset: curve * 1.00, t: 1.00 }
      ];

      for (let l = 0; l < levels.length; l++) {
        const lvl = levels[l];
        const cx = cosA * lvl.curveOffset;
        const cz = sinA * lvl.curveOffset;

        const lx = cx - perpX * (lvl.w * 0.5);
        const lz = cz - perpZ * (lvl.w * 0.5);
        positions.push(lx, lvl.y, lz);
        normals.push(cosA * 0.5, 0.8, sinA * 0.5);
        uvs.push(0.0, lvl.t);

        const rx = cx + perpX * (lvl.w * 0.5);
        const rz = cz + perpZ * (lvl.w * 0.5);
        positions.push(rx, lvl.y, rz);
        normals.push(cosA * 0.5, 0.8, sinA * 0.5);
        uvs.push(1.0, lvl.t);

        // Sunlit golden-green gradient
        let r, g, bl;
        if (lvl.t < 0.5) {
          const frac = lvl.t / 0.5;
          r = THREE.MathUtils.lerp(0.14, 0.42, frac);
          g = THREE.MathUtils.lerp(0.24, 0.62, frac);
          bl = THREE.MathUtils.lerp(0.06, 0.14, frac);
        } else {
          const frac = (lvl.t - 0.5) / 0.5;
          r = THREE.MathUtils.lerp(0.42, 0.82, frac);
          g = THREE.MathUtils.lerp(0.62, 0.90, frac);
          bl = THREE.MathUtils.lerp(0.14, 0.28, frac);
        }
        colors.push(r, g, bl);
        colors.push(r, g, bl);
      }

      for (let s = 0; s < 3; s++) {
        const v0 = vertOffset + s * 2;
        const v1 = vertOffset + s * 2 + 1;
        const v2 = vertOffset + (s + 1) * 2;
        const v3 = vertOffset + (s + 1) * 2 + 1;

        indices.push(v0, v1, v2);
        indices.push(v2, v1, v3);
      }

      vertOffset += levels.length * 2;
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);

    return geo;
  }

  /**
   * Instanced grass blades swaying on the GPU with custom onBeforeCompile shader hooks
   */
  createInstancedGrass() {
    const grassCount = 25000;
    const bladeGeo = this.createGrassTuftGeometry();

    const grassMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.65,
      metalness: 0.04,
      side: THREE.DoubleSide
    });

    // Uniforms for wind & interactive cursor displacement
    this.grassUniforms = {
      uTime: { value: 0 },
      uWindDir: { value: new THREE.Vector2(0.85, 0.52) },
      uWindStrength: { value: 0.4 },
      uGustActive: { value: 0 },
      uGustOrigin: { value: new THREE.Vector3(0, 0, -4.5) },
      uGustTime: { value: 0 },
      uGustDuration: { value: 3.8 },
      uGustIntensity: { value: 0 },
      uCursorPos: { value: new THREE.Vector2(-999, -999) },
      uCursorRadius: { value: 4.2 },
      uCursorPush: { value: 1.65 },
      uCursorActive: { value: 0.0 },
      uCursorVel: { value: new THREE.Vector2(0, 0) }
    };

    grassMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.grassUniforms.uTime;
      shader.uniforms.uWindDir = this.grassUniforms.uWindDir;
      shader.uniforms.uWindStrength = this.grassUniforms.uWindStrength;
      shader.uniforms.uGustActive = this.grassUniforms.uGustActive;
      shader.uniforms.uGustOrigin = this.grassUniforms.uGustOrigin;
      shader.uniforms.uGustTime = this.grassUniforms.uGustTime;
      shader.uniforms.uGustDuration = this.grassUniforms.uGustDuration;
      shader.uniforms.uGustIntensity = this.grassUniforms.uGustIntensity;
      shader.uniforms.uCursorPos = this.grassUniforms.uCursorPos;
      shader.uniforms.uCursorRadius = this.grassUniforms.uCursorRadius;
      shader.uniforms.uCursorPush = this.grassUniforms.uCursorPush;
      shader.uniforms.uCursorActive = this.grassUniforms.uCursorActive;
      shader.uniforms.uCursorVel = this.grassUniforms.uCursorVel;

      shader.vertexShader = `
        uniform float uTime;
        uniform vec2 uWindDir;
        uniform float uWindStrength;
        uniform float uGustActive;
        uniform vec3 uGustOrigin;
        uniform float uGustTime;
        uniform float uGustDuration;
        uniform float uGustIntensity;
        uniform vec2 uCursorPos;
        uniform float uCursorRadius;
        uniform float uCursorPush;
        uniform float uCursorActive;
        uniform vec2 uCursorVel;
        ${shader.vertexShader}
      `;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        
        // World position of this instance
        vec4 worldInstancePos = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float heightFactor = clamp(position.y / 0.42, 0.0, 1.0);

        // 1. Ambient gentle sway (bases stay anchored, tips bend)
        float swayNoise = sin(worldInstancePos.x * 0.35 + worldInstancePos.z * 0.25 + uTime * 1.8);
        float swayForce = swayNoise * uWindStrength * heightFactor * heightFactor;
        transformed.x += uWindDir.x * swayForce * 0.42;
        transformed.z += uWindDir.y * swayForce * 0.42;

        // 2. Interactive cursor displacement: grass blades part and bend away when cursor is on the grass
        if (uCursorActive > 0.5) {
          vec2 cursorDelta = worldInstancePos.xz - uCursorPos;
          float cursorDist = length(cursorDelta);
          if (cursorDist < uCursorRadius && cursorDist > 0.001) {
            float t = 1.0 - (cursorDist / uCursorRadius);
            float falloff = t * t * (3.0 - 2.0 * t); // Smooth cubic hermite curve
            vec2 pushDir = normalize(cursorDelta);
            
            // Dynamic brush stroke: blend radial parting with cursor brush motion velocity
            vec2 velPush = length(uCursorVel) > 0.05 ? normalize(uCursorVel) * 0.35 : vec2(0.0);
            vec2 totalDir = normalize(pushDir + velPush);

            float pushAmount = falloff * uCursorPush * heightFactor;
            transformed.x += totalDir.x * pushAmount;
            transformed.z += totalDir.y * pushAmount;
            transformed.y -= pushAmount * 0.24; // Natural elastic dip as blades bend
          }
        }

        // 3. Giant skeleton movement shockwave
        if (uGustActive > 0.5) {
          vec2 deltaPos = worldInstancePos.xz - uGustOrigin.xz;
          float dist = length(deltaPos);
          float waveFront = (uGustTime / uGustDuration) * 45.0;
          float distDiff = abs(dist - waveFront);
          if (distDiff < 8.0) {
            float waveFalloff = (1.0 - (distDiff / 8.0));
            float timeDecay = max(0.0, 1.0 - (uGustTime / uGustDuration));
            float blast = waveFalloff * timeDecay * uGustIntensity * heightFactor * 0.95;
            vec2 blastDir = dist > 0.01 ? normalize(deltaPos) : vec2(0.0, 1.0);
            transformed.x += blastDir.x * blast;
            transformed.z += blastDir.y * blast;
            transformed.y -= blast * 0.4;
          }
        }
        `
      );
    };

    this.grassMesh = new THREE.InstancedMesh(bladeGeo, grassMat, grassCount);
    this.grassMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let index = 0;

    // Distribute grass across midground, perimeter, and rolling hills
    // Keep camera foreground (z > 1.2) completely open to avoid giant distorted blades in front of lens
    for (let i = 0; i < grassCount; i++) {
      let x, z;
      if (i < 13000) {
        // High density around skeleton perimeter and mid-meadow
        const radius = Math.pow(Math.random(), 1.2) * 15.0;
        const angle = Math.random() * Math.PI * 2;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius - 6.0;
      } else if (i < 20000) {
        // Medium density (radius 15 - 32m)
        const radius = 15.0 + Math.random() * 18.0;
        const angle = Math.random() * Math.PI * 2;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius - 6.5;
      } else {
        // Distant rolling hills (radius 32 - 68m)
        const radius = 32.0 + Math.random() * 36.0;
        const angle = Math.random() * Math.PI * 2;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius - 7.0;
      }

      // Strict camera clearance: ensure no grass blade spawns at z > 1.2
      if (z > 1.2) {
        z = 1.2 - (z - 1.2) * 0.8;
      }

      const y = this.getTerrainHeight(x, z);

      dummy.position.set(x, y, z);
      const scaleY = 0.85 + Math.random() * 0.45;
      const scaleXZ = 0.85 + Math.random() * 0.35;

      // Soften grass blade height directly underneath the colossal unburied hands
      // so the ivory palm, wrists, and fingers rest cleanly on top of the turf
      const distToLeftHand = Math.hypot(x - (-1.8), z - (-5.8));
      const distToRightHand = Math.hypot(x - 2.1, z - (-6.8));
      const handDist = Math.min(distToLeftHand, distToRightHand);
      let adjustedScaleY = scaleY;
      if (handDist < 1.6) {
        adjustedScaleY *= (0.25 + 0.75 * (handDist / 1.6));
      }

      dummy.scale.set(scaleXZ, adjustedScaleY, scaleXZ);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.rotation.x = (Math.random() - 0.5) * 0.15;
      dummy.rotation.z = (Math.random() - 0.5) * 0.15;

      dummy.updateMatrix();
      this.grassMesh.setMatrixAt(index++, dummy.matrix);
    }

    this.grassMesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.grassMesh);
  }

  /**
   * Approximate terrain elevation at coordinates (x, z)
   */
  getTerrainHeight(x, z) {
    let h = Math.sin(x * 0.045) * Math.cos(z * 0.045) * 3.2;
    h += Math.sin(x * 0.11 + 1.2) * Math.cos(z * 0.08 - 0.7) * 1.4;
    h += Math.sin(x * 0.02 - z * 0.02) * 2.2;

    const distToSkel = Math.sqrt(x * x + (z + 6.4) * (z + 6.4));
    if (distToSkel < 12.0) {
      const factor = Math.cos((distToSkel / 12.0) * Math.PI * 0.5);
      h -= factor * 1.1;
    }
    return h - 0.4;
  }

  /**
   * Create 3D Wildflowers (Marigolds, Lavender spikes, Daisies, Buttercups)
   */
  createWildflowers() {
    this.flowers = [];

    // Geometries
    // 1. Marigold (Cempasúchil)
    const marigoldPetalGeo = new THREE.SphereGeometry(0.18, 6, 6);
    marigoldPetalGeo.scale(1.2, 0.45, 0.8);
    const marigoldMat1 = new THREE.MeshStandardMaterial({
      color: 0xff7700, // Vibrant deep orange
      roughness: 0.55,
      side: THREE.DoubleSide
    });
    const marigoldMat2 = new THREE.MeshStandardMaterial({
      color: 0xffb300, // Golden yellow
      roughness: 0.5,
      side: THREE.DoubleSide
    });

    // 2. Purple lavender blossom floret geometry
    const lavenderFloretGeo = new THREE.SphereGeometry(0.065, 5, 5);
    lavenderFloretGeo.scale(1.0, 1.4, 1.0);
    const lavenderMat = new THREE.MeshStandardMaterial({
      color: 0x8e24aa, // Deep vibrant Mexican lavender/salvia
      roughness: 0.55
    });
    const lavenderTipMat = new THREE.MeshStandardMaterial({
      color: 0xba68c8, // Lighter violet tip
      roughness: 0.5
    });

    // 3. Daisy
    const daisyGeo = new THREE.CircleGeometry(0.24, 8);
    const daisyMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      side: THREE.DoubleSide
    });

    // Flower placements: dense clusters near skeleton ribs, arms, hands, and across foreground
    const flowerCount = 380;
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x48752c, roughness: 0.7 });
    const stemGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.8, 4);
    stemGeo.translate(0, 0.4, 0);

    for (let i = 0; i < flowerCount; i++) {
      const flowerGroup = new THREE.Group();
      let x, z;

      // Dense concentration around skeleton arms, ribs and mid-meadow
      if (i < 240) {
        // Near skeleton arms, ribs & hands (x: -9 to 9, z: -10 to -3)
        x = (Math.random() - 0.5) * 18.0;
        z = -6.4 + (Math.random() - 0.5) * 7.5;
      } else {
        // Midground meadow (safe distance from camera lens z <= 1.0)
        x = (Math.random() - 0.5) * 32.0;
        z = -2.5 + (Math.random() - 0.5) * 6.5;
      }

      const y = this.getTerrainHeight(x, z);
      flowerGroup.position.set(x, y, z);

      // Add stem
      const stem = new THREE.Mesh(stemGeo, stemMat);
      flowerGroup.add(stem);

      const flowerType = i % 4;
      if (flowerType === 0 || flowerType === 1) {
        // Mexican Marigold: multiple layered petals with rich golden-orange gradient
        const headGroup = new THREE.Group();
        headGroup.position.y = 0.8;
        const mat = flowerType === 0 ? marigoldMat1 : marigoldMat2;
        for (let p = 0; p < 10; p++) {
          const petal = new THREE.Mesh(marigoldPetalGeo, mat);
          const angle = (p / 10) * Math.PI * 2;
          petal.position.set(Math.cos(angle) * 0.14, 0.04 * Math.sin(p * 2), Math.sin(angle) * 0.14);
          petal.rotation.y = angle;
          petal.rotation.x = 0.22;
          headGroup.add(petal);
        }
        // Center crown
        const center = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), marigoldMat1);
        headGroup.add(center);
        flowerGroup.add(headGroup);
      } else if (flowerType === 2) {
        // Tiered organic lavender flower spike with clustered florets
        const headGroup = new THREE.Group();
        headGroup.position.y = 0.45;

        // Thin central spike
        const spikeCore = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.02, 0.7, 4),
          stemMat
        );
        spikeCore.position.y = 0.35;
        headGroup.add(spikeCore);

        // 12 spiral florets climbing up the spike
        for (let fl = 0; fl < 12; fl++) {
          const heightT = fl / 12;
          const floretAngle = fl * 2.4;
          const mat = heightT > 0.75 ? lavenderTipMat : lavenderMat;
          const floret = new THREE.Mesh(lavenderFloretGeo, mat);
          const r = 0.05 * (1.0 - heightT * 0.4);
          floret.position.set(
            Math.cos(floretAngle) * r,
            0.1 + heightT * 0.55,
            Math.sin(floretAngle) * r
          );
          floret.rotation.y = floretAngle;
          floret.rotation.z = (Math.random() - 0.5) * 0.2;
          headGroup.add(floret);
        }
        flowerGroup.add(headGroup);
      } else {
        // Daisy
        const headGroup = new THREE.Group();
        headGroup.position.y = 0.75;
        headGroup.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.3;
        const daisy = new THREE.Mesh(daisyGeo, daisyMat);
        headGroup.add(daisy);
        const center = new THREE.Mesh(
          new THREE.SphereGeometry(0.09, 6, 6),
          new THREE.MeshStandardMaterial({ color: 0xffd54f, roughness: 0.3 })
        );
        headGroup.add(center);
        flowerGroup.add(headGroup);
      }

      const baseScale = 0.6 + Math.random() * 0.6;
      flowerGroup.scale.setScalar(baseScale);
      this.group.add(flowerGroup);

      this.flowers.push({
        group: flowerGroup,
        basePos: new THREE.Vector3(x, y, z),
        baseRotX: flowerGroup.rotation.x,
        baseRotZ: flowerGroup.rotation.z,
        swayPhase: Math.random() * Math.PI * 2,
        flexibility: 0.8 + Math.random() * 0.6
      });
    }
  }

  /**
   * Update cursor position and motion velocity for real-time grass and flower displacement
   */
  setCursor(worldX, worldZ, isActive, velX = 0, velZ = 0) {
    if (this.grassUniforms) {
      this.grassUniforms.uCursorPos.value.set(worldX, worldZ);
      this.grassUniforms.uCursorActive.value = isActive ? 1.0 : 0.0;
      this.grassUniforms.uCursorVel.value.set(velX, velZ);
    }
    this.cursorWorldPos.set(worldX, 0, worldZ);
    this.cursorActive = !!isActive;
  }

  update(delta, elapsed) {
    // 1. Update GPU grass uniforms
    if (this.grassUniforms) {
      this.grassUniforms.uTime.value = elapsed;
      this.grassUniforms.uWindStrength.value = this.windSystem.baseStrength;
      this.grassUniforms.uGustActive.value = this.windSystem.gust.active ? 1.0 : 0.0;
      this.grassUniforms.uGustOrigin.value.copy(this.windSystem.gust.origin);
      this.grassUniforms.uGustTime.value = this.windSystem.gust.time;
      this.grassUniforms.uGustDuration.value = this.windSystem.gust.duration;
      this.grassUniforms.uGustIntensity.value = this.windSystem.gust.intensity;
    }

    // 2. Dynamic Wildflower Swaying with Wind & Cursor Proximity
    const windVec = new THREE.Vector3();
    const flowerCount = this.flowers.length;

    for (let i = 0; i < flowerCount; i++) {
      const fl = this.flowers[i];
      this.windSystem.getWindAt(fl.basePos.x, fl.basePos.z, elapsed + fl.swayPhase, windVec);

      let targetRotZ = fl.baseRotZ - windVec.x * fl.flexibility * 0.6;
      let targetRotX = fl.baseRotX + windVec.z * fl.flexibility * 0.6;

      // Natural parting reaction when cursor passes through flower clusters
      if (this.cursorActive) {
        const cdx = fl.basePos.x - this.cursorWorldPos.x;
        const cdz = fl.basePos.z - this.cursorWorldPos.z;
        const cDist = Math.hypot(cdx, cdz);
        if (cDist < 3.5 && cDist > 0.01) {
          const falloff = 1.0 - (cDist / 3.5);
          const push = falloff * falloff * 0.42 * fl.flexibility;
          targetRotZ -= (cdx / cDist) * push;
          targetRotX += (cdz / cDist) * push;
        }
      }

      fl.group.rotation.z = THREE.MathUtils.lerp(fl.group.rotation.z, targetRotZ, 0.14);
      fl.group.rotation.x = THREE.MathUtils.lerp(fl.group.rotation.x, targetRotX, 0.14);
    }
  }
}
