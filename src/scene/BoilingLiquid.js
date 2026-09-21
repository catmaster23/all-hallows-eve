import * as THREE from 'three';

/**
 * Honey-Thick Boiling Toxic Orange Liquid & Hot Steam Simulation:
 * - Viscous, slow, thick pouring streams oozing out of BOTH carved pumpkin eyes
 * - Dynamically stretches and pours as the pumpkin levitates to user eye level
 * - Spreading incandescent boiling puddle on the asphalt road with organic ripples
 * - Detects when the boiling puddle spills onto the barren ground (|X| >= 4.8)
 *   to trigger bright sprouting vines from the earth
 * - Delicate wisps of hot steam/smoke rising from the boiling liquid on the asphalt
 */
export class BoilingLiquid {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.isActive = false;
    this.progress = 0.0;
    this.pumpkinRef = null;
    this.hasTriggeredVines = false;
    this.onReachBarrenGroundCallback = null;

    this.initDualStreams();
    this.initLiquidPuddle();
    this.initHotSteam();
  }

  initDualStreams() {
    // Shared honey-liquid shader material for both eye streams
    this.streamMat = new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0.0 },
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        uniform float uTime;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);

          // Viscous honey stream tapering: wide at eye, thin in mid-air stretch, slightly spreading at splash base
          float taper = mix(1.25, 0.58, smoothstep(0.0, 0.38, uv.x));
          taper = mix(taper, 1.05, smoothstep(0.82, 1.0, uv.x));

          // Traveling viscous honey bulges / drips flowing downward
          float dripWave = sin(uv.x * 26.0 - uTime * 7.0) * 0.18 * smoothstep(0.08, 0.92, uv.x);
          // Subtle natural fluid snake/sway as honey cascades down
          float fluidSway = sin(uv.x * 12.0 - uTime * 5.0) * 0.015 * smoothstep(0.12, 0.88, uv.x);

          vec3 pos = position + normal * ((taper - 1.0 + dripWave) * 0.036);
          pos.x += fluidSway;
          pos.z += sin(uv.x * 10.0 - uTime * 4.5) * 0.012 * smoothstep(0.12, 0.88, uv.x);

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uProgress;
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vNormal;

        void main() {
          // Flow progress along the tube length
          if (vUv.x > uProgress) discard;

          // Boiling fluid turbulence & viscous bubbles
          float bubble = sin(vUv.x * 32.0 - uTime * 7.5) * cos(vUv.y * 16.0 + uTime * 5.0);
          float hotCore = smoothstep(0.35, 0.90, bubble * 0.5 + 0.5);

          // Authentic rich honey & molasses color grading:
          // Deep amber syrup body with vibrant boiling orange core
          vec3 deepMolasses = vec3(0.52, 0.14, 0.01);
          vec3 goldenHoney = vec3(1.0, 0.45, 0.02); // Rich vibrant orange
          vec3 boilingCore = vec3(1.0, 0.82, 0.16);
          vec3 color = mix(deepMolasses, goldenHoney, 0.78);
          color = mix(color, boilingCore, hotCore * 0.48);

          // Wet syrup Fresnel specular sheen along edge
          float rim = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.4, 0.9))), 2.4);
          color += vec3(1.0, 0.94, 0.78) * rim * 0.55;

          gl_FragColor = vec4(color, 0.95);
        }
      `,
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide
    });

    // Initial default curves centered around pumpkin at Z = -13.5
    this.leftCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.25, 0.80, -12.9),
      new THREE.Vector3(-0.30, 0.45, -13.0),
      new THREE.Vector3(-0.32, 0.15, -13.1),
      new THREE.Vector3(-0.34, 0.025, -13.25)
    ]);
    this.rightCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.25, 0.80, -12.9),
      new THREE.Vector3(0.30, 0.45, -13.0),
      new THREE.Vector3(0.32, 0.15, -13.1),
      new THREE.Vector3(0.34, 0.025, -13.25)
    ]);

    this.leftGeo = new THREE.TubeGeometry(this.leftCurve, 36, 0.038, 12, false);
    this.rightGeo = new THREE.TubeGeometry(this.rightCurve, 36, 0.038, 12, false);

    this.leftStreamMesh = new THREE.Mesh(this.leftGeo, this.streamMat);
    this.rightStreamMesh = new THREE.Mesh(this.rightGeo, this.streamMat);

    this.leftStreamMesh.visible = false;
    this.rightStreamMesh.visible = false;

    this.group.add(this.leftStreamMesh);
    this.group.add(this.rightStreamMesh);
  }

  initLiquidPuddle() {
    // Dedicated plane geometry centered right under the pumpkin at Z = -13.0
    // Width 38.0 covers road and expands wide across the barren ground; Length 24.0
    const puddleGeo = new THREE.PlaneGeometry(38.0, 24.0, 96, 64);

    this.puddleMat = new THREE.ShaderMaterial({
      uniforms: {
        uRadius: { value: 0.0 },
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
        uniform float uRadius;
        uniform float uTime;
        varying vec2 vUv;

        void main() {
          // Centered on the pumpkin base
          vec2 d = (vUv - 0.5) * vec2(38.0, 24.0);
          // Anisotropic pool: spreads across road (X) and contained along highway (Z)
          float dist = length(vec2(d.x, d.y * 1.6));

          // Organic viscous thick honey lobed edge
          float angle = atan(d.y, d.x);
          float organicWobble = sin(angle * 6.0) * 0.08 + cos(angle * 10.0 + uTime * 0.4) * 0.04;
          float effectiveRadius = uRadius * (1.0 + organicWobble);

          if (dist > effectiveRadius || uRadius <= 0.05) discard;

          // Thick rounded viscous honey meniscus edge (surface tension)
          float edgeFactor = smoothstep(effectiveRadius, effectiveRadius - 0.35, dist);

          // Boiling bubbles and concentric convection ripples
          float slowTime = uTime * 2.2;
          float ripple1 = sin(dist * 10.0 - slowTime + sin(angle * 5.0));
          float ripple2 = cos(vUv.x * 36.0 + vUv.y * 36.0 - slowTime * 1.1);
          float boilingCore = clamp(ripple1 * ripple2, 0.0, 1.0);

          // Rich, highly visible vibrant boiling orange honey tones
          vec3 deepMolasses = vec3(0.42, 0.10, 0.01);
          vec3 richOrangeHoney = vec3(1.0, 0.36, 0.02); // Deep rich pumpkin honey orange
          vec3 boilingIncandescent = vec3(1.0, 0.58, 0.05); // Fiery orange core

          vec3 puddleColor = mix(deepMolasses, richOrangeHoney, edgeFactor * 0.85);
          puddleColor = mix(puddleColor, boilingIncandescent, boilingCore * 0.40);

          // Realistic Fresnel specular highlight on boiling ripples
          vec3 n = normalize(vec3(ripple1 * 0.12, 1.0, ripple2 * 0.12));
          vec3 viewDir = normalize(vec3(-d.x, 1.78, 14.0));
          float fresnel = pow(1.0 - max(0.0, dot(n, viewDir)), 3.2);
          puddleColor += vec3(1.0, 0.94, 0.78) * (fresnel * 0.35 + pow(edgeFactor, 4.0) * 0.22);

          // Translucent honey: asphalt road texture shows through underneath
          float alpha = clamp(edgeFactor * 0.88, 0.0, 0.88);

          gl_FragColor = vec4(puddleColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.puddleMesh = new THREE.Mesh(puddleGeo, this.puddleMat);
    this.puddleMesh.rotation.x = -Math.PI * 0.5;
    this.puddleMesh.position.set(0.0, 0.025, -13.0);
    this.puddleMesh.visible = false;
    this.group.add(this.puddleMesh);

    // Warm puddle light reflecting onto the asphalt
    this.puddleLight = new THREE.PointLight(0xff6600, 0, 12.0, 2.0);
    this.puddleLight.position.set(0.0, 0.35, -13.0);
    this.group.add(this.puddleLight);
  }

  initHotSteam() {
    // Subtle wisps of hot steam/smoke rising from the boiling liquid on the asphalt
    const steamCount = 24;
    this.steamParticles = [];

    const steamGeo = new THREE.PlaneGeometry(0.55, 0.55);

    for (let i = 0; i < steamCount; i++) {
      const steamMat = new THREE.ShaderMaterial({
        uniforms: {
          uAlpha: { value: 0.0 },
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
          uniform float uAlpha;
          uniform float uTime;
          varying vec2 vUv;
          void main() {
            float dist = length(vUv - vec2(0.5)) * 2.0;
            if (dist > 1.0) discard;
            float vaporSoft = pow(clamp(1.0 - dist, 0.0, 1.0), 2.2);
            float turb = 0.82 + 0.18 * sin(vUv.x * 14.0 + uTime * 3.5);
            gl_FragColor = vec4(vec3(0.88, 0.90, 0.95), vaporSoft * uAlpha * turb * 0.28);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(steamGeo, steamMat);
      mesh.visible = false;
      this.group.add(mesh);

      this.steamParticles.push({
        mesh,
        mat: steamMat,
        baseX: (Math.random() - 0.5) * 1.5,
        baseZ: -13.0 + (Math.random() - 0.5) * 1.5,
        y: 0.05 + Math.random() * 0.4,
        speedY: 0.18 + Math.random() * 0.22,
        scale: 0.7 + Math.random() * 0.5,
        life: Math.random()
      });
    }
  }

  activateDual(leftEyePos, rightEyePos, pumpkinRef) {
    if (this.isActive) return;
    this.isActive = true;
    this.progress = 0.0;
    this.pumpkinRef = pumpkinRef;
    this.hasTriggeredVines = false;

    this.leftStreamMesh.visible = true;
    this.rightStreamMesh.visible = true;
    this.puddleMesh.visible = true;

    this.updateStreamCurves(leftEyePos, rightEyePos);
  }

  updateStreamCurves(leftEyePos, rightEyePos) {
    if (!leftEyePos || !rightEyePos) return;

    // Ground landing points on the asphalt in front of the pumpkin base (Z = -12.55)
    const leftGround = new THREE.Vector3(-0.24, 0.025, -12.55);
    const rightGround = new THREE.Vector3(0.24, 0.025, -12.55);

    // Left Stream: cascading forward-down from eye across pumpkin front
    const pL0 = leftEyePos.clone();
    const pL1 = new THREE.Vector3(
      leftEyePos.x * 1.05,
      leftEyePos.y * 0.65 + leftGround.y * 0.35,
      leftEyePos.z + 0.18
    );
    const pL2 = new THREE.Vector3(
      leftEyePos.x * 0.85 + leftGround.x * 0.15,
      leftEyePos.y * 0.25 + leftGround.y * 0.75,
      leftEyePos.z + 0.32
    );
    const pL3 = leftGround.clone();

    this.leftCurve = new THREE.CatmullRomCurve3([pL0, pL1, pL2, pL3]);
    this.leftGeo.dispose();
    this.leftGeo = new THREE.TubeGeometry(this.leftCurve, 36, 0.038, 12, false);
    this.leftStreamMesh.geometry = this.leftGeo;

    // Right Stream: cascading forward-down from eye across pumpkin front
    const pR0 = rightEyePos.clone();
    const pR1 = new THREE.Vector3(
      rightEyePos.x * 1.05,
      rightEyePos.y * 0.65 + rightGround.y * 0.35,
      rightEyePos.z + 0.18
    );
    const pR2 = new THREE.Vector3(
      rightEyePos.x * 0.85 + rightGround.x * 0.15,
      rightEyePos.y * 0.25 + rightGround.y * 0.75,
      rightEyePos.z + 0.32
    );
    const pR3 = rightGround.clone();

    this.rightCurve = new THREE.CatmullRomCurve3([pR0, pR1, pR2, pR3]);
    this.rightGeo.dispose();
    this.rightGeo = new THREE.TubeGeometry(this.rightCurve, 36, 0.038, 12, false);
    this.rightStreamMesh.geometry = this.rightGeo;
  }

  /**
   * Clearance data reporting so MistyPerimeter can part the thick ground fog
   * over the spreading hot boiling liquid.
   */
  getClearanceData() {
    if (!this.isActive || !this.puddleMat) return [];
    const r = this.puddleMat.uniforms.uRadius.value;
    if (r <= 0.15) return [];
    return [{
      x: 0.0,
      z: -13.0,
      radius: r * 1.4,
      strength: 0.95
    }];
  }

  update(delta, elapsed) {
    if (!this.isActive) return;

    // 1. Dynamic honey-thick pouring rate
    this.progress += delta * 0.52;

    // Dynamic stream stretch while pumpkin levitates
    if (this.pumpkinRef) {
      const eyePositions = this.pumpkinRef.getEyeWorldPositions();
      this.updateStreamCurves(eyePositions.leftEye, eyePositions.rightEye);
    }

    // 2. Stream flow progress down the tubes
    const streamProgress = Math.min(1.0, this.progress * 2.2);
    this.streamMat.uniforms.uProgress.value = streamProgress;
    this.streamMat.uniforms.uTime.value = elapsed;

    // 3. Expanding Boiling Honey Puddle (reaches barren ground at |X| >= 4.4 and keeps expanding continuously)
    if (this.progress > 0.25) {
      const deltaT = Math.max(0.0, this.progress - 0.25);
      let puddleRadius;
      if (deltaT < 1.15) {
        puddleRadius = Math.pow(deltaT, 1.1) * 3.8;
      } else {
        // Continuous steady expansion across road shoulders and barren landscape
        puddleRadius = 4.4 + (deltaT - 1.15) * 0.42;
      }
      this.puddleMat.uniforms.uRadius.value = puddleRadius;
      this.puddleMat.uniforms.uTime.value = elapsed;

      // Soft warm amber glow light accents road and ground
      this.puddleLight.intensity = Math.min(1.8, 0.6 + puddleRadius * 0.20);
      this.puddleLight.distance = Math.min(26.0, 12.0 + puddleRadius * 1.5);

      // 4. Trigger Levitation, Vines & Bat Swarm when liquid reaches the road shoulders (|X| >= 4.4)
      if (puddleRadius >= 4.4 && !this.hasTriggeredVines) {
        this.hasTriggeredVines = true;

        // Pumpkin floats to 5'10" eye level only when liquid reaches the edge
        if (this.pumpkinRef) {
          this.pumpkinRef.triggerLevitation();
        }

        // Sprout dense ground-creeping vines from the barren earth
        if (this.onReachBarrenGroundCallback) {
          this.onReachBarrenGroundCallback();
        }

        // Launch bats swooping across the letters
        if (this.pumpkinRef && this.pumpkinRef.bats) {
          this.pumpkinRef.bats.triggerHeroTextSwarm();
        }
      }
    }

    // 5. Hot Steam Wisps Rising from Puddle
    if (this.progress > 0.45) {
      const activeRadius = this.puddleMat.uniforms.uRadius.value;

      for (let i = 0; i < this.steamParticles.length; i++) {
        const p = this.steamParticles[i];
        p.mesh.visible = true;

        p.life += delta * 0.42;
        if (p.life > 1.0) {
          p.life = 0;
          p.y = 0.06;
          // Spawn across the active puddle surface centered at Z = -13.5
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * Math.min(activeRadius, 16.0);
          p.baseX = Math.cos(angle) * r;
          p.baseZ = -13.5 + Math.sin(angle) * (r * 0.45);
        }

        p.y += p.speedY * delta;
        p.mesh.position.set(
          p.baseX + Math.sin(elapsed * 2.2 + i) * 0.10,
          p.y,
          p.baseZ + Math.cos(elapsed * 1.9 + i) * 0.08
        );

        // Soft bell-curve opacity
        const alpha = Math.sin(p.life * Math.PI) * 0.32;
        p.mat.uniforms.uAlpha.value = alpha;
        p.mat.uniforms.uTime.value = elapsed;

        const currentScale = p.scale * (1.0 + p.life * 1.6);
        p.mesh.scale.set(currentScale, currentScale, currentScale);
      }
    }
  }
}
