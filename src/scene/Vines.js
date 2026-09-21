import * as THREE from 'three';

/**
 * Photorealistic Dense Gnarled Briar Vines & 3D Earthen Eruption System:
 * - True Branching Briar Hierarchy: Ancient thick mother trunks splitting into gnarled runners
 *   and curling claw tendrils (40+ interconnected branches, zero parallel comb-teeth)
 * - Organic Knotted Geometry: Deformed tube meshes with longitudinal bark ribs, knots,
 *   and ground-flattened contact
 * - Deep Menacing Weathered Bark: Ancient charred brown-black bark with mossy crevices,
 *   needle briar thorns, and targeted perimeter ember sizzle
 * - 3D Earthen Rock Particles: Instanced faceted stone clods with ballistic gravity and bounce
 * - Natural Seismic Rupture Hubs: Emerging from organic fractured earth craters along the shoulders
 */
export class Vines {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.isActive = false;
    this.growthProgress = 0.0;
    this.eruptionTime = 0.0;
    this.burstEnergy = 0.0;
    this.puddleRadius = 0.0;
    this.puddleCenter = new THREE.Vector2(0.0, -13.5);

    this.vines = [];
    this.thorns = [];
    this.ruptureSpots = [];
    this.debrisParticles = [];
    this.lightParticles = [];

