import * as THREE from 'three';

/**
 * 3D Dark Empty Asphalt Road:
 * - High-resolution asphalt texture from generated asset (/textures/road texture_generated.png)
 * - Authentic gravel shoulder margins
 * - Physically reacts to the pumpkin's internal firelight and ambient nocturnal illumination
 */
export class Road {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.initRoadSurface();
    this.initRoadShoulders();
  }

  initRoadSurface() {
    const textureLoader = new THREE.TextureLoader();
    const roadTexture = textureLoader.load('/textures/road texture_generated.png', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      // Repeat along the vast highway length for aggregate scale and lane stripe continuity
      tex.repeat.set(1.4, 26.0);
      tex.anisotropy = 16;
      tex.needsUpdate = true;
    });

    // Vast asphalt road ribbon (width: 9.6, length: 260, stretching far into the nocturnal horizon)
    const roadGeo = new THREE.PlaneGeometry(9.6, 260, 32, 128);
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTexture,
      bumpMap: roadTexture,
      bumpScale: 0.065,
      roughness: 0.72,
      metalness: 0.05,
      color: new THREE.Color(0x656e7e) // Clearly visible nocturnal asphalt tone under moonlight
    });

    this.roadMesh = new THREE.Mesh(roadGeo, roadMat);
    this.roadMesh.rotation.x = -Math.PI * 0.5;
    this.roadMesh.position.set(0, 0, -115);
    this.roadMesh.receiveShadow = true;
    this.group.add(this.roadMesh);
  }

  initRoadShoulders() {
    // Vast bumpy barren earth terrain flanking both sides of the highway
    const width = 160;
    const length = 260;
    const segX = 96;
    const segY = 128;

    const createBumpyShoulderGeo = (isLeft) => {
      const geo = new THREE.PlaneGeometry(width, length, segX, segY);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const lx = pos.getX(i);
        const ly = pos.getY(i);
        const worldX = isLeft ? (-width * 0.5 - 4.8 + lx) : (width * 0.5 + 4.8 + lx);
        const worldZ = -115 + ly;

        // Multi-frequency natural barren soil & gravel bumps
        const largeMound = Math.sin(worldX * 0.045) * Math.cos(worldZ * 0.035) * 0.55;
        const mediumDips = Math.sin(worldX * 0.15 + worldZ * 0.12) * 0.25;
        const fineRocky = Math.sin(worldX * 0.65 - worldZ * 0.45) * 0.09;
        const totalHeight = largeMound + mediumDips + fineRocky;

        // Taper height to 0 right at the asphalt road edge (X = +/-4.8)
        const distFromRoad = Math.abs(worldX) - 4.8;
        const edgeBlend = THREE.MathUtils.smoothstep(distFromRoad, 0.0, 8.0);

        pos.setZ(i, totalHeight * edgeBlend);
      }
      geo.computeVertexNormals();
      return geo;
    };

    // Procedural canvas bump texture for natural gravel and soil grain
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(512, 512);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const noise = Math.floor(Math.random() * 85 + 40);
      imgData.data[i] = noise;
      imgData.data[i + 1] = noise;
      imgData.data[i + 2] = noise;
      imgData.data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    const soilNoiseTex = new THREE.CanvasTexture(canvas);
    soilNoiseTex.wrapS = THREE.RepeatWrapping;
    soilNoiseTex.wrapT = THREE.RepeatWrapping;
    soilNoiseTex.repeat.set(16, 26);

    const shoulderMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x242832), // Dark weathered soil/gravel clearly visible under nocturnal light
      bumpMap: soilNoiseTex,
      bumpScale: 0.05,
      roughness: 0.94,
      metalness: 0.04
    });

    const leftGeo = createBumpyShoulderGeo(true);
    const leftShoulder = new THREE.Mesh(leftGeo, shoulderMat);
    leftShoulder.rotation.x = -Math.PI * 0.5;
    leftShoulder.position.set(-width * 0.5 - 4.8, -0.02, -115);
    leftShoulder.receiveShadow = true;
    this.group.add(leftShoulder);

    const rightGeo = createBumpyShoulderGeo(false);
    const rightShoulder = new THREE.Mesh(rightGeo, shoulderMat);
    rightShoulder.rotation.x = -Math.PI * 0.5;
    rightShoulder.position.set(width * 0.5 + 4.8, -0.02, -115);
    rightShoulder.receiveShadow = true;
    this.group.add(rightShoulder);
  }

  update(delta, elapsed) {
    // Road state
  }
}
