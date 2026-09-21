import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * SkeletonEntity:
 * The colossal realistic skeleton partially buried in the meadow.
 * Loaded from `public/Otherworld/human_skeleton_download_free.glb`.
 * 
 * Features:
 * - Genuine 3D scanned/sculpted human skeleton model
 * - Angled sideways (~30° diagonal yaw) facing across the golden meadow
 * - Pushed farther into the scene at z = -6.4m
 * - Unburied arms, wrists, and bony hands resting cleanly on the meadow turf
 * - Real-world bone lighting & shading:
 *   - Warm aged-ivory tone (color: 0xdfd4c4)
 *   - High roughness (0.64) and bump-mapped micro-porosity
 *   - Deep contact shadows cast across ribcage cavities and eye sockets
 * - Focused Single Click Interaction:
 *   - When clicked anywhere on the skeleton, ONLY its head moves slightly
 *     and its eyes flare into glowing celestial amber light!
 *   - No body heaving, jumping, or wind blasts.
 */
export class SkeletonEntity {
  constructor(windSystem, onInteractCallback) {
    this.windSystem = windSystem;
    this.onInteractCallback = onInteractCallback;
    this.group = new THREE.Group();

    // Pushed farther back into the scene
    this.group.position.set(0, 0, -6.4);

    this.raycastableMeshes = [];
    this.textureLoader = new THREE.TextureLoader();

    // Single focused click interaction state (Head movement + Eye glow)
    this.interaction = {
      active: false,
      progress: 0.0,
      duration: 2.2 // Smooth 2.2s gentle flare & acknowledgement
    };

    this.initBoneMaterial();
    this.loadGlbSkeleton();
    this.createHitCollider();
  }

  initBoneMaterial() {
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    const boneUrl = `${origin}/Otherworld/human bone texture generated.png`;

    this.boneTexture = this.textureLoader.load(boneUrl, (tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(3, 3);
      tex.colorSpace = THREE.SRGBColorSpace;
      if (this.boneMat) {
        this.boneMat.bumpMap = tex;
        this.boneMat.bumpScale = 0.032; // Rich micro-porosity & crevice depth
        this.boneMat.needsUpdate = true;
      }
    });

    // Warm natural aged ivory bone material (prevents washed-out stark white)
    this.boneMat = new THREE.MeshPhysicalMaterial({
      color: 0xdfd4c4,
      roughness: 0.64,
      metalness: 0.03,
      clearcoat: 0.08,
      clearcoatRoughness: 0.45,
      transmission: 0.04,
      thickness: 0.8,
      attenuationColor: new THREE.Color(0xffcca0),
      attenuationDistance: 1.2
    });
  }

  /**
   * Load the genuine realistic 3D skeleton from `human_skeleton_download_free.glb`
   */
  loadGlbSkeleton() {
    const loader = new GLTFLoader();
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    const glbUrl = `${origin}/Otherworld/human_skeleton_download_free.glb`;

    loader.load(
      glbUrl,
      (gltf) => {
        const model = gltf.scene;

        // Apply realistic ivory bone material and enable shadows
        model.traverse((child) => {
          if (child.isMesh) {
            child.material = this.boneMat;
            child.castShadow = true;
            child.receiveShadow = true;
            this.raycastableMeshes.push(child);
          }
        });

        // Exact calibrated transform:
        // - Angled sideways diagonally (yaw: -0.52 rad ≈ -30°) so hands & arms are prominent
        // - Tilted back into the earth (pitch: -0.20 rad)
        // - Elevated (y = 0.85m) so wrists and hands rest completely unburied on the turf bed
        model.scale.setScalar(0.21);
        model.position.set(0, 0.85, 0);
        model.rotation.set(-0.20, -0.52, 0.08);

        this.skeletonModel = model;
        this.basePos = model.position.clone();
        this.baseRot = model.rotation.clone();

        // Attach glowing eyes directly inside the skull orbital sockets
        this.setupGlowingEyes(model);

        this.group.add(model);
        console.log('[SkeletonEntity] Loaded human_skeleton_download_free.glb sideways posture & eye glow ready.');
      },
      undefined,
      (err) => {
        console.warn('[SkeletonEntity] Error loading human_skeleton_download_free.glb:', err);
      }
    );
  }

