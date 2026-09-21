import * as THREE from 'three';
import { Moon } from './Moon.js';
import { Bats } from './Bats.js';
import { Clouds } from './Clouds.js';
import { Road } from './Road.js';
import { MistyPerimeter } from './MistyPerimeter.js';
import { HeroText } from './HeroText.js';
import { Pumpkin } from './Pumpkin.js';
import { BoilingLiquid } from './BoilingLiquid.js';
import { Vines } from './Vines.js';
import { AfterworldScene } from './AfterworldScene.js';

/**
 * 3D Halloween Experience Orchestrator:
 * - Section 1: Celestial Moon in the night sky with NASA textures, volumetric clouds, bats, and cello cycle
 * - Descent Transition: Camera plunges through volumetric cloud layers as user scrolls
 * - Section 2: Dark empty asphalt road, giant bold white "All Hallows' Eve" hero text,
 *   carved glowing fire pumpkin, dark misty perimeter with distant horror cabins,
 *   and interactive click trigger pouring honey-thick boiling liquid, sprouting vines, & launching bat swarm.
 */
export class RoadScene {
  constructor(canvas) {
    this.canvas = canvas;

    // Mouse tracking for natural first-person head sway / parallax
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.mouseNDC = new THREE.Vector2(-999, -999);
    this.raycaster = new THREE.Raycaster();

    // Section Transition & Progression State (Screen 1 = Celestial Moon, Screen 2 = Empty Road & Pumpkin)
    this.currentScreen = 1;
    this.targetScreen = 1;
    this.isTransitioning = false;
    this.transitionTime = 0.0;
    this.transitionDuration = 1.4; // Fast, dynamic 1.4-second default transition
    this.swappedScreen = false;

    // Reset browser scroll to top on narrative experience entry
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
    }

    this.initRenderer();
    this.initCamera();
    this.initScene();
    this.initStars();

    // 1. Instantiate Section 1 Celestial Objects
    this.moon = new Moon(this.scene);
    this.clouds = new Clouds(this.scene, this.moon.position);
    this.bats = new Bats(this.scene, this.moon.position);

    // 2. Instantiate Volumetric Cloud Wipe Transition (Screen 1 <-> Screen 2)
    this.initCloudWipeTransition();

    // 3. Instantiate Section 2 Road Scene Objects
    this.road = new Road(this.scene);
    this.mistyPerimeter = new MistyPerimeter(this.scene);
    this.heroText = new HeroText(this.scene);
    this.boilingLiquid = new BoilingLiquid(this.scene);
    this.pumpkin = new Pumpkin(this.scene, this.boilingLiquid, this.bats);
    this.vines = new Vines(this.scene);

    // Trigger vine growth when boiling honey liquid spills onto barren ground
    this.boilingLiquid.onReachBarrenGroundCallback = () => {
      this.vines.triggerGrowth();
    };

    // 4. Instantiate Section 3 Afterworld Scene
    this.afterworldScene = new AfterworldScene(this.scene, this.camera, this.renderer);
    this.afterworldScene.hide(); // Hidden initially until Veil transition midpoint

    // Road scene group for visibility / LOD management
    this.roadSceneGroup = new THREE.Group();
    this.roadSceneGroup.add(this.road.group);
    this.roadSceneGroup.add(this.mistyPerimeter.group);
    this.roadSceneGroup.add(this.heroText.group);
    this.roadSceneGroup.add(this.pumpkin.group);
    this.roadSceneGroup.add(this.boilingLiquid.group);
    this.roadSceneGroup.add(this.vines.group);

    // Dedicated Natural Nocturnal Lighting for Section 2:
    // Cold directional moonlight (0xa5c2e8) angled from high side-rear and ambient nocturnal fill (0x182236)
    // Carefully balanced so the asphalt aggregates, lane lines, bumpy barren earth, and concrete text
    // are naturally illuminated with realistic depth, shadows, and visibility without blowout.
    this.roadMoonlight = new THREE.DirectionalLight(0xa5c2e8, 1.15);
    this.roadMoonlight.position.set(-18.0, 32.0, 10.0);
    this.roadMoonlight.target.position.set(0, 0, -45.0);
    this.roadMoonlight.castShadow = true;
    this.roadMoonlight.shadow.mapSize.width = 2048;
    this.roadMoonlight.shadow.mapSize.height = 2048;
    this.roadMoonlight.shadow.camera.near = 1.0;
    this.roadMoonlight.shadow.camera.far = 160.0;
    this.roadMoonlight.shadow.camera.left = -35.0;
    this.roadMoonlight.shadow.camera.right = 35.0;
    this.roadMoonlight.shadow.camera.top = 35.0;
    this.roadMoonlight.shadow.camera.bottom = -35.0;
    this.roadMoonlight.shadow.bias = -0.0012;

    this.roadAmbientLight = new THREE.AmbientLight(0x182236, 0.75);

    this.roadSceneGroup.add(this.roadMoonlight);
    this.roadSceneGroup.add(this.roadMoonlight.target);
    this.roadSceneGroup.add(this.roadAmbientLight);

    this.scene.add(this.roadSceneGroup);
    this.roadSceneGroup.visible = false; // Hidden initially on Screen 1 until cloud wipe reaches midpoint

    // 5. Instantiate Veil Rift Transition (Screen 2 <-> Screen 3)
    this.initVeilRiftTransition();

    // Dynamic Halloween Lunar Color Progression Palette:
    // Blue Moon -> Blood Red -> Harvest Yellow -> Halloween Orange -> Witching Purple -> Blue Moon
    this.lunarColors = [
      new THREE.Color(0x3d7ef5), // 1. Blue Moon
      new THREE.Color(0xe52b2b), // 2. Blood Red
      new THREE.Color(0xf5be18), // 3. Harvest Yellow
      new THREE.Color(0xff6f00), // 4. Halloween Orange
      new THREE.Color(0x9d27b0), // 5. Witching Purple
      new THREE.Color(0x3d7ef5)  // 6. Return to Blue Moon
    ];
    this.currentLunarColor = new THREE.Color(0x3d7ef5);
    this.ambientDarkColor = new THREE.Color(0x0c1524);

