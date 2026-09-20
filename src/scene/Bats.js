import * as THREE from 'three';

/**
 * Photorealistic 3D Bats with Moonlight Rim Glow & Natural Staggered Flight Paths:
 * - Anatomically sculpted horizontal bat wings with aerodynamic vertical flapping
 * - Pure silver moonlight rim sheen (zero artificial blue glow)
 * - Screen-spanning cross paths from left edge to right edge and vice-versa
 * - 3 distinct Z-depth tiers: Foreground swift (Z ~ -21), Lunar transit (Z ~ -33.5), Distant high (Z ~ -41)
 * - Immediate flight on site load, followed by natural delayed entries
 * - Sweet balance of random movement: swift direct sweeps and lingering thermal swoops near the Moon
 */
export class Bats {
  constructor(scene, moonPosition) {
    this.scene = scene;
    this.moonPos = moonPosition || new THREE.Vector3(0, 12, -35);
    this.bats = [];
    this.group = new THREE.Group();

    this.initSwarm(9);
    this.scene.add(this.group);
  }

  createBatMesh(scale = 1.0) {
    const batGroup = new THREE.Group();

    // Material: Sleek nocturnal obsidian bat body with delicate silver moonlight rim sheen
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x07060b), // Deep dark obsidian bat leather
      roughness: 0.88,
      metalness: 0.0,
      emissive: new THREE.Color(0xdce7f8), // Subtle silver lunar rim
      emissiveIntensity: 0.01,
      side: THREE.DoubleSide
    });

    // 1. Sleek Torso / Body (snout points along +Z, tail at -Z)
    const bodyGeo = new THREE.ConeGeometry(0.08 * scale, 0.38 * scale, 6);
    // Orient cone so tip (snout) points along +Z
    bodyGeo.rotateX(-Math.PI / 2);
    const bodyMesh = new THREE.Mesh(bodyGeo, mat);
    batGroup.add(bodyMesh);

    // 2. Pointed Bat Ears at the head (+Z)
    const earGeo = new THREE.ConeGeometry(0.022 * scale, 0.085 * scale, 4);
    earGeo.rotateX(-0.25); // Slight backward slant

    const leftEar = new THREE.Mesh(earGeo, mat);
    leftEar.position.set(-0.038 * scale, 0.055 * scale, 0.12 * scale);
    leftEar.rotation.z = -0.25;
    batGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, mat);
    rightEar.position.set(0.038 * scale, 0.055 * scale, 0.12 * scale);
    rightEar.rotation.z = 0.25;
    batGroup.add(rightEar);

    // 3. Articulated Scalloped Wings (built in the horizontal XZ plane, flapping in Y)
    // Left Wing Shape (XY in 2D, where X = lateral span, Y = forward/backward along body)
    const leftShape = new THREE.Shape();
    leftShape.moveTo(0, 0.04 * scale); // Shoulder
    leftShape.lineTo(-0.26 * scale, 0.10 * scale); // Curved forearm
    leftShape.lineTo(-0.76 * scale, 0.05 * scale); // Extended wingtip
    // Scalloped trailing edge arches
    leftShape.quadraticCurveTo(-0.60 * scale, -0.06 * scale, -0.48 * scale, -0.16 * scale);
    leftShape.quadraticCurveTo(-0.34 * scale, -0.05 * scale, -0.24 * scale, -0.18 * scale);
    leftShape.quadraticCurveTo(-0.12 * scale, -0.04 * scale, 0, -0.14 * scale); // Wing root at lower spine
    leftShape.closePath();

    const leftWingGeo = new THREE.ShapeGeometry(leftShape);
    // Rotate so 2D (x, y) maps to 3D horizontal plane (x, z)
    leftWingGeo.rotateX(-Math.PI / 2);

    const leftWingPivot = new THREE.Group();
    leftWingPivot.position.set(-0.035 * scale, 0.015 * scale, 0);
    const leftWingMesh = new THREE.Mesh(leftWingGeo, mat);
    leftWingPivot.add(leftWingMesh);
    batGroup.add(leftWingPivot);

    // Right Wing Shape
    const rightShape = new THREE.Shape();
    rightShape.moveTo(0, 0.04 * scale);
    rightShape.lineTo(0.26 * scale, 0.10 * scale);
    rightShape.lineTo(0.76 * scale, 0.05 * scale); // Wingtip
    rightShape.quadraticCurveTo(0.60 * scale, -0.06 * scale, 0.48 * scale, -0.16 * scale);
    rightShape.quadraticCurveTo(0.34 * scale, -0.05 * scale, 0.24 * scale, -0.18 * scale);
    rightShape.quadraticCurveTo(0.12 * scale, -0.04 * scale, 0, -0.14 * scale);
    rightShape.closePath();

    const rightWingGeo = new THREE.ShapeGeometry(rightShape);
    rightWingGeo.rotateX(-Math.PI / 2);

    const rightWingPivot = new THREE.Group();
    rightWingPivot.position.set(0.035 * scale, 0.015 * scale, 0);
    const rightWingMesh = new THREE.Mesh(rightWingGeo, mat);
    rightWingPivot.add(rightWingMesh);
    batGroup.add(rightWingPivot);

    return {
      mesh: batGroup,
      leftWing: leftWingPivot,
      rightWing: rightWingPivot,
      mat
    };
  }

  initSwarm(count) {
    for (let i = 0; i < count; i++) {
      // 3 distinct depth tiers:
      let zTier, scale, speedMultiplier;
      if (i < 3) {
        // Tier 1: Foreground swift swoops (Z: -20 to -24)
        zTier = -21.5 + (Math.random() - 0.5) * 4;
        scale = 1.35 + Math.random() * 0.25;
        speedMultiplier = 1.25;
      } else if (i < 6) {
        // Tier 2: Lunar crossing bats (Z: -32 to -35)
        zTier = -33.5 + (Math.random() - 0.5) * 3;
        scale = 0.92 + Math.random() * 0.18;
        speedMultiplier = 1.0;
      } else {
        // Tier 3: Distant high sky flutterers (Z: -39 to -45)
        zTier = -41.0 + (Math.random() - 0.5) * 5;
        scale = 0.60 + Math.random() * 0.14;
        speedMultiplier = 0.85;
      }

      const batObj = this.createBatMesh(scale);

      // Staggered launch logic:
      // 3 bats already active on page load, rest have staggered delays
      const isInitiallyActive = i < 3;
      let initialProgress = 0.0;
      if (i === 0) initialProgress = 0.38; // Crossing the moon right now!
      else if (i === 1) initialProgress = 0.18;
      else if (i === 2) initialProgress = 0.02;

      const spawnDelay = isInitiallyActive ? 0.0 : 3.5 + (i - 2) * 5.0 + Math.random() * 3.0;

      const bat = {
        ...batObj,
        scale,
        zTier,
        speedMultiplier,
        state: isInitiallyActive ? 'FLYING' : 'WAITING',
        delayTimer: spawnDelay,
        progress: initialProgress,
        flightDuration: (9.5 + Math.random() * 5.0) / speedMultiplier,
        direction: (i % 2 === 0) ? 1 : -1, // Alternating Left-to-Right and Right-to-Left
        behavior: Math.random() > 0.45 ? 'CROSS' : 'LINGER',
        lingerTime: 0,
        maxLingerTime: 5.0 + Math.random() * 6.0,
        flapFreq: 11 + Math.random() * 4,
        seed: Math.random() * 100,
        curve: null
      };

      this.generateFlightPath(bat);
      this.group.add(bat.mesh);
      this.bats.push(bat);
    }
  }

  generateFlightPath(bat) {
    const dir = bat.direction; // 1 = Left to Right, -1 = Right to Left
    const startX = dir === 1 ? -48 - Math.random() * 8 : 48 + Math.random() * 8;
    const endX = dir === 1 ? 48 + Math.random() * 8 : -48 - Math.random() * 8;

    // Y altitude ranges from 7 to 17
    const startY = 7.5 + Math.random() * 6.5;
    const midY = 11.8 + (Math.random() - 0.5) * 4.0;
    const endY = 8.5 + Math.random() * 6.5;

    const startZ = bat.zTier + (Math.random() - 0.5) * 2;
    const midZ = bat.zTier + (Math.random() - 0.5) * 2.5;
    const endZ = bat.zTier + (Math.random() - 0.5) * 2;

    if (bat.behavior === 'LINGER') {
      // Thermal swoop trajectory: enters, loops near the Moon, and exits
      const loopX1 = dir === 1 ? -6 : 6;
      const loopX2 = dir === 1 ? 8 : -8;
      const loopY1 = 13.5 + Math.random() * 2.0;
      const loopY2 = 11.0 - Math.random() * 1.5;

      const p0 = new THREE.Vector3(startX, startY, startZ);
      const p1 = new THREE.Vector3(startX * 0.4, startY + 2.0, midZ);
      const p2 = new THREE.Vector3(loopX1, loopY1, midZ + 1.0);
      const p3 = new THREE.Vector3(loopX2, loopY2, midZ - 1.0);
      const p4 = new THREE.Vector3(endX * 0.4, endY + 1.5, endZ);
      const p5 = new THREE.Vector3(endX, endY, endZ);

      bat.curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3, p4, p5]);
    } else {
      // Direct graceful cross-screen spline
      const p0 = new THREE.Vector3(startX, startY, startZ);
      const p1 = new THREE.Vector3(startX * 0.45, startY + (Math.random() - 0.5) * 3, midZ);
      const p2 = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        midY,
        midZ
      );
      const p3 = new THREE.Vector3(endX * 0.45, endY + (Math.random() - 0.5) * 3, endZ);
      const p4 = new THREE.Vector3(endX, endY, endZ);

      bat.curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3, p4]);
    }
  }

  respawnBat(bat) {
    // Randomize direction and behavior on each respawn
    bat.direction = Math.random() > 0.5 ? 1 : -1;
    bat.behavior = Math.random() > 0.45 ? 'CROSS' : 'LINGER';
    bat.lingerTime = 0;
    bat.progress = 0.0;
    bat.flightDuration = (9.0 + Math.random() * 6.0) / bat.speedMultiplier;
    bat.state = 'FLYING';

    this.generateFlightPath(bat);
  }

  update(delta, elapsed) {
    for (let i = 0; i < this.bats.length; i++) {
      const bat = this.bats[i];

      // 1. Handle Waiting / Delayed State
      if (bat.state === 'WAITING') {
        bat.delayTimer -= delta;
        bat.mesh.visible = false;
        if (bat.delayTimer <= 0) {
          this.respawnBat(bat);
          bat.mesh.visible = true;
        }
        continue;
      }

      // 2. Flying State
      bat.mesh.visible = true;

      // Lingering thermals slow down near the moon
      if (bat.behavior === 'LINGER' && bat.progress > 0.35 && bat.progress < 0.65) {
        bat.lingerTime += delta;
        if (bat.lingerTime < bat.maxLingerTime) {
          bat.progress += (delta / bat.flightDuration) * 0.38;
        } else {
          bat.progress += delta / bat.flightDuration;
        }
      } else {
        bat.progress += delta / bat.flightDuration;
      }

      // 3. Screen Exit
      if (bat.progress >= 1.0) {
        bat.state = 'WAITING';
        // Natural rest delay between 6 and 18 seconds
        bat.delayTimer = 6.0 + Math.random() * 12.0;
        bat.mesh.visible = false;
        continue;
      }

      // 4. Sample 3D Flight Position & Forward Tangent
      const currentPoint = bat.curve.getPoint(bat.progress);
      const bobY = Math.sin(elapsed * (bat.flapFreq * 0.75) + bat.seed) * 0.10;

      bat.mesh.position.set(currentPoint.x, currentPoint.y + bobY, currentPoint.z);

      // Tangent for forward flight direction
      const tangent = bat.curve.getTangent(bat.progress).normalize();
      bat.mesh.lookAt(
        currentPoint.x + tangent.x,
        currentPoint.y + bobY + tangent.y,
        currentPoint.z + tangent.z
      );

      // Aerodynamic banking roll into curves
      const bankRoll = -tangent.x * 0.45;
      bat.mesh.rotateZ(bankRoll);

      // 5. Vertical Wing Flapping & Aerodynamic Gliding
      // Natural cadence: rhythmic bursts of flaps interleaved with dihedral glides
      const glideCycle = Math.sin(elapsed * 1.8 + bat.seed);
      let flapAngle = 0.08;

      if (glideCycle > -0.15) {
        // Active flapping cycle: lift wings up and down around Z axis
        flapAngle = Math.sin(elapsed * bat.flapFreq + bat.seed) * 0.52;
      } else {
        // Aerodynamic dihedral glide: wings held slightly V-shaped
        flapAngle = 0.08;
      }

      bat.leftWing.rotation.z = flapAngle;
      bat.rightWing.rotation.z = -flapAngle;

      // 6. Moonlight Rim Glow:
      // Subtle silver highlight along wing margins when in moonlight / near the moon
      const distToMoon = bat.mesh.position.distanceTo(this.moonPos);
      const proximityGlow = Math.max(0.0, 1.0 - distToMoon / 24.0);
      bat.mat.emissiveIntensity = 0.01 + proximityGlow * 0.08;
    }
  }

  /**
   * Harmonizes bat moonlight rim sheen with the active Halloween lunar color.
   */
  setMoonlightColor(color) {
    for (let i = 0; i < this.bats.length; i++) {
      if (this.bats[i].mat) {
        const rimColor = new THREE.Color(0xdce7f8).lerp(color, 0.40);
        this.bats[i].mat.emissive.copy(rimColor);
      }
    }
  }
}