    this.initVinesNetwork();
    this.initRuptureSpots();
    this.initEarthenDebris();
    this.initLightParticles();
  }

  initVinesNetwork() {
    // 1. Photorealistic Dark Weathered Briar Bark Shader
    this.vineMat = new THREE.ShaderMaterial({
      uniforms: {
        uGrowth: { value: 0.0 },
        uTime: { value: 0 },
        uBurstEnergy: { value: 0.0 },
        uPuddleCenter: { value: this.puddleCenter },
        uPuddleRadius: { value: 0.0 }
      },
      vertexShader: `
        uniform float uGrowth;
        uniform float uTime;
        uniform float uBurstEnergy;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPos;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec3 pos = position;

          // Living convulsion tremor as roots violently erupt from the earth
          if (uBurstEnergy > 0.005) {
            float tremor = sin(uTime * 20.0 + uv.x * 32.0) * cos(uTime * 14.0 + uv.y * 18.0);
            float tipGrip = smoothstep(0.0, 0.35, uv.x) * (1.0 - smoothstep(max(0.0, uGrowth - 0.18), uGrowth + 0.02, uv.x));
            pos += normal * (tremor * 0.022 * tipGrip * uBurstEnergy);
          }

          vec4 worldP = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldP.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldP;
        }
      `,
      fragmentShader: `
        uniform float uGrowth;
        uniform float uTime;
        uniform vec2 uPuddleCenter;
        uniform float uPuddleRadius;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPos;

        // Procedural bark grain & fibrous striations
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        void main() {
          if (vUv.x > uGrowth) discard;

          // Longitudinal fibrous bark grain running along the gnarled vine length
          float fiber = sin(vUv.y * 28.0 + sin(vUv.x * 40.0) * 1.5) * 0.5 + 0.5;
          float barkGrain = sin(vUv.x * 60.0 + vUv.y * 12.0) * 0.5 + 0.5;
          float woodPore = hash(floor(vec2(vUv.x * 120.0, vUv.y * 36.0)));

          // Menacing dark ancient briar bark color palette:
          // Deep espresso & charcoal black bark with weathered walnut ridges and lichen undertones
          vec3 charredBase = vec3(0.10, 0.065, 0.038);
          vec3 weatheredBark = vec3(0.25, 0.17, 0.11);
          vec3 sunkenCrevice = vec3(0.04, 0.025, 0.016);
          vec3 driedMoss = vec3(0.16, 0.20, 0.08);

          vec3 color = mix(charredBase, weatheredBark, fiber * 0.70);
          color = mix(color, sunkenCrevice, (1.0 - barkGrain) * 0.48);
          color = mix(color, driedMoss, step(0.70, woodPore) * 0.38);

          // Cold nocturnal moonlight rim light catching gnarly bark ridges
          vec3 moonDir = normalize(vec3(-0.3, 0.75, 0.55));
          float NdotL = max(0.0, dot(vNormal, moonDir));
          float rim = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.6, 0.8))), 2.6);
          color += vec3(0.44, 0.54, 0.68) * (rim * 0.35 + NdotL * 0.22);

          // TARGETED SIZZLE: Only the perimeter contact band where the boiling honey touches the wood
          float distToPuddle = length(vWorldPos.xz - uPuddleCenter);
          float edgeDist = abs(distToPuddle - uPuddleRadius);
          float contactSizzle = smoothstep(0.48, 0.0, edgeDist) * step(distToPuddle, uPuddleRadius + 0.35);

          if (contactSizzle > 0.02) {
            // Sizzling incandescent embers where the boiling liquid chars the contact bark
            float emberFlicker = sin(vWorldPos.x * 24.0 + uTime * 8.0) * cos(vWorldPos.z * 24.0 - uTime * 7.0);
            vec3 darkChar = vec3(0.35, 0.08, 0.01);
            vec3 brightEmber = vec3(1.0, 0.48, 0.04);
            vec3 emberCol = mix(darkChar, brightEmber, clamp(emberFlicker * 0.5 + 0.5, 0.0, 1.0));
            color = mix(color, emberCol, contactSizzle * 0.85);
          }

          // Submerged base under the boiling pool gets a warm underglow
          if (distToPuddle < uPuddleRadius) {
            float depth = (uPuddleRadius - distToPuddle) / max(0.1, uPuddleRadius);
            color = mix(color, vec3(0.35, 0.12, 0.02), depth * 0.35);
          }

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.DoubleSide
    });

    // Thorn Material: Hardened dark wooden thorn with sharp needle tip
    const thornMat = new THREE.MeshStandardMaterial({
      color: 0x140d08,
      roughness: 0.90,
      metalness: 0.05
    });
    const thornGeo = new THREE.ConeGeometry(0.024, 0.09, 5);
    thornGeo.rotateX(Math.PI * 0.5); // Orient cone along +Z

    // 2. Define 8 Distinct Seismic Rupture Craters (Not a uniform line)
    // Staggered naturally along both highway shoulders
    const ruptureHubs = [
      // Left Roadside Craters
      { x: -5.4, z: -9.6, side: -1 },
      { x: -6.8, z: -13.2, side: -1 },
      { x: -5.2, z: -17.0, side: -1 },
      { x: -7.2, z: -21.4, side: -1 },
      // Right Roadside Craters
      { x: 5.5, z: -10.0, side: 1 },
      { x: 6.6, z: -13.8, side: 1 },
      { x: 5.2, z: -17.6, side: 1 },
      { x: 7.0, z: -22.0, side: 1 }
    ];

    this.hubConfigs = ruptureHubs;

    // 3. Generate Interconnected Branching Briar Hierarchy from each Hub
    for (let h = 0; h < ruptureHubs.length; h++) {
      const hub = ruptureHubs[h];

      // A. Mother Ancient Trunk (Heaviest, longest, gnarly serpentine root)
      const mainLength = 10.5 + (h % 3) * 2.2;
      const mainBaseRadius = 0.14 + (h % 2) * 0.025;
      const mainAngle = hub.side < 0
        ? Math.PI * 0.80 + (h * 0.35) % 0.45
        : -Math.PI * 0.20 - (h * 0.35) % 0.45;

      const mainSplinePoints = [];
      const mainPtsCount = 18;
      for (let j = 0; j < mainPtsCount; j++) {
        const t = j / (mainPtsCount - 1);
        const dist = t * mainLength;

        // Organic serpentine meander with sharp kinks and curling
        const curve1 = Math.sin(t * 5.2 + h * 2.1) * (1.4 * t);
        const curve2 = Math.cos(t * 8.5 + h * 1.7) * (0.8 * t);

        const curX = hub.x + Math.cos(mainAngle) * dist + curve1;
        const curZ = hub.z + Math.sin(mainAngle) * dist + curve2;

        // Ground undulation: clings to earth, dips into mud, climbs slightly over rocks
        const wave = Math.sin(t * Math.PI * 4.5 + h * 1.5);
        let curY = 0.02;
        if (j > 0) {
          curY = wave > 0 ? wave * 0.16 : wave * 0.04;
        }

        mainSplinePoints.push(new THREE.Vector3(curX, curY, curZ));
      }

      const mainCurve = new THREE.CatmullRomCurve3(mainSplinePoints);
      this.buildBriarBranch(mainCurve, mainBaseRadius, 0.045, 54, thornGeo, thornMat, hub, 16);

      // B. Secondary Branch 1 (Forks off at 30% of mother trunk)
      const forkPt1 = mainCurve.getPoint(0.30);
      const forkTangent1 = mainCurve.getTangent(0.30);
      const branchAngle1 = Math.atan2(forkTangent1.z, forkTangent1.x) + (hub.side * 0.55);
      const branch1Length = 7.5;
      const branch1Points = [forkPt1.clone()];
      for (let j = 1; j <= 12; j++) {
        const t = j / 12;
        const dist = t * branch1Length;
        const meander = Math.sin(t * 6.0 + h * 3.0) * (0.9 * t);
        const bx = forkPt1.x + Math.cos(branchAngle1) * dist + meander;
        const bz = forkPt1.z + Math.sin(branchAngle1) * dist + Math.cos(t * 5.0) * 0.6 * t;
        const by = Math.max(0.015, Math.sin(t * Math.PI * 3.5 + 0.5) * 0.12);
        branch1Points.push(new THREE.Vector3(bx, by, bz));
      }
      const branch1Curve = new THREE.CatmullRomCurve3(branch1Points);
      this.buildBriarBranch(branch1Curve, 0.08, 0.025, 42, thornGeo, thornMat, hub, 10);

      // C. Secondary Branch 2 (Forks off at 58% of mother trunk, curling opposite way)
      const forkPt2 = mainCurve.getPoint(0.58);
      const forkTangent2 = mainCurve.getTangent(0.58);
      const branchAngle2 = Math.atan2(forkTangent2.z, forkTangent2.x) - (hub.side * 0.65);
      const branch2Length = 6.8;
      const branch2Points = [forkPt2.clone()];
      for (let j = 1; j <= 12; j++) {
        const t = j / 12;
        const dist = t * branch2Length;
        const meander = Math.cos(t * 6.5 + h * 2.0) * (0.8 * t);
        const bx = forkPt2.x + Math.cos(branchAngle2) * dist + meander;
        const bz = forkPt2.z + Math.sin(branchAngle2) * dist + Math.sin(t * 5.5) * 0.5 * t;
        const by = Math.max(0.015, Math.sin(t * Math.PI * 4.0 + 1.2) * 0.10);
        branch2Points.push(new THREE.Vector3(bx, by, bz));
      }
      const branch2Curve = new THREE.CatmullRomCurve3(branch2Points);
      this.buildBriarBranch(branch2Curve, 0.065, 0.022, 38, thornGeo, thornMat, hub, 8);

      // D. Slender Claw Tendril (Crawling along edge toward asphalt)
      const forkPt3 = mainCurve.getPoint(0.18);
      const tendrilAngle = hub.side < 0 ? 0.35 : Math.PI - 0.35; // Reaching toward highway
      const tendrilLength = 5.2;
      const tendrilPoints = [forkPt3.clone()];
      for (let j = 1; j <= 10; j++) {
        const t = j / 10;
        const dist = t * tendrilLength;
        const tx = forkPt3.x + Math.cos(tendrilAngle) * dist + Math.sin(t * 8.0) * 0.45 * t;
        const tz = forkPt3.z + Math.sin(tendrilAngle) * dist + Math.cos(t * 7.0) * 0.35 * t;
        const ty = 0.02 + Math.max(0.0, Math.sin(t * Math.PI * 3.0) * 0.08);
        tendrilPoints.push(new THREE.Vector3(tx, ty, tz));
      }
      const tendrilCurve = new THREE.CatmullRomCurve3(tendrilPoints);
      this.buildBriarBranch(tendrilCurve, 0.048, 0.014, 32, thornGeo, thornMat, hub, 6);

      // E. Forward Creeping Runner (Snaking forward toward camera along roadside)
      const forwardAngle = hub.side < 0 ? 0.85 : 2.29; // Towards +Z foreground
      const forwardLength = 6.2;
      const forwardPoints = [new THREE.Vector3(hub.x, 0.02, hub.z)];
      for (let j = 1; j <= 12; j++) {
        const t = j / 12;
        const dist = t * forwardLength;
        const fx = hub.x + Math.cos(forwardAngle) * dist + Math.sin(t * 7.0 + h) * 0.5 * t;
        const fz = hub.z + Math.sin(forwardAngle) * dist + Math.cos(t * 6.0 + h) * 0.4 * t;
        const fy = 0.02 + Math.max(0.0, Math.sin(t * Math.PI * 3.2 + 0.8) * 0.09);
        forwardPoints.push(new THREE.Vector3(fx, fy, fz));
      }
      const forwardCurve = new THREE.CatmullRomCurve3(forwardPoints);
      this.buildBriarBranch(forwardCurve, 0.075, 0.020, 36, thornGeo, thornMat, hub, 8);
    }
  }

  /**
   * Builds an individual organic briar branch with non-uniform tapering,
   * bark ridges, knot deformation, and sharp thorns.
   */
  buildBriarBranch(curve, startRadius, endRadius, tubularSegments, thornGeo, thornMat, hub, thornCount) {
    const radialSegments = 10;
    const geo = new THREE.TubeGeometry(curve, tubularSegments, startRadius, radialSegments, false);

    // Deform geometry vertices: taper from base to tip, add knots & fibrous bark grooves
    const posAttr = geo.attributes.position;
    const vertex = new THREE.Vector3();
    const curvePoints = curve.getPoints(tubularSegments);

    for (let i = 0; i < posAttr.count; i++) {
      vertex.fromBufferAttribute(posAttr, i);

      // Determine approximate longitudinal progress t in [0, 1]
      const segIndex = Math.floor(i / (radialSegments + 1));
      const t = Math.min(1.0, Math.max(0.0, segIndex / tubularSegments));

      // 1. Sturdy ancient taper from base to slender creeping tip
      const desiredRadius = THREE.MathUtils.lerp(startRadius, endRadius, Math.pow(t, 0.75));
      const radiusScale = desiredRadius / startRadius;

      // Find closest centerline point on the spine curve
      const spinePt = curvePoints[Math.min(segIndex, curvePoints.length - 1)];
      const radialVec = new THREE.Vector3().subVectors(vertex, spinePt);

      // 2. Gnarled organic knots along the vine length
      const knotPhase1 = Math.exp(-Math.pow((t - 0.32) * 16.0, 2.0)) * 0.45;
      const knotPhase2 = Math.exp(-Math.pow((t - 0.68) * 18.0, 2.0)) * 0.35;
      const knotFactor = 1.0 + knotPhase1 + knotPhase2;

      // 3. Bark ridges & non-circular organic cross-section (elliptical & bumpy)
      const angle = Math.atan2(radialVec.z, radialVec.x);
      const barkRidge = 1.0 + Math.sin(angle * 4.0) * 0.12 + Math.cos(angle * 7.0) * 0.08;

      radialVec.multiplyScalar(radiusScale * knotFactor * barkRidge);
      vertex.copy(spinePt).add(radialVec);

      // 4. Ground-flattened contact: prevent floating above the earth
      if (vertex.y < 0.02) {
        vertex.y = 0.015 + (vertex.y * 0.25);
      }

      posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, this.vineMat);
    mesh.visible = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);

    // Place sharp curved thorns along the branch
    const branchThorns = [];
    for (let k = 0; k < thornCount; k++) {
      const u = 0.10 + (k / thornCount) * 0.84;
      const pt = curve.getPoint(u);

      if (pt.y > 0.025) {
        const tangent = curve.getTangent(u).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
        const side = (k % 2 === 0) ? 1 : -1;

        const currentRadius = THREE.MathUtils.lerp(startRadius, endRadius, u);
        const thornPos = pt.clone().add(normal.clone().multiplyScalar(currentRadius * 0.88 * side));
        thornPos.y += 0.02;

        const thornMesh = new THREE.Mesh(thornGeo, thornMat);
        thornMesh.position.copy(thornPos);
        // Angle thorn backwards along the tangent like a briar claw
        const thornTarget = thornPos.clone()
          .add(normal.clone().multiplyScalar(side))
          .add(tangent.clone().multiplyScalar(-0.35));
        thornMesh.lookAt(thornTarget);
        thornMesh.visible = false;
        this.group.add(thornMesh);
        branchThorns.push({ mesh: thornMesh, u });
      }
    }

    this.vines.push({
      mesh,
      geo,
      curve,
      startPos: new THREE.Vector3(hub.x, 0.02, hub.z),
      side: hub.side,
      thorns: branchThorns
    });
  }

  initRuptureSpots() {
    // Rupture decals where vines violently burst through the barren earth
    const spotGeo = new THREE.CircleGeometry(1.15, 24);
    const spotMat = new THREE.ShaderMaterial({
      uniforms: {
        uIntensity: { value: 0.0 },
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uIntensity;
        uniform float uTime;
        varying vec2 vUv;

        void main() {
          float dist = length(vUv - vec2(0.5)) * 2.0;
          if (dist > 1.0) discard;

          float softEdge = pow(clamp(1.0 - dist, 0.0, 1.0), 1.6);
          // Jagged earthen fissures radiating outward from the crater center
          float fissure = 0.70 + 0.30 * sin(dist * 28.0 + uTime * 3.2);
          float spoke = sin(atan(vUv.y - 0.5, vUv.x - 0.5) * 7.0);
          fissure += spoke * 0.18;

          vec3 ruptureColor = vec3(1.0, 0.52, 0.08);
          float alpha = softEdge * fissure * uIntensity * 0.80;

          gl_FragColor = vec4(ruptureColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < this.hubConfigs.length; i++) {
      const hub = this.hubConfigs[i];
      const spotMesh = new THREE.Mesh(spotGeo, spotMat.clone());
      spotMesh.rotation.x = -Math.PI * 0.5;
      spotMesh.position.set(hub.x, 0.045, hub.z);
      spotMesh.visible = false;
      this.group.add(spotMesh);

      const spotLight = new THREE.PointLight(0xff7708, 0.0, 5.5, 2.0);
      spotLight.position.set(hub.x, 0.28, hub.z);
      this.group.add(spotLight);

      this.ruptureSpots.push({
        mesh: spotMesh,
        light: spotLight,
        pos: new THREE.Vector3(hub.x, 0.02, hub.z),
        side: hub.side
      });
    }
  }

  /**
   * 3D Earthen Rock & Soil Clod Eruption Particles:
   * 12-sided faceted stone clods with ballistic gravity and bounce.
   */
  initEarthenDebris() {
    const debrisCount = 128; // 16 chunks per eruption crater
    const rockGeo = new THREE.DodecahedronGeometry(0.14, 0);

    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x1c140e, // Dark damp soil and fractured stone
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true
    });

    this.debrisMesh = new THREE.InstancedMesh(rockGeo, rockMat, debrisCount);
    this.debrisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.debrisMesh.castShadow = true;
    this.debrisMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    for (let i = 0; i < debrisCount; i++) {
      this.debrisMesh.setMatrixAt(i, dummy.matrix);
    }
    this.debrisMesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.debrisMesh);

    this.debrisParticles = [];
    for (let i = 0; i < debrisCount; i++) {
      const spotIdx = i % this.ruptureSpots.length;
      const spot = this.ruptureSpots[spotIdx];

      this.debrisParticles.push({
        active: false,
        hasLanded: false,
        pos: new THREE.Vector3(spot.pos.x, -10.0, spot.pos.z),
        vel: new THREE.Vector3(0, 0, 0),
        rot: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
        rotVel: new THREE.Vector3(0, 0, 0),
        scale: new THREE.Vector3(1, 1, 1),
        groundY: 0.03 + Math.random() * 0.035,
        bounceFactor: 0.22 + Math.random() * 0.12,
        friction: 0.58,
        spot
      });
    }
  }

  initLightParticles() {
    // Sizzling earthen light particles and smoke rising from rupture spots
    const particleCount = 48;
    const particleGeo = new THREE.PlaneGeometry(0.40, 0.40);

    const particleMat = new THREE.ShaderMaterial({
      uniforms: {
        uAlpha: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uAlpha;
        varying vec2 vUv;
        void main() {
          float d = length(vUv - vec2(0.5)) * 2.0;
          if (d > 1.0) discard;
          float glow = pow(1.0 - d, 2.0);
          vec3 col = vec3(1.0, 0.72, 0.28);
          gl_FragColor = vec4(col, glow * uAlpha * 0.85);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < particleCount; i++) {
      const spot = this.ruptureSpots[i % this.ruptureSpots.length];
      const mesh = new THREE.Mesh(particleGeo, particleMat.clone());
      mesh.visible = false;
      this.group.add(mesh);

      this.lightParticles.push({
        mesh,
        basePos: spot.pos.clone(),
        x: spot.pos.x + (Math.random() - 0.5) * 0.4,
        y: 0.06 + Math.random() * 1.5,
        z: spot.pos.z + (Math.random() - 0.5) * 0.4,
        speedY: 0.22 + Math.random() * 0.28,
        swayPhase: Math.random() * Math.PI * 2,
        life: Math.random()
      });
    }
  }

  /**
   * Violently triggers vine eruption, launches 3D rock clods, and initiates breakout kinetics.
   */
  triggerGrowth() {
    if (this.isActive) return;
    this.isActive = true;
    this.growthProgress = 0.0;
    this.eruptionTime = 0.0;
    this.burstEnergy = 1.0;

    for (let i = 0; i < this.vines.length; i++) {
      this.vines[i].mesh.visible = true;
    }
    for (let i = 0; i < this.ruptureSpots.length; i++) {
      this.ruptureSpots[i].mesh.visible = true;
    }
    for (let i = 0; i < this.lightParticles.length; i++) {
      this.lightParticles[i].mesh.visible = true;
    }

    // Launch 3D Rock & Soil Clod Eruption Particles
    for (let i = 0; i < this.debrisParticles.length; i++) {
      const p = this.debrisParticles[i];
      p.active = true;
      p.hasLanded = false;

      p.pos.set(
        p.spot.pos.x + (Math.random() - 0.5) * 0.65,
        0.05,
        p.spot.pos.z + (Math.random() - 0.5) * 0.65
      );

      const vY = 4.5 + Math.random() * 5.2; // High ballistic launch
      const outward = p.spot.side * (1.4 + Math.random() * 2.4);
      const vX = outward + (Math.random() - 0.5) * 1.8;
      const vZ = (Math.random() - 0.5) * 4.5;
      p.vel.set(vX, vY, vZ);

      p.rotVel.set(
        (Math.random() - 0.5) * 26.0,
        (Math.random() - 0.5) * 26.0,
        (Math.random() - 0.5) * 26.0
      );

      const baseScale = 0.60 + Math.random() * 1.1;
      p.scale.set(
        baseScale * (0.7 + Math.random() * 0.6),
        baseScale * (0.6 + Math.random() * 0.6),
        baseScale * (0.7 + Math.random() * 0.6)
      );
    }
  }

  setPuddleState(center, radius) {
    if (center) this.puddleCenter.copy(center);
    this.puddleRadius = radius;
    if (this.vineMat) {
      this.vineMat.uniforms.uPuddleRadius.value = radius;
    }
  }

  getClearanceData() {
    if (!this.isActive) return [];
    const data = [];

    for (let i = 0; i < this.ruptureSpots.length; i++) {
      data.push({
        x: this.ruptureSpots[i].pos.x,
        z: this.ruptureSpots[i].pos.z,
        radius: 4.5,
        strength: Math.min(1.0, this.growthProgress * 1.6)
      });
    }

    return data;
  }

  getClearanceCenters() {
    return this.getClearanceData();
  }

  update(delta, elapsed) {
    if (!this.isActive) return;

    this.eruptionTime += delta;

    // 1. Violent Eerie Vine Breakout (Steep initial surge, followed by steady crawling)
    if (this.eruptionTime < 0.55) {
      const t = this.eruptionTime / 0.55;
      this.growthProgress = Math.pow(t, 0.45) * 0.32;
    } else {
      const postBurstTime = this.eruptionTime - 0.55;
      this.growthProgress = Math.min(1.0, 0.32 + postBurstTime * 0.35);
    }

    this.burstEnergy = Math.max(0.0, 1.0 - this.eruptionTime / 3.2);

    this.vineMat.uniforms.uGrowth.value = this.growthProgress;
    this.vineMat.uniforms.uTime.value = elapsed;
    this.vineMat.uniforms.uBurstEnergy.value = this.burstEnergy;

    // Reveal thorns as branch grows past each thorn's U coordinate
    for (let i = 0; i < this.vines.length; i++) {
      const v = this.vines[i];
      for (let k = 0; k < v.thorns.length; k++) {
        const th = v.thorns[k];
        th.mesh.visible = (this.growthProgress >= th.u);
      }
    }

    // 2. 3D Earthen Rock Particle Physics
    if (this.debrisMesh) {
      const dummy = new THREE.Object3D();
      const gravity = -11.5;

      for (let i = 0; i < this.debrisParticles.length; i++) {
        const p = this.debrisParticles[i];
        if (!p.active) continue;

        if (!p.hasLanded) {
          p.vel.y += gravity * delta;
          p.pos.x += p.vel.x * delta;
          p.pos.y += p.vel.y * delta;
          p.pos.z += p.vel.z * delta;

          p.rot.x += p.rotVel.x * delta;
          p.rot.y += p.rotVel.y * delta;
          p.rot.z += p.rotVel.z * delta;

          if (p.pos.y <= p.groundY) {
            p.pos.y = p.groundY;
            if (Math.abs(p.vel.y) > 0.75) {
              p.vel.y = -p.vel.y * p.bounceFactor;
              p.vel.x *= p.friction;
              p.vel.z *= p.friction;
              p.rotVel.multiplyScalar(0.55);
            } else {
              p.hasLanded = true;
              p.vel.set(0, 0, 0);
              p.rotVel.set(0, 0, 0);
            }
          }
        }

        dummy.position.copy(p.pos);
        dummy.rotation.copy(p.rot);
        dummy.scale.copy(p.scale);
        dummy.updateMatrix();
        this.debrisMesh.setMatrixAt(i, dummy.matrix);
      }
      this.debrisMesh.instanceMatrix.needsUpdate = true;
    }

    // 3. Rupture spot glow & seismic eruption flash
    const spotIntensity = Math.min(1.0, this.growthProgress * 1.5);
    const flash = (this.eruptionTime < 0.40) ? Math.sin((this.eruptionTime / 0.40) * Math.PI) * 1.8 : 0.0;

    for (let i = 0; i < this.ruptureSpots.length; i++) {
      const spot = this.ruptureSpots[i];
      spot.mesh.material.uniforms.uIntensity.value = Math.min(1.0, spotIntensity + flash * 0.4);
      spot.mesh.material.uniforms.uTime.value = elapsed;
      if (spot.light) {
        spot.light.intensity = spotIntensity * 0.40 + flash;
      }
    }

    // 4. Rising light particles
    for (let i = 0; i < this.lightParticles.length; i++) {
      const p = this.lightParticles[i];
      p.life += delta * 0.45;
      if (p.life > 1.0) {
        p.life = 0.0;
        p.y = 0.05;
        p.x = p.basePos.x + (Math.random() - 0.5) * 0.35;
        p.z = p.basePos.z + (Math.random() - 0.5) * 0.35;
      }

      p.y += p.speedY * delta;
      p.mesh.position.set(
        p.x + Math.sin(elapsed * 2.5 + p.swayPhase) * 0.12,
        p.y,
        p.z + Math.cos(elapsed * 2.2 + p.swayPhase) * 0.10
      );

      const alpha = Math.sin(p.life * Math.PI) * spotIntensity;
      p.mesh.material.uniforms.uAlpha.value = alpha;
    }
  }
}
