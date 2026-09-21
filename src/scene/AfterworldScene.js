import * as THREE from 'three';
import { WindSystem } from './afterworld/WindSystem.js';
import { MeadowLandscape } from './afterworld/MeadowLandscape.js';
import { ButterflySwarm } from './afterworld/ButterflySwarm.js';
import { SkeletonEntity } from './afterworld/SkeletonEntity.js';
import { AfterworldAtmosphere } from './afterworld/AfterworldAtmosphere.js';

/**
 * Screen 3: The Afterworld
 * A bright, colorful Disney/Pixar styled afterlife meadow (inspired by Coco & Up).
 * 
 * Key Features:
 * - Colossal 70ft skeleton partially buried in the ground, ribcage leaning back,
 *   skull gazing up at the golden sunset, with unburied hands resting in the grass.
 * - Real-time physical PBR lighting: warm golden sun with PCF soft shadows,
 *   ground bounce GI from acres of orange marigolds, and dynamic PointLights on butterflies.
 * - Vast rolling flowery landscape with custom hand-painted grass texture,
 *   GPU-instanced swaying grass blades, and hundreds of 3D Mexican marigolds, lavender spikes, and daisies.
 * - Magical glowing butterflies with 3D wings, perching on the skeleton and flowers,
 *   fleeing on cursor hover, weaving through the ribcage, and leaving faint luminous particle trails.
 * - Physics of wind displacement: ambient gentle breeze, plus giant displacement wind gusts
 *   sweeping through the grass and flowers whenever the skeleton is clicked.
 */
export class AfterworldScene {
  constructor(parentScene = null, camera = null, renderer = null) {
    this.parentScene = parentScene;
    this.camera = camera;
    this.renderer = renderer;

    this.group = new THREE.Group();
    this.mouseNDC = new THREE.Vector2(-999, -999);

    // Cursor tracking on terrain for interactive grass & wildflower movement
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.4);
    this.cursorTarget = new THREE.Vector3(0, 0, -6.0);
    this.cursorCurrent = new THREE.Vector3(0, 0, -6.0);
    this.prevCursor = new THREE.Vector3(0, 0, -6.0);
    this.cursorVelocity = new THREE.Vector2(0, 0);
    this.cursorActive = false;

    // 1. Core Physics & Wind System
    this.windSystem = new WindSystem();

    // 2. Disney/Pixar Golden Sunset Lighting & Sky
    this.atmosphere = new AfterworldAtmosphere(this.windSystem);
    this.group.add(this.atmosphere.group);

    // 3. Vast Rolling Meadow Landscape & Wildflowers
    this.landscape = new MeadowLandscape(this.windSystem);
    this.group.add(this.landscape.group);

    // 4. Magical Glowing Butterflies & Luminous Particle Trails
    this.butterflySwarm = new ButterflySwarm(this.windSystem, new THREE.Vector3(0, 1.2, -6.4));
    this.group.add(this.butterflySwarm.group);

    // 5. Colossal Half-Buried Skeleton with Real-Time Physical Bone Materials
    this.skeleton = new SkeletonEntity(this.windSystem, () => {
      // Callback on skeleton click interaction: trigger butterfly flutter burst!
      this.butterflySwarm.triggerBurst();
    });
    this.group.add(this.skeleton.group);

    if (this.parentScene) {
      this.parentScene.add(this.group);
    }
  }

  /**
   * Handle user click interactions (raycasts against skeleton skull, ribs, and resting hands)
   */
  onPointerDown(raycaster) {
    if (!this.group.visible) return false;
    return this.skeleton.onPointerDown(raycaster);
  }

  /**
   * Handle mouse movements for interactive grass displacement and butterfly startle
   */
  onMouseMove(mouseNDC) {
    if (mouseNDC) {
      this.mouseNDC.copy(mouseNDC);
      this.updateCursorRaycast();
    }
  }

  /**
   * Raycast mouse cursor onto the meadow terrain to calculate 3D world touch point
   */
  updateCursorRaycast() {
    if (!this.camera || !this.landscape) return;

    this.raycaster.setFromCamera(this.mouseNDC, this.camera);

    let hitPoint = null;
    if (this.landscape.terrainMesh) {
      const hits = this.raycaster.intersectObject(this.landscape.terrainMesh);
      if (hits.length > 0) {
        hitPoint = hits[0].point;
      }
    }

    // Mathematical ground plane fallback
    if (!hitPoint) {
      const planeIntersect = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.groundPlane, planeIntersect)) {
        hitPoint = planeIntersect;
      }
    }

    if (hitPoint) {
      this.cursorTarget.copy(hitPoint);
      this.cursorActive = true;
    }
  }

  /**
   * Toggle visibility of Screen 3
   */
  show() {
    this.group.visible = true;
  }

  hide() {
    this.group.visible = false;
  }

  /**
   * Animation & physics tick
   */
  update(delta, elapsed, cycleProgress) {
    if (!this.group.visible) return;

    // 1. Update Wind physics & shockwave propagation
    this.windSystem.update(delta, elapsed);

    // 2. Update Atmosphere (golden sky dome, Fibonacci particles, sun flare)
    this.atmosphere.update(delta, elapsed);

    // 3. Update Meadow with smoothed cursor motion & parting displacement
    if (this.mouseNDC.x !== -999 && this.mouseNDC.y !== -999) {
      this.updateCursorRaycast();
    }

    if (this.cursorActive) {
      this.cursorCurrent.lerp(this.cursorTarget, Math.min(1.0, delta * 14.0));
      const dt = Math.max(0.001, delta);
      const vx = (this.cursorCurrent.x - this.prevCursor.x) / dt;
      const vz = (this.cursorCurrent.z - this.prevCursor.z) / dt;
      this.cursorVelocity.set(vx, vz).clampLength(0, 6.0);
      this.prevCursor.copy(this.cursorCurrent);

      this.landscape.setCursor(
        this.cursorCurrent.x,
        this.cursorCurrent.z,
        true,
        this.cursorVelocity.x,
        this.cursorVelocity.y
      );
    }

    this.landscape.update(delta, elapsed);

    // 4. Update Skeleton (idle breathing, click spring physics)
    this.skeleton.update(delta, elapsed);

    // 5. Update Butterflies (flight, perching, startle hover, particle trails)
    this.butterflySwarm.update(delta, elapsed, this.camera, this.mouseNDC);
  }

  /**
   * Resource disposal
   */
  dispose() {
    this.group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    if (this.parentScene) {
      this.parentScene.remove(this.group);
    }
  }
}
