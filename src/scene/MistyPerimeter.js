import * as THREE from 'three';

/**
 * Dark Misty Perimeter, Flowing Particle Physics & Distant Horror Cabins:
 * - Visually stunning, rich volumetric mist with nocturnal color hues (witching violet, spectral indigo, eerie teal)
 * - Real particle physics simulation for swirling, billowing ground fog with curl turbulence
 * - Physical Mist Clearance: Glowing vine breakout spots & rising light particles physically
 *   part and push away the mist, creating pockets of crisp clarity
 * - Multiple weathered horror cabins staged along both sides of the vast highway (Z = -25 to -185)
 *   with warm flickering amber windows and chimney silhouettes shrouded in rolling fog
 * - Deep nocturnal color lighting scattering through the mist layers
 */
export class MistyPerimeter {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.fogPlanes = [];
    this.windowMats = [];

    this.initGroundFog();
    this.initDistantHouses();
  }

  /**
   * 1. Thick, Slow-Settling White/Grey Ground Fog Decks
   */
  initGroundFog() {
    // Noise vertex & fragment shaders for continuous, heavy rolling ground fog
    const fogShader = {
      uniforms: {
        uTime: { value: 0 },
        uClearancePos1: { value: new THREE.Vector3(0, 0, -13.5) },
        uClearanceRadius1: { value: 0.0 },
        uClearancePos2: { value: new THREE.Vector3(-6, 0, -13.5) },
        uClearanceRadius2: { value: 0.0 },
        uClearancePos3: { value: new THREE.Vector3(6, 0, -13.5) },
        uClearanceRadius3: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;

        void main() {
          vUv = uv;
          vec4 worldP = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldP.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldP;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uClearancePos1;
        uniform float uClearanceRadius1;
        uniform vec3 uClearancePos2;
        uniform float uClearanceRadius2;
        uniform vec3 uClearancePos3;
        uniform float uClearanceRadius3;

        varying vec2 vUv;
        varying vec3 vWorldPos;

        // 2D Simplex / Perlin noise for thick, slow rolling fog
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                             -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy));
          vec2 x0 = v -   i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m;
          m = m*m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
          vec3 g;
          g.x  = a0.x  * x0.x  + h.x  * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        // Multi-octave FBM for organic thick cloud layers
        float fbm(vec2 p) {
          float v = 0.0;
          v += 0.52 * snoise(p);
          v += 0.28 * snoise(p * 2.05 + vec2(1.2, 3.4));
          v += 0.14 * snoise(p * 4.10 + vec2(5.1, 2.3));
          v += 0.06 * snoise(p * 8.20 + vec2(2.8, 7.1));
          return v * 0.5 + 0.5;
        }

        void main() {
          // Slow, heavy, viscous fog drift - settling naturally
          float slowTime = uTime * 0.014;
          vec2 coord1 = (vWorldPos.xz * 0.024) + vec2(slowTime * 0.35, slowTime * 0.15);
          vec2 coord2 = (vWorldPos.xz * 0.048) - vec2(slowTime * 0.20, slowTime * 0.28);

          float n1 = fbm(coord1);
          float n2 = fbm(coord2);
          float fogDensity = clamp(n1 * 0.65 + n2 * 0.45, 0.0, 1.0);

          // Soft horizontal plane edge falloff
          float edgeMask = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x) *
                           smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.82, vUv.y);

          // Authentic nocturnal white and grey fog color palette:
          // Cool white fog crown, silver-grey mid, and deep slate-grey grounding tone
          vec3 darkSlate = vec3(0.42, 0.46, 0.52);
          vec3 silverGrey = vec3(0.72, 0.76, 0.82);
          vec3 whiteFog = vec3(0.90, 0.93, 0.96);

          vec3 fogColor = mix(darkSlate, silverGrey, fogDensity);
          fogColor = mix(fogColor, whiteFog, pow(fogDensity, 2.2) * 0.70);

          // Soft overall alpha
          float alpha = fogDensity * edgeMask * 0.60;

          // Road avoidance: keep center highway ribbon (X in [-4.6, +4.6]) somewhat clearer
          // so the asphalt road is visibly stretching straight through the fog
          float roadDist = abs(vWorldPos.x);
          float roadClarity = smoothstep(2.2, 6.2, roadDist);
          alpha *= mix(0.30, 1.0, roadClarity);

          // Mist Clearance Physics around hot boiling orange liquid and glowing vine breakout spots:
          if (uClearanceRadius1 > 0.1) {
            float d1 = length(vWorldPos.xz - uClearancePos1.xz);
            if (d1 < uClearanceRadius1) {
              alpha *= smoothstep(uClearanceRadius1 * 0.25, uClearanceRadius1, d1);
            }
          }
          if (uClearanceRadius2 > 0.1) {
            float d2 = length(vWorldPos.xz - uClearancePos2.xz);
            if (d2 < uClearanceRadius2) {
              alpha *= smoothstep(uClearanceRadius2 * 0.25, uClearanceRadius2, d2);
            }
          }
          if (uClearanceRadius3 > 0.1) {
            float d3 = length(vWorldPos.xz - uClearancePos3.xz);
            if (d3 < uClearanceRadius3) {
              alpha *= smoothstep(uClearanceRadius3 * 0.25, uClearanceRadius3, d3);
            }
          }

          if (alpha < 0.008) discard;
          gl_FragColor = vec4(fogColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    };

    // Staggered horizontal fog decks hugging the earth from foreground to horizon
    const deckPlacements = [
      { x: 0, y: 0.26, z: -25, w: 90, l: 65 },
      { x: 0, y: 0.52, z: -80, w: 125, l: 80 },
      { x: 0, y: 0.82, z: -145, w: 165, l: 95 },
      { x: 0, y: 1.40, z: -210, w: 200, l: 90 }
    ];

    for (const d of deckPlacements) {
      const geo = new THREE.PlaneGeometry(d.w, d.l, 32, 32);
      const mat = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(fogShader.uniforms),
        vertexShader: fogShader.vertexShader,
        fragmentShader: fogShader.fragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI * 0.5;
      mesh.position.set(d.x, d.y, d.z);
      this.group.add(mesh);

      this.fogPlanes.push({ mesh, mat });
    }

    // Atmospheric Volumetric Air Mist Shrouds:
    // Floating vertical mist curtains spanning the air volume (Y = 2.0 to 9.0, Z = -25 to -135)
    // so looking down the highway feels deeply atmospheric, damp, and misty.
    const airMistPlacements = [
      { x: -18, y: 4.5, z: -32, w: 42, h: 9.5, rotY: 0.25 },
      { x: 20, y: 5.0, z: -38, w: 46, h: 10.0, rotY: -0.22 },
      { x: -28, y: 5.8, z: -68, w: 58, h: 12.0, rotY: 0.18 },
      { x: 30, y: 6.2, z: -76, w: 62, h: 13.0, rotY: -0.15 },
      { x: -38, y: 7.2, z: -115, w: 78, h: 15.0, rotY: 0.12 },
      { x: 42, y: 7.6, z: -125, w: 82, h: 16.0, rotY: -0.10 }
    ];

    for (const m of airMistPlacements) {
      const geo = new THREE.PlaneGeometry(m.w, m.h, 16, 16);
      const mat = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(fogShader.uniforms),
        vertexShader: fogShader.vertexShader,
        fragmentShader: fogShader.fragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(m.x, m.y, m.z);
      mesh.rotation.y = m.rotY;
      this.group.add(mesh);
      this.fogPlanes.push({ mesh, mat });
    }
  }

  /**
   * 2. Exactly 2 Weathered Horror Cabins Staged Far in the Background
   */
  initDistantHouses() {
    // 2 Cabins flanking the distant highway:
    // Placed far down the road so they frame the horizon without distracting
    const cabinConfigs = [
      { x: -36.0, y: 0.0, z: -140.0, width: 14.0, height: 11.0, rotY: 0.32, lightCol: 0xffa030 },
      { x: 38.0, y: 0.0, z: -155.0, width: 15.0, height: 12.0, rotY: -0.28, lightCol: 0xff9020 }
    ];

    for (const cfg of cabinConfigs) {
      this.createSubtleCabin(cfg);
    }
  }

  createSubtleCabin(cfg) {
    const houseGroup = new THREE.Group();
    houseGroup.position.set(cfg.x, cfg.y, cfg.z);
    houseGroup.rotation.y = cfg.rotY;

    // Dark weathered timber cabin body silhouette
    const bodyHeight = cfg.height * 0.62;
    const bodyGeo = new THREE.BoxGeometry(cfg.width, bodyHeight, 8.5);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x0e1118),
      roughness: 0.95,
      metalness: 0.02
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = bodyHeight * 0.5;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    houseGroup.add(bodyMesh);

    // Weathered steep pitched roof with gable overhang
    const roofHeight = cfg.height * 0.58;
    const roofGeo = new THREE.ConeGeometry(cfg.width * 0.72, roofHeight, 4);
    const roofMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x0a0c12),
      roughness: 0.92,
      metalness: 0.02
    });
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roofMesh.position.y = bodyHeight + roofHeight * 0.45;
    roofMesh.rotation.y = Math.PI * 0.25;
    roofMesh.castShadow = true;
    houseGroup.add(roofMesh);

    // Crooked stone chimney
    const chimneyGeo = new THREE.BoxGeometry(1.6, 4.0, 1.6);
    const chimneyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x141720),
      roughness: 0.98
    });
    const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
    chimney.position.set(cfg.width * 0.28, bodyHeight + roofHeight * 0.65, -0.6);
    chimney.rotation.z = -0.07;
    houseGroup.add(chimney);

    // Faint subtle glowing amber windows with muntins
    const windowGeo = new THREE.PlaneGeometry(2.2, 2.8);
    const windowMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(cfg.lightCol) },
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
        uniform vec3 uColor;
        uniform float uTime;
        varying vec2 vUv;

        void main() {
          float frameX = step(0.08, vUv.x) * step(vUv.x, 0.92);
          float frameY = step(0.08, vUv.y) * step(vUv.y, 0.92);
          float crossX = 1.0 - smoothstep(0.0, 0.06, abs(vUv.x - 0.5));
          float crossY = 1.0 - smoothstep(0.0, 0.06, abs(vUv.y - 0.5));
          float glass = frameX * frameY * (1.0 - crossX) * (1.0 - crossY);

          float flicker = 0.82 + 0.18 * sin(uTime * 3.5 + sin(uTime * 9.0));
          float glow = glass * flicker * 0.65;

          if (glow < 0.01) discard;
          gl_FragColor = vec4(uColor * glow, glow);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.windowMats.push(windowMat);

    const win1 = new THREE.Mesh(windowGeo, windowMat);
    win1.position.set(-cfg.width * 0.24, bodyHeight * 0.55, 4.3);
    houseGroup.add(win1);

    const win2 = new THREE.Mesh(windowGeo, windowMat.clone());
    win2.position.set(cfg.width * 0.24, bodyHeight * 0.55, 4.3);
    houseGroup.add(win2);

    this.group.add(houseGroup);
  }

  update(delta, elapsed, clearanceData = []) {
    // 1. Update Ground Fog Decks & Mist Clearance Uniforms
    for (let i = 0; i < this.fogPlanes.length; i++) {
      const p = this.fogPlanes[i];
      p.mat.uniforms.uTime.value = elapsed;

      // Apply clearance zones from hot boiling liquid and vines
      if (clearanceData && clearanceData.length > 0) {
        if (clearanceData[0]) {
          p.mat.uniforms.uClearancePos1.value.set(clearanceData[0].x, 0, clearanceData[0].z);
          p.mat.uniforms.uClearanceRadius1.value = clearanceData[0].radius * (clearanceData[0].strength || 1.0);
        }
        if (clearanceData[1]) {
          p.mat.uniforms.uClearancePos2.value.set(clearanceData[1].x, 0, clearanceData[1].z);
          p.mat.uniforms.uClearanceRadius2.value = clearanceData[1].radius * (clearanceData[1].strength || 1.0);
        }
        if (clearanceData[2]) {
          p.mat.uniforms.uClearancePos3.value.set(clearanceData[2].x, 0, clearanceData[2].z);
          p.mat.uniforms.uClearanceRadius3.value = clearanceData[2].radius * (clearanceData[2].strength || 1.0);
        }
      }
    }

    // 2. Update Window Candlelight Flicker
    for (let i = 0; i < this.windowMats.length; i++) {
      this.windowMats[i].uniforms.uTime.value = elapsed;
    }
  }
}
