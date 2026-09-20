import * as THREE from 'three';

/**
 * The Otherworld of Happiness:
 * A brightly and warmly lit celestial meadow with:
 * - Distant ancient gentle tombstones
 * - A skeleton half-buried in the ground, completely covered in blooming flowers and vines
 * - Drifting flower petals and warm golden sunlight
 */
export class OtherworldScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffeedb);
    this.scene.fog = new THREE.FogExp2(0xffe2c4, 0.015);

    this.initLighting();
    this.createMeadow();
    this.createDistantTombstones();
    this.createFlowerCoveredSkeleton();
    this.createDriftingPetals(40);
  }

  initLighting() {
    // Warm celestial ambient light
    const ambient = new THREE.AmbientLight(0xffecd6, 1.8);
    this.scene.add(ambient);

    // Warm golden directional sunlight
    const sunLight = new THREE.DirectionalLight(0xfff3d6, 2.4);
    sunLight.position.set(12, 24, 18);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    this.scene.add(sunLight);

    // Soft sky rim light
    const skyLight = new THREE.HemisphereLight(0xfff0dc, 0xd8b589, 1.2);
    this.scene.add(skyLight);
  }

  createMeadow() {
    // Gentle rolling golden meadow
    const meadowGeo = new THREE.PlaneGeometry(120, 120, 32, 32);
    
    // Deform vertices for gentle rolling hills
    const pos = meadowGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const hill = Math.sin(x * 0.08) * Math.cos(y * 0.08) * 1.8;
      pos.setZ(i, hill);
    }
    meadowGeo.computeVertexNormals();

    const meadowMat = new THREE.MeshStandardMaterial({
      color: 0x82964b, // Warm lush meadow moss
      roughness: 0.9,
      metalness: 0.05
    });

    this.meadowMesh = new THREE.Mesh(meadowGeo, meadowMat);
    this.meadowMesh.rotation.x = -Math.PI / 2;
    this.meadowMesh.position.set(0, -0.5, -5);
    this.meadowMesh.receiveShadow = true;
    this.scene.add(this.meadowMesh);
  }

  createDistantTombstones() {
    const tombMat = new THREE.MeshStandardMaterial({
      color: 0xc4b7a6,
      roughness: 0.85
    });

    const positions = [
      [-14, 0.4, -28],
      [-19, 0.8, -35],
      [-8, 0.2, -32],
      [12, 0.5, -26],
      [18, 0.9, -34],
      [7, 0.3, -38]
    ];

    positions.forEach(([x, y, z]) => {
      const geo = new THREE.BoxGeometry(1.2, 1.8, 0.35);
      const mesh = new THREE.Mesh(geo, tombMat);
      mesh.position.set(x, y, z);
      mesh.rotation.y = (Math.random() - 0.5) * 0.4;
      mesh.rotation.z = (Math.random() - 0.5) * 0.1;
      mesh.castShadow = true;
      this.scene.add(mesh);
    });
  }

  /**
   * The peaceful skeleton half-buried in the meadow, lavishly adorned with blooming flowers
   */
  createFlowerCoveredSkeleton() {
    this.skeletonGroup = new THREE.Group();
    this.skeletonGroup.position.set(0, 0.2, 0);

    // Aged ivory bone material
    const boneMat = new THREE.MeshStandardMaterial({
      color: 0xede4d1,
      roughness: 0.75,
      metalness: 0.05
    });

    // 1. Skull resting peacefully tilted back
    const skullGroup = new THREE.Group();
    const craniumGeo = new THREE.SphereGeometry(0.55, 16, 16);
    craniumGeo.scale(1.0, 1.15, 1.25);
    const cranium = new THREE.Mesh(craniumGeo, boneMat);
    skullGroup.add(cranium);

    // Eye sockets
    const socketMat = new THREE.MeshBasicMaterial({ color: 0x241d18 });
    const socketGeo = new THREE.CircleGeometry(0.14, 8);
    
    const leftEye = new THREE.Mesh(socketGeo, socketMat);
    leftEye.position.set(-0.2, -0.05, 0.65);
    leftEye.rotation.x = -0.15;
    skullGroup.add(leftEye);

    const rightEye = new THREE.Mesh(socketGeo, socketMat);
    rightEye.position.set(0.2, -0.05, 0.65);
    rightEye.rotation.x = -0.15;
    skullGroup.add(rightEye);

    skullGroup.position.set(0, 0.35, -1.8);
    skullGroup.rotation.x = -0.35; // Head titled gently back
    skullGroup.rotation.y = 0.15;
    this.skeletonGroup.add(skullGroup);

    // 2. Ribcage half-buried in earth
    for (let r = 0; r < 5; r++) {
      const ribGeo = new THREE.TorusGeometry(0.7 - r * 0.06, 0.05, 8, 16, Math.PI * 0.9);
      const rib = new THREE.Mesh(ribGeo, boneMat);
      rib.rotation.x = Math.PI / 2;
      rib.rotation.z = Math.PI * 0.05;
      rib.position.set(0, 0.15, -0.8 + r * 0.35);
      this.skeletonGroup.add(rib);
    }

    // 3. Resting Arm Bones
    const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8);
    const leftArm = new THREE.Mesh(armGeo, boneMat);
    leftArm.rotation.z = Math.PI / 3;
    leftArm.rotation.y = 0.2;
    leftArm.position.set(-1.1, 0.1, -0.4);
    this.skeletonGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, boneMat);
    rightArm.rotation.z = -Math.PI / 3;
    rightArm.rotation.y = -0.2;
    rightArm.position.set(1.1, 0.1, -0.4);
    this.skeletonGroup.add(rightArm);

    // 4. Blooming Flowers & Floral Crown covering the skeleton
    this.createFlowerEmbellishments();

    this.scene.add(this.skeletonGroup);
  }

  createFlowerEmbellishments() {
    const flowerColors = [
      0xffa726, // Golden Mexican Marigold (Day of the Dead / Elysium)
      0xff5722, // Deep Orange Blossom
      0xe91e63, // Vibrant Pink Rose
      0xffeb3b, // Sunny Yellow Buttercup
      0xab47bc, // Violet Morning Glory
      0x4caf50  // Lush Green Ivy Leaves
    ];

    // Create a crown of marigolds around the skull
    const crownCount = 14;
    for (let i = 0; i < crownCount; i++) {
      const angle = (i / crownCount) * Math.PI * 2;
      const col = flowerColors[i % flowerColors.length];
      const flower = this.createSingleFlower(col);
      
      const r = 0.58;
      const x = Math.cos(angle) * r;
      const y = 0.35 + Math.sin(angle) * (r * 0.8) + 0.15;
      const z = -1.8 + Math.sin(angle) * 0.3;

      flower.position.set(x, y, z);
      flower.scale.setScalar(0.7 + Math.random() * 0.5);
      this.skeletonGroup.add(flower);
    }

    // Flowers blooming along the ribcage and spilling onto the meadow
    const meadowBloomCount = 38;
    for (let i = 0; i < meadowBloomCount; i++) {
      const col = flowerColors[Math.floor(Math.random() * flowerColors.length)];
      const flower = this.createSingleFlower(col);

      const x = (Math.random() - 0.5) * 3.4;
      const z = -2.2 + Math.random() * 3.2;
      const y = 0.05 + Math.random() * 0.25;

      flower.position.set(x, y, z);
      flower.rotation.y = Math.random() * Math.PI * 2;
      flower.scale.setScalar(0.6 + Math.random() * 0.6);
      this.skeletonGroup.add(flower);
    }
  }

  createSingleFlower(colorHex) {
    const group = new THREE.Group();
    const petalCount = 6;
    const petalMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.6,
      side: THREE.DoubleSide
    });

    const petalGeo = new THREE.ConeGeometry(0.12, 0.28, 5);
    petalGeo.rotateX(Math.PI / 2);

    for (let p = 0; p < petalCount; p++) {
      const angle = (p / petalCount) * Math.PI * 2;
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.rotation.z = angle;
      petal.position.set(Math.cos(angle) * 0.1, Math.sin(angle) * 0.1, 0);
      group.add(petal);
    }

    // Center pistil
    const centerMat = new THREE.MeshStandardMaterial({ color: 0xffd54f, roughness: 0.4 });
    const centerMesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), centerMat);
    group.add(centerMesh);

    group.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.3;
    return group;
  }

  createDriftingPetals(count) {
    this.petals = [];
    const petalGeo = new THREE.PlaneGeometry(0.16, 0.22);
    const petalMat = new THREE.MeshStandardMaterial({
      color: 0xffb74d,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(petalGeo, petalMat);
      const x = (Math.random() - 0.5) * 16;
      const y = 0.2 + Math.random() * 6;
      const z = -6 + (Math.random() - 0.5) * 12;

      mesh.position.set(x, y, z);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

      this.petals.push({
        mesh,
        speedY: 0.2 + Math.random() * 0.3,
        speedX: 0.3 + Math.random() * 0.4,
        rotSpeed: 1.2 + Math.random() * 2
      });

      this.scene.add(mesh);
    }
  }

  update(delta, elapsed) {
    // Drifting flower petals floating in the gentle breeze
    this.petals.forEach(p => {
      p.mesh.position.y -= p.speedY * delta;
      p.mesh.position.x += Math.sin(elapsed * 1.5 + p.mesh.position.y) * delta * p.speedX;
      p.mesh.rotation.x += delta * p.rotSpeed;
      p.mesh.rotation.y += delta * p.rotSpeed * 0.7;

      if (p.mesh.position.y < 0) {
        p.mesh.position.y = 5.5;
        p.mesh.position.x = (Math.random() - 0.5) * 16;
      }
    });
  }
}
