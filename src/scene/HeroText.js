import * as THREE from 'three';

/**
 * Monumental 3D Title Card: "ALL HALLOWS' EVE"
 * - Solid filled, tall, thin classical title typography (Cinzel in All-Caps)
 * - Appears towering from behind dark, jagged distant mountain silhouettes at the horizon
 * - Majestic lunar silver & chiselled limestone fill catching cold nocturnal rim light
 * - Dynamically harmonizes with cello musical lunar color cycle
 */
export class HeroText {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Title card stationed at the horizon at Z = -108.0
    // Elevated so letters tower from behind the distant mountain silhouettes
    this.position = new THREE.Vector3(0, 24.0, -108.0);
    this.group.position.copy(this.position);

    this.currentLunarColor = new THREE.Color(0x3d7ef5);

    this.initMountains();
    this.initText();
  }

  initMountains() {
    // Distant dark jagged mountain ridge positioned directly in front of the text plane
    // at Z = -101.0 (text is at Z = -108.0), creating the dramatic title card reveal
    this.mountainGroup = new THREE.Group();
    this.mountainGroup.position.set(0, 0, 7.0); // Local to hero text group (so Z ~ -101 in world)
    this.group.add(this.mountainGroup);

    // Sculpt multi-peak jagged alpine mountain range geometry
    const mountainGeo = new THREE.PlaneGeometry(280.0, 44.0, 320, 24);
    const posAttr = mountainGeo.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < posAttr.count; i++) {
      vertex.fromBufferAttribute(posAttr, i);

      const u = (vertex.x + 140.0) / 280.0; // 0 to 1 across range
      const v = (vertex.y + 22.0) / 44.0;   // 0 (base) to 1 (ridge)

      if (v > 0.05) {
        // Multi-octave sharp jagged crags and alpine needle peaks (using folded abs sines)
        const n1 = Math.abs(Math.sin(u * 9.8 + 0.45)) * 9.2;
        const n2 = Math.abs(Math.cos(u * 21.0 + 1.2)) * 4.6;
        const n3 = Math.abs(Math.sin(u * 44.0 + 0.8)) * 2.1;
        const needle = Math.pow(Math.abs(Math.sin(u * 86.0)), 3.0) * 1.6;

        // Mountain pass notch in center where the empty road cuts through to the horizon
        const centerPass = Math.exp(-Math.pow((u - 0.5) * 5.8, 2.0));
        const ridgeProfile = (n1 + n2 + n3 + needle) * (1.0 - centerPass * 0.86);

        // Displace top edge with sharp jagged mountain peaks
        const mountainHeight = Math.max(0.0, ridgeProfile * Math.pow(v, 1.15));
        vertex.y = -22.0 + mountainHeight;
      } else {
        vertex.y = -22.0; // Flat base at ground level
      }

      posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    mountainGeo.computeVertexNormals();

    // Dark atmospheric mountain silhouette material with cold moonlight crest rim
    this.mountainMat = new THREE.ShaderMaterial({
      uniforms: {
        uLunarColor: { value: this.currentLunarColor },
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 worldP = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldP.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldP;
        }
      `,
      fragmentShader: `
        uniform vec3 uLunarColor;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPos;

        void main() {
          // Atmospheric nocturnal mountain silhouette:
          // Deep basalt shadow base fading to cold moonlit crag rim at ridge tops
          vec3 deepBasalt = vec3(0.04, 0.05, 0.08);
          vec3 midCrag = vec3(0.08, 0.11, 0.16);
          vec3 moonlitRidge = vec3(0.32, 0.40, 0.52);

          float ridgeFactor = smoothstep(0.40, 0.98, vUv.y);
          vec3 col = mix(deepBasalt, midCrag, ridgeFactor * 0.75);

          // Cold moonlight crest highlight along sharp mountain tops
          float crest = pow(smoothstep(0.72, 1.0, vUv.y), 3.0);
          col += mix(moonlitRidge, uLunarColor, 0.15) * crest * 0.90;

          // Atmospheric depth haze blending
          float haze = smoothstep(-22.0, 16.0, vWorldPos.y);
          col = mix(deepBasalt * 0.65, col, haze);

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.DoubleSide
    });

    const mountainMesh = new THREE.Mesh(mountainGeo, this.mountainMat);
    mountainMesh.position.set(0, -6.0, 0); // Positioned so ridges peak around Y = 8 to 16
    mountainMesh.renderOrder = 1;
    this.mountainGroup.add(mountainMesh);
  }

  initText() {
    // 1. High-resolution canvas rendering solid filled, tall, thin title card "ALL HALLOWS' EVE"
    const canvas = document.createElement('canvas');
    canvas.width = 5120;
    canvas.height = 1400;
    const ctx = canvas.getContext('2d');

    const renderCanvasText = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Spaced all-caps title card: ALL HALLOWS' EVE
      const text = "A L L   H A L L O W S '   E V E";
      let fontSize = 320;
      ctx.font = `700 ${fontSize}px "Cinzel", "Cormorant Garamond", serif`;
      let textWidth = ctx.measureText(text).width;
      const maxAllowedWidth = canvas.width * 0.88;
      if (textWidth > maxAllowedWidth) {
        fontSize = Math.floor(fontSize * (maxAllowedWidth / textWidth));
        ctx.font = `700 ${fontSize}px "Cinzel", "Cormorant Garamond", serif`;
      }

      const centerY = canvas.height * 0.48;

      // 1. Atmospheric ambient shadow behind letters
      ctx.shadowColor = 'rgba(0, 0, 0, 0.92)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 20;

      // 2. 100% PURE SOLID FILLED letters with majestic lunar silver / limestone gradient
      // (NO strokeText, NO hollow outlines - pure solid fill)
      const fillGrad = ctx.createLinearGradient(0, centerY - fontSize * 0.55, 0, centerY + fontSize * 0.55);
      fillGrad.addColorStop(0.0, '#ffffff'); // Pure incandescent silver-white crest
      fillGrad.addColorStop(0.35, '#f4f8fc');
      fillGrad.addColorStop(0.70, '#dce6f2');
      fillGrad.addColorStop(1.0, '#b2c4da');  // Solid limestone base

      ctx.fillStyle = fillGrad;
      ctx.fillText(text, canvas.width / 2, centerY);

      // 3. Procedural micro-grain for authentic architectural stone
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 16) {
        if (data[i + 3] > 60) {
          const grain = (Math.random() - 0.5) * 16;
          data[i] = Math.min(255, Math.max(0, data[i] + grain));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain + 2));
        }
      }
      ctx.putImageData(imgData, 0, 0);

      if (this.texture) {
        this.texture.needsUpdate = true;
      }
    };

    // Initial render + re-renders when fonts are ready
    renderCanvasText();
    if (document.fonts) {
      document.fonts.ready.then(() => {
        renderCanvasText();
      });
      document.fonts.load('700 320px "Cinzel"').then(() => {
        renderCanvasText();
      }).catch(() => {});
    }

    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 16;
    this.texture.generateMipmaps = true;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;

    // 2. Colossal 160x44 unit stone title plane standing at Z = -108.0
    const textGeo = new THREE.PlaneGeometry(160.0, 44.0);

    // Luminous solid stone title shader material
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tText: { value: this.texture },
        uLunarColor: { value: this.currentLunarColor },
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPos;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 worldP = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldP.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldP;
        }
      `,
      fragmentShader: `
        uniform sampler2D tText;
        uniform vec3 uLunarColor;
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPos;

        void main() {
          vec4 tex = texture2D(tText, vUv);
          if (tex.a < 0.08) discard;

          // Pure solid luminous limestone title card catching subtle nocturnal moonlight
          vec3 litColor = tex.rgb * mix(vec3(0.96, 0.98, 1.0), uLunarColor, 0.12);

          gl_FragColor = vec4(litColor, tex.a);
        }
      `,
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(textGeo, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.renderOrder = 0;
    this.group.add(this.mesh);
  }

  setMoonlightColor(color) {
    this.currentLunarColor.copy(color);
    if (this.material && this.material.uniforms.uLunarColor) {
      this.material.uniforms.uLunarColor.value.copy(color);
    }
    if (this.mountainMat && this.mountainMat.uniforms.uLunarColor) {
      this.mountainMat.uniforms.uLunarColor.value.copy(color);
    }
  }

  update(delta, elapsed) {
    if (this.material && this.material.uniforms.uTime) {
      this.material.uniforms.uTime.value = elapsed;
    }
    if (this.mountainMat && this.mountainMat.uniforms.uTime) {
      this.mountainMat.uniforms.uTime.value = elapsed;
    }
  }
}
