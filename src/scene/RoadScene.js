import * as THREE from 'three';
import { Moon } from './Moon.js';
import { Bats } from './Bats.js';
import { Clouds } from './Clouds.js';

/**
 * Clean Celestial Night Sky Scene:
 * - Direct ground viewpoint looking up at the Moon in the night sky
 * - True 3D Moon sphere mapped with NASA 2k/8k textures, physical lighting & Fresnel atmosphere
 * - Photographic 3D Clouds with real wind physics and multi-depth parallax
 * - 3D Bats orbiting and swooping across the lunar disk and through cloud veils
 * - Deep starry cosmos with natural first-person gaze parallax
 */
export class RoadScene {
  constructor(canvas) {
    this.canvas = canvas;

    // Mouse tracking for natural first-person head sway / parallax
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    this.initRenderer();
    this.initCamera();
    this.initScene();
    this.initStars();

    // Instantiate 3D Celestial Objects
    this.moon = new Moon(this.scene);
    this.clouds = new Clouds(this.scene, this.moon.position);
    this.bats = new Bats(this.scene, this.moon.position);

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
    // Observer standing on the ground looking up into the night sky
    this.camera.position.set(0, 1.6, 0);
    this.cameraTarget = new THREE.Vector3(0, 12, -35);
    this.camera.lookAt(this.cameraTarget);
  }

  initScene() {
    this.scene = new THREE.Scene();
    // Deep nocturnal obsidian-indigo cosmos
    this.scene.background = new THREE.Color(0x03050d);
  }

  initStars() {
    this.starfieldGroup = new THREE.Group();
    this.scene.add(this.starfieldGroup);

    // 1. High-Fidelity 8K Celestial Milky Way & Deep Sky Dome (from Project Solaris)
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
        color: new THREE.Color(0x8a99ba) // Deep midnight celestial tint
      });

      this.celestialDome = new THREE.Mesh(domeGeo, domeMat);
      // Gentle axial tilt matching Earth's celestial equator
      this.celestialDome.rotation.x = Math.PI * 0.12;
      this.starfieldGroup.add(this.celestialDome);
    });

    // 2. Dynamic Sparkling Starfield Layer with Authentic Astronomical Colors
    const starCount = 2200;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    this.starBaseAlphas = new Float32Array(starCount);
    this.starTwinklePhases = new Float32Array(starCount);
    this.starTwinkleSpeeds = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      // Distribute stars on the upper celestial dome
      const u = Math.random();
      const v = Math.random() * 0.80 + 0.12; // Upper hemisphere above horizon
      const theta = u * Math.PI * 2;
      const phi = v * Math.PI * 0.5;

      const r = 240 + Math.random() * 60;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = -r * Math.sin(phi) * Math.sin(theta);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Realistic stellar spectral classification (O, B, A, F, G, K, M)
      const spectral = Math.random();
      let rCol, gCol, bCol;
      if (spectral > 0.88) {
        // Hot Blue-White Giants (Rigel, Vega)
        rCol = 0.82; gCol = 0.90; bCol = 1.0;
      } else if (spectral > 0.65) {
        // Pure White Stars (Sirius)
        rCol = 0.95; gCol = 0.97; bCol = 1.0;
      } else if (spectral > 0.30) {
        // Solar Warm Yellow/White (Capella, Alpha Centauri)
        rCol = 1.0; gCol = 0.94; bCol = 0.82;
      } else {
        // Warm Orange/Red Giants (Arcturus, Betelgeuse)
        rCol = 1.0; gCol = 0.78; bCol = 0.60;
      }

      const baseBrightness = 0.50 + Math.random() * 0.50;
      colors[i * 3] = rCol * baseBrightness;
      colors[i * 3 + 1] = gCol * baseBrightness;
      colors[i * 3 + 2] = bCol * baseBrightness;

      this.starBaseAlphas[i] = baseBrightness;
      this.starTwinklePhases[i] = Math.random() * Math.PI * 2;
      this.starTwinkleSpeeds[i] = 1.2 + Math.random() * 2.8;
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

  bindEvents() {
    window.addEventListener('resize', this.onResize.bind(this));

    window.addEventListener('mousemove', (e) => {
      // Normalized mouse coordinates (-1 to 1)
      this.mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    });
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  setScrollProgress() {
    // Stub for scroll integration when needed
  }

  update(delta, elapsed) {
    // Smooth first-person camera gaze sway following mouse
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

    this.camera.position.x = this.mouse.x * 0.6;
    this.camera.position.y = 1.6 + this.mouse.y * 0.4;

    this.camera.lookAt(
      this.cameraTarget.x + this.mouse.x * 1.5,
      this.cameraTarget.y + this.mouse.y * 1.2,
      this.cameraTarget.z
    );

    // Subtle sidereal rotation of the deep celestial star dome
    if (this.celestialDome) {
      this.celestialDome.rotation.y += delta * 0.00018;
    }
    if (this.starField) {
      this.starField.rotation.y += delta * 0.00018;
    }

    // Update 3D Moon
    if (this.moon) this.moon.update(delta, elapsed);

    // Update 3D Clouds with Wind Physics
    if (this.clouds) this.clouds.update(delta, elapsed);

    // Update 3D Bats
    if (this.bats) this.bats.update(delta, elapsed);

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  }
}