    this.scrollPromptEl = document.getElementById('scroll-prompt');
    this.veilBtnContainer = document.getElementById('veil-button-container');
    this.openVeilBtn = document.getElementById('open-veil-btn');
    this.returnVeilContainer = document.getElementById('return-veil-container');
    this.returnVeilBtn = document.getElementById('return-veil-btn');

    // Screen 2 timing & conditional visibility state
    this.screen2Time = 0.0;
    this.hasInteractedOnScreen2 = false;

    this.bindEvents();
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    // Initial: Observer standing on the ground looking up at the Moon
    this.camera.position.set(0, 1.6, 0);
    this.cameraTarget = new THREE.Vector3(0, 12, -35);
    this.camera.lookAt(this.cameraTarget);
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x03050d);
    // Dynamic atmospheric nocturnal mist (density scaled with scroll into Section 2)
    this.scene.fog = new THREE.FogExp2(0x050814, 0.0);
  }

  initStars() {
    this.starfieldGroup = new THREE.Group();
    this.scene.add(this.starfieldGroup);

    // 1. High-Fidelity 8K Celestial Milky Way Dome
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('/textures/8k_stars.jpg', (starsTex) => {
      starsTex.colorSpace = THREE.SRGBColorSpace;
      starsTex.wrapS = THREE.RepeatWrapping;
      starsTex.wrapT = THREE.ClampToEdgeWrapping;

      const domeGeo = new THREE.SphereGeometry(320, 64, 64);
      const domeMat = new THREE.MeshBasicMaterial({
        map: starsTex,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.80,
        color: new THREE.Color(0x8a99ba)
      });

      this.celestialDome = new THREE.Mesh(domeGeo, domeMat);
      this.celestialDome.rotation.x = Math.PI * 0.12;
      this.starfieldGroup.add(this.celestialDome);
    });

    // 2. Dynamic Sparkling Starfield Layer
    const starCount = 2200;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random() * 0.80 + 0.12;
      const theta = u * Math.PI * 2;
      const phi = v * Math.PI * 0.5;

      const r = 240 + Math.random() * 60;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = -r * Math.sin(phi) * Math.sin(theta);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const spectral = Math.random();
      let rCol, gCol, bCol;
      if (spectral > 0.88) {
        rCol = 0.82; gCol = 0.90; bCol = 1.0;
      } else if (spectral > 0.65) {
        rCol = 0.95; gCol = 0.97; bCol = 1.0;
      } else if (spectral > 0.30) {
        rCol = 1.0; gCol = 0.94; bCol = 0.82;
      } else {
        rCol = 1.0; gCol = 0.78; bCol = 0.60;
      }

      const baseBrightness = 0.50 + Math.random() * 0.50;
      colors[i * 3] = rCol * baseBrightness;
      colors[i * 3 + 1] = gCol * baseBrightness;
      colors[i * 3 + 2] = bCol * baseBrightness;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true
    });

    this.starField = new THREE.Points(starGeo, starMat);
    this.starfieldGroup.add(this.starField);
  }

  initCloudWipeTransition() {
    this.cloudWipeGroup = new THREE.Group();
    // Add directly to camera so it moves and rotates seamlessly with the camera in view-space
    this.camera.add(this.cloudWipeGroup);
    this.scene.add(this.camera);

    const textureLoader = new THREE.TextureLoader();
    const cloudTex1 = textureLoader.load('/textures/cloud texture 1.jpg');
    const cloudTex2 = textureLoader.load('/textures/cloud texture 2.jpg');
    const cloudTex3 = textureLoader.load('/textures/cloud texture 3.jpg');

    [cloudTex1, cloudTex2, cloudTex3].forEach(tex => {
      tex.wrapS = THREE.MirroredRepeatWrapping;
      tex.wrapT = THREE.MirroredRepeatWrapping;
    });

    // 1. Full-Frustum Volumetric Veil Quad (Z = -1.25 in camera space)
    // Sized generously (7.0 x 5.0) to completely cover any widescreen or ultra-wide viewport with FOV 45
    const veilGeo = new THREE.PlaneGeometry(7.0, 5.0, 32, 32);
    this.wipeVeilMat = new THREE.ShaderMaterial({
      uniforms: {
        tCloud1: { value: cloudTex1 },
        tCloud2: { value: cloudTex2 },
        uTime: { value: 0 },
        uWipeIn: { value: 0.0 },
        uWipeOut: { value: 0.0 },
        uBaseColor: { value: new THREE.Color(0x050a14) },
        uRimColor: { value: new THREE.Color(0x283852) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tCloud1;
        uniform sampler2D tCloud2;
        uniform float uTime;
        uniform float uWipeIn;
        uniform float uWipeOut;
        uniform vec3 uBaseColor;
        uniform vec3 uRimColor;
        varying vec2 vUv;

        void main() {
          vec2 uv = vUv;

          // Multi-frequency wind turbulence
          float t = uTime * 0.16;
          vec2 flow1 = vec2(sin(uv.y * 5.5 + t), cos(uv.x * 4.8 - t * 0.8)) * 0.035;
          vec2 flow2 = vec2(cos(uv.y * 9.5 - t * 0.6), sin(uv.x * 8.2 + t * 0.7)) * 0.022;
          vec2 distortedUv = clamp(uv + flow1 + flow2, vec2(0.01), vec2(0.99));

          // Multi-octave texture blend
          vec4 c1 = texture2D(tCloud1, distortedUv);
          vec4 c2 = texture2D(tCloud2, clamp(distortedUv * 1.5 + vec2(t * 0.07, -t * 0.04), vec2(0.01), vec2(0.99)));
          float noise = clamp(c1.r * 0.65 + c2.r * 0.45, 0.0, 1.0);

          // 1. Inward billow wipe (clouds rush in from screen borders towards center)
          float borderDist = min(min(uv.x, 1.0 - uv.x) * 2.0, min(uv.y, 1.0 - uv.y) * 2.0);
          float inThresh = 1.0 - uWipeIn * 1.55;
          float inShape = (1.0 - borderDist) * 0.75 + noise * 0.55;
          float inAlpha = smoothstep(inThresh + 0.35, inThresh - 0.12, inShape);
          inAlpha = clamp(inAlpha * (uWipeIn * 1.35), 0.0, 1.0);

          // 2. Outward curtain parting wipe (clouds part from center outwards)
          float centerDist = abs(uv.x - 0.5) * 2.0;
          float outThresh = uWipeOut * 1.45 - 0.22;
          float outShape = centerDist * 0.70 + (1.0 - noise) * 0.35;
          float outAlpha = 1.0 - smoothstep(outThresh - 0.15, outThresh + 0.35, outShape);
          outAlpha = clamp(outAlpha, 0.0, 1.0);

          // Combined veil alpha
          float totalAlpha = inAlpha * outAlpha;

          // 100% cloud blanket coverage lock when fully engulfed
          if (uWipeIn >= 0.98 && uWipeOut <= 0.02) {
            totalAlpha = 1.0;
          }

          if (totalAlpha < 0.005) discard;

          // Luminous silver/nocturnal rim lighting on wispy cloud edges
          float rim = smoothstep(0.2, 0.65, noise) * (1.0 - totalAlpha * 0.75);
          vec3 col = mix(uBaseColor, uRimColor, rim * 0.55);

          gl_FragColor = vec4(col, totalAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide
    });

    this.wipeVeilMesh = new THREE.Mesh(veilGeo, this.wipeVeilMat);
    this.wipeVeilMesh.position.set(0, 0, -1.25);
    this.wipeVeilMesh.renderOrder = 999;
    this.cloudWipeGroup.add(this.wipeVeilMesh);

    // 2. Volumetric Billowing Puffs (6 dynamic planes in camera space with real 3D depth)
    this.billowPuffs = [];
    const puffConfigs = [
      { basePos: new THREE.Vector3(-1.4, 0.65, -1.8), size: [3.6, 2.4], rotDir: 0.15, tex: cloudTex1 },
      { basePos: new THREE.Vector3(1.4, 0.60, -1.9), size: [3.4, 2.3], rotDir: -0.12, tex: cloudTex2 },
      { basePos: new THREE.Vector3(-1.3, -0.65, -1.6), size: [3.8, 2.5], rotDir: -0.18, tex: cloudTex3 },
      { basePos: new THREE.Vector3(1.35, -0.60, -1.7), size: [3.6, 2.4], rotDir: 0.14, tex: cloudTex1 },
      { basePos: new THREE.Vector3(-0.6, 0.15, -1.4), size: [3.2, 2.1], rotDir: 0.20, tex: cloudTex2 },
      { basePos: new THREE.Vector3(0.6, -0.12, -1.5), size: [3.2, 2.1], rotDir: -0.16, tex: cloudTex3 }
    ];

    for (let i = 0; i < puffConfigs.length; i++) {
      const cfg = puffConfigs[i];
      const pGeo = new THREE.PlaneGeometry(cfg.size[0], cfg.size[1]);
      const pMat = new THREE.ShaderMaterial({
        uniforms: {
          tCloud: { value: cfg.tex },
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(0x060c18) },
          uOpacity: { value: 0.0 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tCloud;
          uniform float uTime;
          uniform vec3 uColor;
          uniform float uOpacity;
          varying vec2 vUv;

          void main() {
            vec2 uv = vUv;
            vec4 tex = texture2D(tCloud, uv);
            vec2 d = (vUv - 0.5) * 2.0;
            float radialMask = smoothstep(1.0, 0.2, length(d));
            float alpha = tex.r * uOpacity * radialMask;
            if (alpha < 0.005) discard;
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide
      });

      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.copy(cfg.basePos);
      pMesh.renderOrder = 998;
      this.cloudWipeGroup.add(pMesh);

      this.billowPuffs.push({
        mesh: pMesh,
        mat: pMat,
        cfg: cfg,
        basePos: cfg.basePos.clone()
      });
    }

    // Hidden initially until transition triggers
    this.cloudWipeGroup.visible = false;
  }

  initVeilRiftTransition() {
    this.veilRiftGroup = new THREE.Group();
    this.camera.add(this.veilRiftGroup);

    // Full-screen atmospheric dimensional veil quad
    const riftGeo = new THREE.PlaneGeometry(7.0, 5.0, 64, 64);
    this.veilRiftMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uProgress: { value: 0.0 },
        uDirection: { value: 1.0 } // 1.0 = opening into afterworld, -1.0 = returning
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uProgress;
        uniform float uDirection;
        varying vec2 vUv;

        // Smooth noise approximation
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm(vec2 p) {
          float val = 0.0;
          float amp = 0.5;
          for (int i = 0; i < 5; i++) {
            val += amp * noise(p);
            p *= 2.1;
            amp *= 0.5;
          }
          return val;
        }

        void main() {
          vec2 uv = vUv;
          vec2 center = vec2(0.5, 0.5);
          float dist = length(uv - center);
          float angle = atan(uv.y - center.y, uv.x - center.x);

          float t = uTime * 0.35;
          float p = uProgress;

          // Atmospheric swirling mist noise
          float n1 = fbm(vec2(uv.x * 3.5 + t * 0.3, uv.y * 3.5 - t * 0.2));
          float n2 = fbm(vec2(angle * 2.5 + t * 0.4, dist * 4.0 - t * 0.5));
          float noiseVal = n1 * 0.6 + n2 * 0.4;

          // Fast, seamless 3-phase opacity progression:
          // Phase 1 (0.0 -> 0.38): Mist swiftly rolls in across the screen
          // Phase 2 (0.38 -> 0.48): Brief cohesive atmospheric blanket for seamless scene swap
          // Phase 3 (0.48 -> 1.0): Mist promptly dissolves and parts to reveal destination world
          float veilAlpha = 0.0;

          if (p < 0.38) {
            float inP = p / 0.38;
            float edge = inP * 1.35 - noiseVal * 0.35;
            veilAlpha = smoothstep(0.0, 1.0, edge);
          } else if (p <= 0.48) {
            veilAlpha = 1.0;
          } else {
            float outP = (p - 0.48) / 0.52;
            float edge = outP * 1.35 - noiseVal * 0.35;
            veilAlpha = 1.0 - smoothstep(0.0, 1.0, edge);
          }

          veilAlpha = clamp(veilAlpha, 0.0, 1.0);
          if (veilAlpha < 0.003) discard;

          // Rich, cohesive twilight palette (connecting midnight road & afterworld sunset)
          vec3 deepNocturne = vec3(0.06, 0.04, 0.09); // Deep nocturnal indigo-umber
          vec3 warmAmber = vec3(0.52, 0.26, 0.08);     // Warm mystical harvest amber
          vec3 goldenGaze = vec3(0.82, 0.54, 0.22);    // Ethereal golden twilight mist
          vec3 softGlow = vec3(0.94, 0.74, 0.38);      // Soft marigold highlight

          // Swirling light density
          float swirl = smoothstep(0.7, 0.1, dist) * 0.6 + noiseVal * 0.4;
          vec3 col = mix(deepNocturne, warmAmber, swirl);
          col = mix(col, goldenGaze, smoothstep(0.35, 0.85, noiseVal) * 0.65);

          // Gentle center glow (cohesive, not blinding)
          float centerGlow = exp(-dist * dist * 3.5) * 0.35;
          col = mix(col, softGlow, centerGlow);

          // Subtle floating spirit dust
          float sparkle = step(0.985, hash(uv * 320.0 + t * 0.8)) * 0.4 * veilAlpha;
          col += vec3(0.9, 0.8, 0.5) * sparkle;

          gl_FragColor = vec4(col, veilAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide
    });

    this.veilRiftMesh = new THREE.Mesh(riftGeo, this.veilRiftMat);
    this.veilRiftMesh.position.set(0, 0, -1.2);
    this.veilRiftMesh.renderOrder = 999;
    this.veilRiftGroup.add(this.veilRiftMesh);

    this.veilRiftGroup.visible = false;
  }

  updateVeilRift(delta, elapsed, p, direction) {
    if (!this.veilRiftGroup || !this.veilRiftMat) return;

    this.veilRiftMat.uniforms.uTime.value = elapsed;
    this.veilRiftMat.uniforms.uProgress.value = p;
    this.veilRiftMat.uniforms.uDirection.value = direction > 0 ? 1.0 : -1.0;
  }

  updateCloudWipe(delta, elapsed, p, direction) {
    if (!this.cloudWipeGroup || !this.wipeVeilMat) return;

    let uWipeIn = 0.0;
    let uWipeOut = 0.0;
    let puffAlpha = 0.0;

    if (p <= 0.45) {
      // Phase 1: Inflow (0.0s - 1.35s) - Clouds billow inward to fill the sky
      const inP = p / 0.45;
      uWipeIn = THREE.MathUtils.smoothstep(inP, 0.0, 1.0);
      uWipeOut = 0.0;
      puffAlpha = THREE.MathUtils.smoothstep(inP, 0.0, 0.75) * 0.95;

      for (const puff of this.billowPuffs) {
        const offsetDist = (1.0 - inP) * 2.5;
        puff.mesh.position.x = puff.basePos.x + Math.sign(puff.basePos.x) * offsetDist;
        puff.mesh.position.y = puff.basePos.y + Math.sign(puff.basePos.y) * (offsetDist * 0.4);
        const puffScale = 0.3 + inP * 0.9;
        puff.mesh.scale.set(puffScale, puffScale, 1.0);
        puff.mesh.rotation.z = puff.cfg.rotDir * elapsed * 0.2;
      }
    } else if (p < 0.55) {
      // Phase 2: Total 100% Cloud Blanket Coverage (1.35s - 1.65s)
      uWipeIn = 1.0;
      uWipeOut = 0.0;
      puffAlpha = 0.95;

      for (const puff of this.billowPuffs) {
        puff.mesh.position.copy(puff.basePos);
        puff.mesh.scale.set(1.2, 1.2, 1.0);
        puff.mesh.rotation.z = puff.cfg.rotDir * elapsed * 0.2;
      }
    } else {
      // Phase 3: Outflow / Parting Reveal (1.65s - 3.0s) - Clouds part to reveal destination scene
      const outP = (p - 0.55) / 0.45;
      uWipeIn = 1.0;
      uWipeOut = THREE.MathUtils.smoothstep(outP, 0.0, 1.0);
      const fadeOut = Math.max(0.0, 1.0 - THREE.MathUtils.smoothstep(outP, 0.0, 0.85));
      puffAlpha = fadeOut * 0.95;

      for (const puff of this.billowPuffs) {
        const driftOut = outP * 3.8;
        puff.mesh.position.x = puff.basePos.x + Math.sign(puff.basePos.x) * driftOut;
        puff.mesh.position.y = puff.basePos.y + Math.sign(puff.basePos.y) * (driftOut * 0.2);
        const scaleExpand = 1.2 + outP * 0.5;
        puff.mesh.scale.set(scaleExpand, scaleExpand, 1.0);
        puff.mesh.rotation.z = puff.cfg.rotDir * elapsed * 0.2;
      }
    }

    this.wipeVeilMat.uniforms.uTime.value = elapsed;
    this.wipeVeilMat.uniforms.uWipeIn.value = uWipeIn;
    this.wipeVeilMat.uniforms.uWipeOut.value = uWipeOut;
    this.wipeVeilMat.uniforms.uBaseColor.value.set(0x050a14).lerp(this.currentLunarColor, 0.12);
    this.wipeVeilMat.uniforms.uRimColor.value.set(0x283852).lerp(this.currentLunarColor, 0.25);

    for (const puff of this.billowPuffs) {
      puff.mat.uniforms.uTime.value = elapsed;
      puff.mat.uniforms.uOpacity.value = puffAlpha;
      puff.mat.uniforms.uColor.value.set(0x060c18).lerp(this.currentLunarColor, 0.10);
    }
  }

  bindEvents() {
    window.addEventListener('resize', this.onResize.bind(this));

    window.addEventListener('mousemove', (e) => {
      this.mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
      this.mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;

      this.checkHover();

      // Delegate mouse moves to Afterworld when on Screen 3
      if (this.currentScreen === 3 && this.afterworldScene) {
        this.afterworldScene.onMouseMove(this.mouseNDC);
      }
    });

    window.addEventListener('pointerdown', this.onPointerDown.bind(this));

    // Mouse wheel transition trigger (3.0s cloud wipe / veil rift)
    window.addEventListener('wheel', (e) => {
      if (this.isTransitioning) return;
      if (this.currentScreen === 1 && e.deltaY > 15) {
        this.startTransition(2);
      } else if (this.currentScreen === 2 && e.deltaY < -15) {
        this.startTransition(1);
      }
      // Screen 2 -> 3 and 3 -> 2 are button-only (no scroll/wheel)
    }, { passive: true });

    // Touch swipe transition trigger
    let touchStartY = 0;
    window.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (this.isTransitioning) return;
      const deltaY = touchStartY - e.changedTouches[0].clientY;
      if (this.currentScreen === 1 && deltaY > 30) {
        this.startTransition(2);
      } else if (this.currentScreen === 2 && deltaY < -30) {
        this.startTransition(1);
      }
    }, { passive: true });

    // Keyboard arrow / page navigation trigger
    window.addEventListener('keydown', (e) => {
      if (this.isTransitioning) return;
      if (['ArrowDown', 'PageDown', 'Space', 'KeyS'].includes(e.code) && this.currentScreen === 1) {
        this.startTransition(2);
      } else if (['ArrowUp', 'PageUp', 'KeyW'].includes(e.code) && this.currentScreen === 2) {
        this.startTransition(1);
      }
    });

    // Window scroll event synchronization
    window.addEventListener('scroll', () => {
      if (this.isTransitioning) return;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = window.scrollY / maxScroll;
      if (this.currentScreen === 1 && progress > 0.08) {
        this.startTransition(2);
      } else if (this.currentScreen === 2 && progress < 0.92) {
        this.startTransition(1);
      }
    }, { passive: true });

    // Bottom prompt click trigger
    if (this.scrollPromptEl) {
      this.scrollPromptEl.addEventListener('click', () => {
        if (!this.isTransitioning && this.currentScreen === 1) {
          this.startTransition(2);
        }
      });
    }

    // "Open the Veil" button click (Screen 2 -> Screen 3)
    if (this.openVeilBtn) {
      this.openVeilBtn.addEventListener('click', () => {
        if (!this.isTransitioning && this.currentScreen === 2) {
          this.startTransition(3);
        }
      });
    }

    // "Return to the Mortal Realm" button click (Screen 3 -> Screen 2)
    if (this.returnVeilBtn) {
      this.returnVeilBtn.addEventListener('click', () => {
        if (!this.isTransitioning && this.currentScreen === 3) {
          this.startTransition(2);
        }
      });
    }
  }

  startTransition(targetScreen) {
    if (this.isTransitioning || this.currentScreen === targetScreen) return;

    this.isTransitioning = true;
    this.transitionFrom = this.currentScreen;
    this.targetScreen = targetScreen;
    this.transitionTime = 0.0;
    // Determine which transition effect to use and set tailored snappy durations
    const isVeilTransition = (this.transitionFrom === 2 && targetScreen === 3) ||
                             (this.transitionFrom === 3 && targetScreen === 2);

    if (isVeilTransition) {
      this.transitionDuration = 1.15; // Snappy 1.15s veil transition (no stuck delay)
      if (window.audioController?.soundEngine) {
        window.audioController.soundEngine.playVeilTransition();
      }
    } else {
      this.transitionDuration = 1.4;  // Fast, punchy 1.4s cloud wipe (not stretched)
      if (window.audioController?.soundEngine) {
        window.audioController.soundEngine.playCloudDiveTransition();
      }
    }

    this.swappedScreen = false;

    // Immediately and unconditionally hide interactive prompts on any transition
    if (this.veilBtnContainer) {
      this.veilBtnContainer.classList.remove('active');
    }
    if (this.returnVeilContainer) {
      this.returnVeilContainer.classList.remove('active');
    }
    if (this.scrollPromptEl) {
      this.scrollPromptEl.style.opacity = '0';
      this.scrollPromptEl.style.pointerEvents = 'none';
      this.scrollPromptEl.style.transform = 'translateX(-50%) translateY(20px)';
    }

    if (targetScreen === 1) {
      this.hasInteractedOnScreen2 = false;
      this.screen2Time = 0.0;
    }

    if (isVeilTransition) {
      // Golden Veil Rift for Screen 2 <-> 3
      if (this.veilRiftGroup) {
        this.veilRiftGroup.visible = true;
      }
    } else {
      // Cloud Wipe for Screen 1 <-> 2
      if (this.cloudWipeGroup) {
        this.cloudWipeGroup.visible = true;
      }
    }

    // Synchronize browser scroll position smoothly (only for Screen 1 <-> 2)
    if (!isVeilTransition) {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const targetScrollY = targetScreen === 2 ? maxScroll : 0;
      window.scrollTo({
        top: targetScrollY,
        behavior: 'smooth'
      });
    }
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  checkHover() {
    if (this.isTransitioning) {
      this.canvas.style.cursor = 'default';
      return;
    }
    // Raycast hover on Screen 2 (pumpkin)
    if (this.currentScreen === 2 && this.pumpkin) {
      this.raycaster.setFromCamera(this.mouseNDC, this.camera);
      const hits = this.raycaster.intersectObjects(this.pumpkin.raycastableMeshes, true);
      if (hits.length > 0) {
        this.canvas.style.cursor = 'pointer';
        return;
      }
    }
    // Raycast hover on Screen 3 (skeleton)
    if (this.currentScreen === 3 && this.afterworldScene && this.afterworldScene.skeleton) {
      this.raycaster.setFromCamera(this.mouseNDC, this.camera);
      const skeletonMeshes = this.afterworldScene.skeleton.raycastableMeshes || [];
      if (skeletonMeshes.length > 0) {
        const hits = this.raycaster.intersectObjects(skeletonMeshes, true);
        if (hits.length > 0) {
          this.canvas.style.cursor = 'pointer';
          return;
        }
      }
    }
    this.canvas.style.cursor = 'default';
  }

  onPointerDown(event) {
    this.mouseNDC.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouseNDC.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);

    if (this.currentScreen === 2 && !this.isTransitioning) {
      if (this.pumpkin) {
        const clicked = this.pumpkin.onPointerDown(this.raycaster);
        if (clicked) {
          this.hasInteractedOnScreen2 = true;
          if (window.audioController?.soundEngine) {
            window.audioController.soundEngine.playPumpkinLaugh();
          }
          console.log('[RoadScene] Pumpkin clicked! Honey-thick boiling liquid oozing & bats taking flight.');
        }
      }
    }

    // Delegate pointer events to Afterworld skeleton on Screen 3
    if (this.currentScreen === 3 && !this.isTransitioning && this.afterworldScene) {
      this.afterworldScene.onPointerDown(this.raycaster);
    }
  }

  update(delta, elapsed, cycleProgress) {
    // 1. Rock-solid Tripod Camera Positions & Fixed Cinematic Targets
    // (Completely eliminates the "loose screw on the camera tripod" cursor wobble on all screens)
    const skyCamPos = new THREE.Vector3(0, 1.6, 0);
    const skyCamTarget = new THREE.Vector3(0, 12.0, -35.0);

    const roadCamPos = new THREE.Vector3(0, 3.8, 4.5);
    const roadCamTarget = new THREE.Vector3(0, 1.5, -55.0);

    // Afterworld camera: calibrated 5'10" (1.78m) human eye-level stance,
    // perfectly framing the sideways skeleton, unburied resting hands, and majestic twilight sky
    const afterworldCamPos = new THREE.Vector3(0, 1.78, 5.0);
    const afterworldCamTarget = new THREE.Vector3(0, 2.1, -6.4);

    // Smooth cinematic FOV adaptation (54° panoramic wide-angle for Screen 3, 45° for Screens 1 & 2)
    const targetFov = (this.currentScreen === 3 || (this.isTransitioning && this.targetScreen === 3)) ? 54.0 : 45.0;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1.0, delta * 4.0);
      this.camera.updateProjectionMatrix();
    }

    // 3. Dynamic Transition State Machine (3.0s duration)
    if (this.isTransitioning) {
      this.transitionTime += delta;
      const p = Math.min(this.transitionTime / this.transitionDuration, 1.0);

      const isVeilTransition = (this.transitionFrom === 2 && this.targetScreen === 3) ||
                               (this.transitionFrom === 3 && this.targetScreen === 2);

      if (isVeilTransition) {
        // ========== VEIL RIFT TRANSITION (Screen 2 <-> Screen 3) ==========
        // Continuous, silky-smooth cosine ease across the full transition duration
        const camEase = 0.5 - 0.5 * Math.cos(p * Math.PI);

        let fromCamPos, fromCamTarget, toCamPos, toCamTarget;

        if (this.targetScreen === 3) {
          fromCamPos = roadCamPos;
          fromCamTarget = roadCamTarget;
          toCamPos = afterworldCamPos;
          toCamTarget = afterworldCamTarget;
        } else {
          fromCamPos = afterworldCamPos;
          fromCamTarget = afterworldCamTarget;
          toCamPos = roadCamPos;
          toCamTarget = roadCamTarget;
        }

        // Camera flight interpolation
        this.camera.position.lerpVectors(fromCamPos, toCamPos, camEase);

        // Gentle floating drift through the veil (soft arc, not a violent surge)
        const gentleFloat = Math.sin(camEase * Math.PI) * 0.35;
        this.camera.position.y += gentleFloat;

        const lookTarget = new THREE.Vector3().lerpVectors(fromCamTarget, toCamTarget, camEase);
        this.camera.lookAt(lookTarget);

        // Midpoint screen swap at p >= 0.42 (veil fully blankets view, enabling instant reveal)
        if (p >= 0.42 && !this.swappedScreen) {
          this.swappedScreen = true;
          if (this.targetScreen === 3) {
            // Switch from Road to Afterworld
            if (this.roadSceneGroup) this.roadSceneGroup.visible = false;
            if (this.afterworldScene) this.afterworldScene.show();
            // Transition atmosphere to golden sunset
            this.scene.background.set(0x2a1805);
            if (this.scene.fog) {
              this.scene.fog.density = 0.008;
              this.scene.fog.color.set(0x3d2a10);
            }
          } else {
            // Switch from Afterworld to Road
            if (this.afterworldScene) this.afterworldScene.hide();
            if (this.roadSceneGroup) this.roadSceneGroup.visible = true;
            this.scene.background.set(0x050814);
            if (this.scene.fog) {
              this.scene.fog.density = 0.0075;
              this.scene.fog.color.set(0x050814);
            }
          }
        }

        // Update the veil rift shader
        const direction = this.targetScreen === 3 ? 1 : -1;
        this.updateVeilRift(delta, elapsed, p, direction);

      } else {
        // ========== CLOUD WIPE TRANSITION (Screen 1 <-> Screen 2) ==========
        const camEase = THREE.MathUtils.smoothstep(p, 0.15, 0.85);
        let camT;
        if (this.targetScreen === 2) {
          camT = camEase;
        } else {
          camT = 1.0 - camEase;
        }

        const diveDip = Math.sin(camEase * Math.PI) * 1.8;
        this.camera.position.lerpVectors(skyCamPos, roadCamPos, camT);
        this.camera.position.y += (this.targetScreen === 2 ? -diveDip * 0.4 : diveDip * 0.4);

        const lookTarget = new THREE.Vector3().lerpVectors(skyCamTarget, roadCamTarget, camT);
        this.camera.lookAt(lookTarget);

        // Midpoint screen swap at p >= 0.48 (guaranteed 100% cloud cover blanket)
        if (p >= 0.48 && !this.swappedScreen) {
          this.swappedScreen = true;
          if (this.targetScreen === 2) {
            if (this.moon && this.moon.group) this.moon.group.visible = false;
            if (this.clouds && this.clouds.group) this.clouds.group.visible = false;
            if (this.starfieldGroup) this.starfieldGroup.visible = false;
            if (this.roadSceneGroup) this.roadSceneGroup.visible = true;
            this.scene.background.set(0x050814);
            if (this.scene.fog) {
              this.scene.fog.density = 0.0075;
              this.scene.fog.color.set(0x050814);
            }
          } else {
            if (this.roadSceneGroup) this.roadSceneGroup.visible = false;
            if (this.moon && this.moon.group) this.moon.group.visible = true;
            if (this.clouds && this.clouds.group) this.clouds.group.visible = true;
            if (this.starfieldGroup) this.starfieldGroup.visible = true;
            this.scene.background.set(0x03050d);
            if (this.scene.fog) {
              this.scene.fog.density = 0.0;
            }
          }
        }

        this.updateCloudWipe(delta, elapsed, p, this.targetScreen === 2 ? 1 : -1);
      }

      // Complete transition
      if (this.transitionTime >= this.transitionDuration) {
        this.isTransitioning = false;
        this.currentScreen = this.targetScreen;
        this.swappedScreen = false;

        // Hide transition effects
        if (this.cloudWipeGroup) {
          this.cloudWipeGroup.visible = false;
        }
        if (this.veilRiftGroup) {
          this.veilRiftGroup.visible = false;
        }

        // Restore scroll prompt if on Screen 1
        if (this.currentScreen === 1 && this.scrollPromptEl) {
          this.scrollPromptEl.style.opacity = '1';
          this.scrollPromptEl.style.pointerEvents = 'auto';
          this.scrollPromptEl.style.transform = 'translateX(-50%) translateY(0)';
        }

        // Screen 2 timer reset
        if (this.currentScreen === 2) {
          this.screen2Time = 0.0;
        }
        if (this.veilBtnContainer) {
          this.veilBtnContainer.classList.remove('active');
        }

        // Show/hide "Return to Mortal Realm" button on Screen 3
        if (this.currentScreen === 3 && this.returnVeilContainer) {
          this.returnVeilContainer.classList.add('active');
        } else if (this.returnVeilContainer) {
          this.returnVeilContainer.classList.remove('active');
        }
      }
    } else {
      // Idle state camera
      if (this.currentScreen === 1) {
        this.camera.position.copy(skyCamPos);
        this.camera.lookAt(skyCamTarget);
      } else if (this.currentScreen === 2) {
        this.camera.position.copy(roadCamPos);
        this.camera.lookAt(roadCamTarget);
      } else if (this.currentScreen === 3) {
        this.camera.position.copy(afterworldCamPos);
        this.camera.lookAt(afterworldCamTarget);
      }
    }

    // Dynamic mist ambience volume
    if (window.audioController?.soundEngine) {
      if (this.currentScreen === 2) {
        window.audioController.soundEngine.setMistIntensity(0.85);
      } else if (this.currentScreen === 1) {
        window.audioController.soundEngine.setMistIntensity(0.20);
      } else if (this.currentScreen === 3) {
        window.audioController.soundEngine.setMistIntensity(0.04);
      }
    }

    // 4. Dynamic Lunar Color Cycle (synced with 60s cello cycle)
    const pCycle = ((cycleProgress !== undefined ? cycleProgress : (elapsed % 60.0) / 60.0) % 1.0 + 1.0) % 1.0;
    const numSegments = 5;
    const scaledP = pCycle * numSegments;
    const index = Math.floor(scaledP) % numSegments;
    const frac = scaledP - Math.floor(scaledP);
    const easeT = frac * frac * (3.0 - 2.0 * frac);

    const c1 = this.lunarColors[index];
    const c2 = this.lunarColors[index + 1];
    this.currentLunarColor.copy(c1).lerp(c2, easeT);

    // 5. Section 1 (Celestial Moon & Sky) Updates
    const showScreen1 = (this.isTransitioning && !this.swappedScreen && this.targetScreen === 2 && this.transitionFrom === 1) ||
                        (this.isTransitioning && this.swappedScreen && this.targetScreen === 1) ||
                        (!this.isTransitioning && this.currentScreen === 1);

    if (this.moon && this.moon.group) {
      this.moon.group.visible = showScreen1;
      if (showScreen1) {
        this.moon.setCelestialColor(this.currentLunarColor);
        this.moon.update(delta, elapsed);
      }
    }

    if (this.clouds && this.clouds.group) {
      this.clouds.group.visible = showScreen1;
      if (showScreen1) {
        this.ambientDarkColor.set(0x0a1220).lerp(this.currentLunarColor, 0.12);
        this.clouds.setMoonlightColor(this.currentLunarColor, this.ambientDarkColor);
        this.clouds.update(delta, elapsed);
      }
    }

    if (this.starfieldGroup) {
      this.starfieldGroup.visible = showScreen1;
      if (showScreen1) {
        if (this.celestialDome && this.celestialDome.material) {
          this.celestialDome.material.color.set(0x7886a4).lerp(this.currentLunarColor, 0.15);
          this.celestialDome.rotation.y += delta * 0.00018;
        }
        if (this.starField) {
          this.starField.rotation.y += delta * 0.00018;
        }
      }
    }

    // 6. Section 2 (Road Scene) Updates
    const showScreen2 = (this.isTransitioning && this.swappedScreen && this.targetScreen === 2) ||
                        (this.isTransitioning && !this.swappedScreen && (this.targetScreen === 1 || this.targetScreen === 3) && this.transitionFrom === 2) ||
                        (!this.isTransitioning && this.currentScreen === 2);

    if (this.roadSceneGroup) {
      this.roadSceneGroup.visible = showScreen2;
    }

    if (showScreen2) {
      if (this.roadMoonlight && this.roadAmbientLight) {
        this.roadMoonlight.intensity = 1.15;
        this.roadAmbientLight.intensity = 0.75;
      }

      if (this.road) {
        this.road.update(delta, elapsed);
      }

      // Sync boiling liquid state with creeping vines (for burning contact reaction)
      if (this.vines && this.boilingLiquid && this.boilingLiquid.puddleMesh && this.boilingLiquid.puddleMat) {
        this.vines.setPuddleState(
          new THREE.Vector2(this.boilingLiquid.puddleMesh.position.x, this.boilingLiquid.puddleMesh.position.z),
          this.boilingLiquid.puddleMat.uniforms.uRadius.value
        );
      }

      if (this.vines) {
        this.vines.update(delta, elapsed);
      }

      // Combine clearance data from spreading boiling puddle and sprouting vines
      // so the thick white/grey fog parts over them to reveal the bumpy ground
      if (this.mistyPerimeter) {
        const vineClearance = this.vines ? this.vines.getClearanceData() : [];
        const puddleClearance = this.boilingLiquid ? this.boilingLiquid.getClearanceData() : [];
        const combinedClearance = [...vineClearance, ...puddleClearance];
        this.mistyPerimeter.update(delta, elapsed, combinedClearance);
      }

      if (this.heroText) {
        this.heroText.setMoonlightColor(this.currentLunarColor);
        this.heroText.update(delta, elapsed);
      }

      if (this.pumpkin) {
        this.pumpkin.update(delta, elapsed);
      }

      if (this.boilingLiquid) {
        this.boilingLiquid.update(delta, elapsed);
      }
    }

    // 7. Section 3 (Afterworld) Updates
    const showScreen3 = (this.isTransitioning && this.swappedScreen && this.targetScreen === 3) ||
                        (this.isTransitioning && !this.swappedScreen && this.targetScreen === 2 && this.transitionFrom === 3) ||
                        (!this.isTransitioning && this.currentScreen === 3);

    if (this.afterworldScene) {
      if (showScreen3) {
        this.afterworldScene.show();
        this.afterworldScene.update(delta, elapsed, cycleProgress);
      } else if (!this.isTransitioning || this.swappedScreen) {
        // Only hide if we've already swapped or aren't transitioning
        // (prevents premature hide during the first half of transition)
        if (this.currentScreen !== 3 || this.isTransitioning) {
          // Don't hide if Screen 3 needs to remain visible pre-swap
        }
      }
    }

    // 8. Bats Update (both celestial sky bats & hero text swarm)
    if (this.bats) {
      this.bats.setMoonlightColor(this.currentLunarColor);
      this.bats.update(delta, elapsed);
    }

    // 9. UI Button Visibility Management (idle state only)
    if (!this.isTransitioning) {
      // "Open the Veil" prompt: visible only on Screen 2 under specific conditions:
      // Condition A: Pumpkin clicked AND levitating for > 1 second
      // Condition B: User on Screen 2 for > 2 seconds without doing anything
      if (this.veilBtnContainer) {
        if (this.currentScreen === 2) {
          this.screen2Time += delta;

          const pumpkinLevitating1s = Boolean(
            this.pumpkin && 
            this.pumpkin.isLevitating && 
            this.pumpkin.levitateTime !== undefined && 
            this.pumpkin.levitateTime > 1.0
          );

          const idleScreen2MoreThan2s = (!this.hasInteractedOnScreen2 && this.screen2Time > 2.0);

          if (pumpkinLevitating1s || idleScreen2MoreThan2s) {
            this.veilBtnContainer.classList.add('active');
          } else {
            this.veilBtnContainer.classList.remove('active');
          }
        } else {
          this.veilBtnContainer.classList.remove('active');
        }
      }

      // "Return to Mortal Realm" button: visible only on Screen 3
      if (this.returnVeilContainer) {
        if (this.currentScreen === 3) {
          this.returnVeilContainer.classList.add('active');
        } else {
          this.returnVeilContainer.classList.remove('active');
        }
      }

      // Scroll prompt: visible only on Screen 1
      if (this.scrollPromptEl) {
        if (this.currentScreen === 1) {
          this.scrollPromptEl.style.opacity = '1';
          this.scrollPromptEl.style.pointerEvents = 'auto';
        } else {
          this.scrollPromptEl.style.opacity = '0';
          this.scrollPromptEl.style.pointerEvents = 'none';
        }
      }
    } else {
      // During any transition, veil prompt is strictly hidden
      if (this.veilBtnContainer) {
        this.veilBtnContainer.classList.remove('active');
      }
    }

    // 10. Render
    this.renderer.render(this.scene, this.camera);
  }
}
