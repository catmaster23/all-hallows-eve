import * as THREE from 'three';

/**
 * Vintage roadside iron lampposts along Route 13:
 * Half working with flickering amber cones, half broken/dark with cracked casings.
 */
export class Lampposts {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.workingLamps = [];

    this.buildLampposts();
    this.scene.add(this.group);
  }

  createLamppostMesh(isWorking) {
    const postGroup = new THREE.Group();

    // Dark rusted iron material
    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x18141c,
      roughness: 0.85,
      metalness: 0.4
    });

    // 1. Base pedestal & Main upright column
    const baseGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.6, 8);
    const baseMesh = new THREE.Mesh(baseGeo, ironMat);
    baseMesh.position.y = 0.3;
    postGroup.add(baseMesh);

    const poleGeo = new THREE.CylinderGeometry(0.12, 0.18, 5.2, 8);
    const poleMesh = new THREE.Mesh(poleGeo, ironMat);
    poleMesh.position.y = 3.2;
    postGroup.add(poleMesh);

    // 2. Arched overhead bracket
    const armCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 5.6, 0),
      new THREE.Vector3(0.4, 6.1, 0),
      new THREE.Vector3(1.1, 6.2, 0),
      new THREE.Vector3(1.4, 5.8, 0)
    ]);
    const armGeo = new THREE.TubeGeometry(armCurve, 16, 0.08, 6, false);
    const armMesh = new THREE.Mesh(armGeo, ironMat);
    postGroup.add(armMesh);

    // 3. Hanging lantern housing
    const lanternRoofGeo = new THREE.ConeGeometry(0.45, 0.35, 6);
    const lanternRoof = new THREE.Mesh(lanternRoofGeo, ironMat);
    lanternRoof.position.set(1.4, 5.75, 0);
    postGroup.add(lanternRoof);

    let bulbLight = null;
    let glassMat = null;

    if (isWorking) {
      // Warm glowing amber glass
      glassMat = new THREE.MeshStandardMaterial({
        color: 0xffe099,
        emissive: 0xffaa22,
        emissiveIntensity: 1.8,
        roughness: 0.3
      });

      // SpotLight pointing down onto the asphalt
      bulbLight = new THREE.SpotLight(0xffb74d, 3.2, 16, Math.PI * 0.32, 0.6, 1.4);
      bulbLight.position.set(1.4, 5.4, 0);
      bulbLight.target.position.set(1.4, 0, 0);
      postGroup.add(bulbLight);
      postGroup.add(bulbLight.target);
    } else {
      // Dark broken shattered glass
      glassMat = new THREE.MeshStandardMaterial({
        color: 0x221a12,
        emissive: 0x000000,
        roughness: 0.9,
        opacity: 0.7,
        transparent: true
      });
      // Crooked angle for broken post
      postGroup.rotation.z = (Math.random() - 0.5) * 0.12;
      postGroup.rotation.x = (Math.random() - 0.5) * 0.08;
    }

    const glassGeo = new THREE.CylinderGeometry(0.28, 0.2, 0.55, 6);
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.position.set(1.4, 5.35, 0);
    postGroup.add(glassMesh);

    return {
      mesh: postGroup,
      light: bulbLight,
      isWorking,
      flickerOffset: Math.random() * 10
    };
  }

  buildLampposts() {
    // Street lamp posts placed along shoulders from near camera into the dark horizon
    const zPositions = [8, 0, -8, -16, -24, -32, -42, -52, -64];

    zPositions.forEach((z, idx) => {
      // Alternate roughly half working and half broken
      const leftWorking = (idx % 2 === 0);
      const rightWorking = (idx % 3 === 0);

      // Left lamppost (faces towards road at +X)
      const leftObj = this.createLamppostMesh(leftWorking);
      leftObj.mesh.position.set(-7.8, 0, z);
      leftObj.mesh.rotation.y = 0; // Arm points toward center of road
      this.group.add(leftObj.mesh);
      if (leftWorking) this.workingLamps.push(leftObj);

      // Right lamppost (faces towards road at -X)
      const rightObj = this.createLamppostMesh(rightWorking);
      rightObj.mesh.position.set(7.8, 0, z + 4);
      rightObj.mesh.rotation.y = Math.PI; // Arm points toward road
      this.group.add(rightObj.mesh);
      if (rightWorking) this.workingLamps.push(rightObj);
    });
  }

  update(delta, elapsed) {
    // Realistic electrical flickering on working lamps
    this.workingLamps.forEach(lamp => {
      const noise = Math.sin(elapsed * 9 + lamp.flickerOffset) * 0.35 +
                    Math.cos(elapsed * 18 + lamp.flickerOffset * 2) * 0.2;
      
      // Occasional brownout stutter
      const brownout = Math.random() < 0.02 ? 0.2 : 1.0;
      const intensity = Math.max(0.4, (2.8 + noise) * brownout);

      if (lamp.light) {
        lamp.light.intensity = intensity;
      }
    });
  }
}