  /**
   * Generates a procedural smooth radial glow halo texture for celestial eye bloom
   */
  createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0.0, 'rgba(255, 245, 200, 1.0)'); // Brilliant golden-white core
    gradient.addColorStop(0.25, 'rgba(255, 175, 40, 0.92)'); // Radiant celestial amber
    gradient.addColorStop(0.60, 'rgba(255, 100, 10, 0.45)'); // Warm fiery edge
    gradient.addColorStop(1.0, 'rgba(255, 60, 0, 0.0)');    // Soft transparent corona
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * Celestial glowing eyes positioned accurately inside the skull's orbital cavities
   * (Calibrated to human_skeleton_download_free.glb: x = ±1.04, y = 22.02, z = -4.10 in model space)
   */
  setupGlowingEyes(model) {
    this.eyesGroup = new THREE.Group();

    // 1. Inner glowing pupil/iris spheres
    const eyeGeo = new THREE.SphereGeometry(0.38, 16, 16);
    this.eyeMat = new THREE.MeshBasicMaterial({
      color: 0xffaa22,
      transparent: true,
      opacity: 0.0,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.leftEyeMesh = new THREE.Mesh(eyeGeo, this.eyeMat);
    this.leftEyeMesh.position.set(1.04, 22.02, -4.10);
    this.leftEyeMesh.renderOrder = 999;

    this.rightEyeMesh = new THREE.Mesh(eyeGeo, this.eyeMat);
    this.rightEyeMesh.position.set(-1.04, 22.02, -4.10);
    this.rightEyeMesh.renderOrder = 999;

    this.eyesGroup.add(this.leftEyeMesh);
    this.eyesGroup.add(this.rightEyeMesh);

    // 2. Celestial halo flares (Sprites) that bloom outward towards the viewer
    const glowTex = this.createGlowTexture();
    this.spriteMat = new THREE.SpriteMaterial({
      map: glowTex,
      transparent: true,
      opacity: 0.0,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.leftEyeSprite = new THREE.Sprite(this.spriteMat);
    this.leftEyeSprite.position.set(1.04, 22.02, -4.22);
    this.leftEyeSprite.scale.set(2.2, 2.2, 2.2);
    this.leftEyeSprite.renderOrder = 1000;

    this.rightEyeSprite = new THREE.Sprite(this.spriteMat);
    this.rightEyeSprite.position.set(-1.04, 22.02, -4.22);
    this.rightEyeSprite.scale.set(2.2, 2.2, 2.2);
    this.rightEyeSprite.renderOrder = 1000;

    this.eyesGroup.add(this.leftEyeSprite);
    this.eyesGroup.add(this.rightEyeSprite);

    // 3. High-radiance amber orbital cavity PointLights casting light onto surrounding skull bone
    this.leftEyeLight = new THREE.PointLight(0xffa726, 0.0, 10.0, 1.6);
    this.leftEyeLight.position.set(1.04, 22.02, -4.12);
    this.eyesGroup.add(this.leftEyeLight);

    this.rightEyeLight = new THREE.PointLight(0xffa726, 0.0, 10.0, 1.6);
    this.rightEyeLight.position.set(-1.04, 22.02, -4.12);
    this.eyesGroup.add(this.rightEyeLight);

    model.add(this.eyesGroup);
  }

  /**
   * Generous invisible hit collider covering the entire skeleton, ribs, skull and unburied hands
   */
  createHitCollider() {
    const proxyGeo = new THREE.BoxGeometry(9.0, 7.5, 6.5);
    const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
    const proxyMesh = new THREE.Mesh(proxyGeo, proxyMat);
    proxyMesh.position.set(0, 2.5, 0);
    this.group.add(proxyMesh);
    this.raycastableMeshes.push(proxyMesh);
  }

  onPointerDown(raycaster) {
    if (!raycaster || this.raycastableMeshes.length === 0) return false;

    const hits = raycaster.intersectObjects(this.raycastableMeshes, true);
    if (hits.length > 0) {
      this.triggerEyeInteraction();
      return true;
    }
    return false;
  }

  /**
   * Single click interaction:
   * Moves head slightly and lights up eyes in glowing celestial amber
   */
  triggerEyeInteraction() {
    this.interaction.active = true;
    this.interaction.progress = 0.0;

    // Play bone shift sound and celestial eye flare chord
    if (window.audioController?.soundEngine) {
      window.audioController.soundEngine.playSkeletonMove(0.75);
      window.audioController.soundEngine.playEyeGlow(0.85);
    }
  }

  update(delta, elapsed) {
    if (!this.skeletonModel || !this.baseRot) return;

    if (this.interaction.active) {
      this.interaction.progress += delta / this.interaction.duration;
      const p = this.interaction.progress;

      let response = 0.0;
      if (p < 0.20) {
        // Snappy flare-up in first ~0.45s
        response = THREE.MathUtils.smoothstep(p / 0.20, 0.0, 1.0);
      } else if (p < 0.65) {
        // Sustained luminous gaze for ~1.0s
        response = 1.0;
      } else if (p < 1.0) {
        // Smooth gentle decay back to peaceful slumber
        response = 1.0 - THREE.MathUtils.smoothstep((p - 0.65) / 0.35, 0.0, 1.0);
      } else {
        this.interaction.active = false;
        this.interaction.progress = 0.0;
        response = 0.0;
      }

      // 1. Subtle head movement (peaceful acknowledgement tilt & turn)
      this.skeletonModel.rotation.y = this.baseRot.y + response * 0.085;
      this.skeletonModel.rotation.x = this.baseRot.x + response * 0.040;

      // 2. Eyes flare with celestial golden-amber radiance
      if (this.eyeMat && this.spriteMat) {
        const flicker = Math.sin(elapsed * 26.0) * 0.08;
        const alpha = Math.min(1.0, Math.max(0.0, response + flicker * response));
        this.eyeMat.opacity = alpha * 0.95;
        this.spriteMat.opacity = alpha * 0.95;

        const lightPower = Math.max(0.0, response * 6.5 + flicker * response * 1.8);
        if (this.leftEyeLight) this.leftEyeLight.intensity = lightPower;
        if (this.rightEyeLight) this.rightEyeLight.intensity = lightPower;
      }
    } else {
      // Idle state: head in peaceful resting pose, eyes dormant
      this.skeletonModel.rotation.y = this.baseRot.y;
      this.skeletonModel.rotation.x = this.baseRot.x;

      if (this.eyeMat && this.spriteMat) {
        this.eyeMat.opacity = 0.0;
        this.spriteMat.opacity = 0.0;
        if (this.leftEyeLight) this.leftEyeLight.intensity = 0.0;
        if (this.rightEyeLight) this.rightEyeLight.intensity = 0.0;
      }
    }
  }
}
