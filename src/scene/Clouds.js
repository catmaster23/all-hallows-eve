import * as THREE from 'three';

/**
 * Photorealistic Volumetric 3D Panoramic Cloud System:
 * - Direct integration of high-resolution photographic cloud formations from
 *   uploaded cloud textures (cloud texture 1, 2, and 3).
 * - Multi-depth 3D layering:
 *     - Majestic towering cumulus banks rising across the lower & mid sky (Z = -26 to -29)
 *     - Deep cosmic cirrostratus & noctilucent veils drifting BEHIND the Moon (Z = -41 to -45)
 *     - Translucent wispy cirrus veils drifting IN FRONT OF the Moon (Z = -33.4)
 *     - Foreground atmospheric mists (Z = -22)
 * - Complete panoramic coverage across the entire widescreen (X = -85 to +85)
 * - Mathematical UV edge masks and buffer border clearing eliminating any faint lines or moving edges.
 * - Dynamic physical moonlight illumination synced with the Halloween lunar color progression.
 */

const cloudVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const cloudFragmentShader = `
  uniform sampler2D tCloud;
  uniform float uTime;
  uniform vec3 uMoonPos;
  uniform vec3 uMoonColor;
  uniform vec3 uDarkColor;
  uniform float uOpacity;
  uniform float uCurlScale;

  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    // 1. Organic internal wind curl / boiling billow turbulence
    vec2 uv = vUv;
    float t = uTime * 0.05;
    vec2 flow1 = vec2(sin(uv.y * 5.5 + t), cos(uv.x * 4.8 - t * 0.8)) * uCurlScale;
    vec2 flow2 = vec2(cos(uv.y * 8.5 - t * 0.6), sin(uv.x * 7.8 + t * 0.7)) * (uCurlScale * 0.5);
    vec2 distortedUv = clamp(uv + flow1 + flow2, vec2(0.005), vec2(0.995));

    vec4 tex = texture2D(tCloud, distortedUv);

    // 2. Physical Lunar Lighting & Ambient Moonlight
    vec3 toMoon = normalize(uMoonPos - vWorldPos);
    vec3 toCam = normalize(cameraPosition - vWorldPos);
    float distToMoon = length(uMoonPos - vWorldPos);

    // Forward scattering: intense silver glow when cloud aligns with Moon
    float forwardScatter = pow(max(0.0, dot(-toCam, toMoon)), 2.2);

    // Moon radiance reaching clouds across the celestial dome
    float lunarAmbient = clamp(1.0 - (distToMoon / 85.0), 0.0, 1.0);
    float silverLining = forwardScatter * 1.70 + pow(lunarAmbient, 1.2) * 1.05;

    // Ridge highlights and ambient nocturnal volume
    float ridgeLight = 0.38 + pow(tex.r, 0.85) * 0.44 + silverLining * 0.75;

    // Color gradient from rich nocturnal moonlit blue-slate to luminous silver moonlight
    vec3 cloudColor = mix(uDarkColor, uMoonColor, clamp(ridgeLight, 0.0, 1.0));

    // Mathematical UV boundary mask: smoothly fades alpha to exactly 0.000 at mesh edges,
    // eliminating any faint border lines or moving seam artifacts
    float edgeMaskX = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
    float edgeMaskY = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
    float meshEdgeMask = edgeMaskX * edgeMaskY;

    // Dynamic breathing opacity with boundary masking
    float alpha = tex.a * uOpacity * meshEdgeMask * (0.96 + sin(uTime * 0.16 + vWorldPos.x * 0.06) * 0.04);

    // Guaranteed Foreground Lunar Clearance:
    // If a cloud fragment is in front of the Moon (closer along Z), smoothly fade alpha to 0
    // so no cloud plane can ever cast a dark, faded overlay or semi-transparent blob across the Moon sphere!
    if (vWorldPos.z > uMoonPos.z - 1.5) {
      float distToMoonXY = length(vWorldPos.xy - uMoonPos.xy);
      float moonClearance = smoothstep(2.8, 5.2, distToMoonXY);
      alpha *= moonClearance;
    }

    if (alpha < 0.006) discard;

    gl_FragColor = vec4(cloudColor, alpha);
  }
`;

export class Clouds {
  constructor(scene, moonPosition) {
    this.scene = scene;
    this.moonPos = moonPosition || new THREE.Vector3(0, 12, -35);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.cloudMasses = [];
    this.cloudMaterials = [];

    // Slow, serene celestial wind drift speed
    this.windSpeed = 0.18;

    this.initCloudTextures();
  }

  initCloudTextures() {
    this.cloudTextures = {};

    // 1. Towering Cumulus Mountain (from cloud texture 3 bottom billows)
    this.extractCloudTexture('/textures/cloud texture 3.jpg', {
      cropX: 0.15, cropY: 0.42, cropW: 0.72, cropH: 0.56,
      threshold: 0.16,
      gamma: 0.65,
      gain: 1.5,
      canvasW: 1024, canvasH: 512
    }, (tex) => {
      this.cloudTextures.cumulusMountain = tex;
      this.checkAndBuildFormations();
    });

    // 2. Cumulus Western/Eastern Flank (from cloud texture 3 left flank)
    this.extractCloudTexture('/textures/cloud texture 3.jpg', {
      cropX: 0.02, cropY: 0.48, cropW: 0.50, cropH: 0.50,
      threshold: 0.15,
      gamma: 0.68,
      gain: 1.45,
      canvasW: 1024, canvasH: 512
    }, (tex) => {
      this.cloudTextures.cumulusFlank = tex;
      this.checkAndBuildFormations();
    });

    // 3. Wispy Cirrus Streamers (from cloud texture 2 right smoky tendrils)
    this.extractCloudTexture('/textures/cloud texture 2.jpg', {
      cropX: 0.50, cropY: 0.15, cropW: 0.48, cropH: 0.75,
      threshold: 0.10,
      gamma: 0.70,
      gain: 1.4,
      canvasW: 1024, canvasH: 1024
    }, (tex) => {
      this.cloudTextures.wispyCirrus = tex;
      this.checkAndBuildFormations();
    });

    // 4. Noctilucent High Veils (from cloud texture 1 upper ripples)
    this.extractCloudTexture('/textures/cloud texture 1.jpg', {
      cropX: 0.05, cropY: 0.10, cropW: 0.90, cropH: 0.46,
      threshold: 0.14,
      gamma: 0.72,
      gain: 1.4,
      canvasW: 1024, canvasH: 512
    }, (tex) => {
      this.cloudTextures.noctilucent = tex;
      this.checkAndBuildFormations();
    });
  }

  extractCloudTexture(url, config, callback) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = config.canvasW || 1024;
      canvas.height = config.canvasH || 512;
      const ctx = canvas.getContext('2d');

      const sx = Math.round(img.width * config.cropX);
      const sy = Math.round(img.height * config.cropY);
      const sw = Math.round(img.width * config.cropW);
      const sh = Math.round(img.height * config.cropH);

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const W = canvas.width;
      const H = canvas.height;

      for (let y = 0; y < H; y++) {
        const edgeY = Math.sin((y / H) * Math.PI);
        const featherY = Math.pow(Math.max(0.0, edgeY), 0.75);

        for (let x = 0; x < W; x++) {
          const idx = (y * W + x) * 4;

          // Zero out outer 4% border pixels entirely to prevent any edge bleeding
          if (x < W * 0.04 || x > W * 0.96 || y < H * 0.04 || y > H * 0.96) {
            data[idx + 3] = 0;
            continue;
          }

          const edgeX = Math.sin((x / W) * Math.PI);
          const featherX = Math.pow(Math.max(0.0, edgeX), 0.65);
          const boundaryFeather = featherX * featherY;

          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Compute cloud luminance
          const lum = (0.32 * r + 0.52 * g + 0.16 * b) / 255.0;

          let alpha = Math.max(0.0, (lum - config.threshold) / (1.0 - config.threshold));
          alpha = Math.min(1.0, Math.pow(alpha, config.gamma) * config.gain) * boundaryFeather;

          data[idx] = Math.min(255, Math.round(lum * 255));
          data[idx + 1] = Math.min(255, Math.round(lum * 255));
          data[idx + 2] = Math.min(255, Math.round(lum * 255));
          data[idx + 3] = Math.round(alpha * 255);
        }
      }

      ctx.putImageData(imgData, 0, 0);

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.needsUpdate = true;

      callback(texture);
    };
    img.src = url;
  }

  checkAndBuildFormations() {
    if (
      this.cloudTextures.cumulusMountain &&
      this.cloudTextures.cumulusFlank &&
      this.cloudTextures.wispyCirrus &&
      this.cloudTextures.noctilucent
    ) {
      this.buildPanoramicFormations();
    }
  }

  createMaterial(texture, options = {}) {
    const {
      opacity = 0.80,
      curlScale = 0.024,
      moonColor = new THREE.Color(0x3d7ef5),
      darkColor = new THREE.Color(0x283852)
    } = options;

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        tCloud: { value: texture },
        uTime: { value: 0 },
        uMoonPos: { value: this.moonPos },
        uMoonColor: { value: moonColor },
        uDarkColor: { value: darkColor },
        uOpacity: { value: opacity },
        uCurlScale: { value: curlScale }
      },
      vertexShader: cloudVertexShader,
      fragmentShader: cloudFragmentShader,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.cloudMaterials.push(mat);
    return mat;
  }

  buildPanoramicFormations() {
    const minX = -85;
    const maxX = 85;

    // =========================================================================
    // LAYER 1: LOWER & MID-SKY TOWERING CUMULUS CLOUD BANKS (Z = -26 to -29)
    // Towering cloud masses billowing across the horizon beneath the Moon
    // =========================================================================

    // 1. Western Cumulus Mountain (Z = -27.5)
    this.addCloudBank({
      name: 'western_cumulus_mountain',
      texture: this.cloudTextures.cumulusMountain,
      width: 58, height: 14,
      x: -42, y: -0.5, z: -27.5,
      speedX: 0.52 * this.windSpeed,
      minX, maxX,
      opacity: 0.88,
      curlScale: 0.022,
      moonColor: new THREE.Color(0x3d7ef5),
      darkColor: new THREE.Color(0x1a263c)
    });

    // 2. Eastern Cumulus Mountain (Z = -27.0)
    this.addCloudBank({
      name: 'eastern_cumulus_mountain',
      texture: this.cloudTextures.cumulusFlank,
      width: 56, height: 14,
      x: 38, y: -0.2, z: -27.0,
      speedX: 0.48 * this.windSpeed,
      minX, maxX,
      opacity: 0.85,
      curlScale: 0.022,
      moonColor: new THREE.Color(0x3d7ef5),
      darkColor: new THREE.Color(0x182438)
    });

    // 3. Central Valley Under-Moon Cumulus Bank (Z = -29.0)
    this.addCloudBank({
      name: 'central_under_moon_cumulus',
      texture: this.cloudTextures.cumulusMountain,
      width: 52, height: 13,
      x: -2, y: -1.0, z: -29.0,
      speedX: 0.45 * this.windSpeed,
      minX, maxX,
      opacity: 0.82,
      curlScale: 0.020,
      moonColor: new THREE.Color(0x3d7ef5),
      darkColor: new THREE.Color(0x162234)
    });

    // =========================================================================
    // LAYER 2: HIGH CLOUDS BEHIND THE MOON (Z = -41 to -45)
    // =========================================================================

    // 4. High Noctilucent Veils - West (Behind Moon, Z = -43.0)
    this.addCloudBank({
      name: 'behind_noctilucent_west',
      texture: this.cloudTextures.noctilucent,
      width: 65, height: 22,
      x: -36, y: 16.5, z: -43.0,
      speedX: 0.28 * this.windSpeed,
      minX, maxX,
      opacity: 0.65,
      curlScale: 0.028,
      moonColor: new THREE.Color(0x3d7ef5),
      darkColor: new THREE.Color(0x121b2c)
    });

    // 5. High Noctilucent Veils - East (Behind Moon, Z = -44.0)
    this.addCloudBank({
      name: 'behind_noctilucent_east',
      texture: this.cloudTextures.noctilucent,
      width: 65, height: 22,
      x: 32, y: 17.0, z: -44.0,
      speedX: 0.25 * this.windSpeed,
      minX, maxX,
      opacity: 0.62,
      curlScale: 0.028,
      moonColor: new THREE.Color(0x3d7ef5),
      darkColor: new THREE.Color(0x111928)
    });

    // 6. Deep Cirrus Ribbons (Behind Moon, Z = -41.5)
    this.addCloudBank({
      name: 'behind_cirrus_central',
      texture: this.cloudTextures.wispyCirrus,
      width: 55, height: 20,
      x: -6, y: 15.2, z: -41.5,
      speedX: 0.32 * this.windSpeed,
      minX, maxX,
      opacity: 0.58,
      curlScale: 0.026,
      moonColor: new THREE.Color(0x3d7ef5),
      darkColor: new THREE.Color(0x141d2e)
    });

    // =========================================================================
    // LAYER 3: CELESTIAL DRIFT VEILS (Z = -39.5 to -41.0)
    // Drifting across the sky behind the Moon with natural depth parallax
    // Completely eliminates any dark overlay or faded veil cutting across the Moon face!
    // =========================================================================

    // 7. Celestial High Cirrus Veil (Behind Moon, Z = -39.5)
    this.addCloudBank({
      name: 'celestial_high_cirrus_west',
      texture: this.cloudTextures.wispyCirrus,
      width: 48, height: 16,
      x: -28, y: 13.5, z: -39.5,
      speedX: 0.35 * this.windSpeed,
      minX, maxX,
      opacity: 0.45,
      curlScale: 0.026,
      moonColor: new THREE.Color(0x3d7ef5),
      darkColor: new THREE.Color(0x141d2e)
    });

    // 8. Celestial High Cirrus Veil - East (Behind Moon, Z = -40.5)
    this.addCloudBank({
      name: 'celestial_high_cirrus_east',
      texture: this.cloudTextures.wispyCirrus,
      width: 50, height: 16,
      x: 26, y: 14.0, z: -40.5,
      speedX: 0.32 * this.windSpeed,
      minX, maxX,
      opacity: 0.42,
      curlScale: 0.026,
      moonColor: new THREE.Color(0x3d7ef5),
      darkColor: new THREE.Color(0x121a2a)
    });

    // =========================================================================
    // LAYER 4: FOREGROUND HORIZON MISTS (Z = -22.0)
    // =========================================================================

    // 9. Foreground Lower Horizon Mist (Z = -22.0)
    this.addCloudBank({
      name: 'foreground_lower_mist',
      texture: this.cloudTextures.cumulusFlank,
      width: 72, height: 12,
      x: 0, y: -2.5, z: -22.0,
      speedX: 0.70 * this.windSpeed,
      minX, maxX,
      opacity: 0.45,
      curlScale: 0.020,
      moonColor: new THREE.Color(0x3d7ef5),
      darkColor: new THREE.Color(0x141e2e)
    });
  }

  addCloudBank(config) {
    const geo = new THREE.PlaneGeometry(config.width, config.height);
    const mat = this.createMaterial(config.texture, {
      opacity: config.opacity,
      curlScale: config.curlScale,
      moonColor: config.moonColor,
      darkColor: config.darkColor
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(config.x, config.y, config.z);
    this.group.add(mesh);

    this.cloudMasses.push({
      mesh,
      mat,
      baseY: config.y,
      speedX: config.speedX,
      driftPhase: Math.random() * Math.PI * 2,
      minX: config.minX,
      maxX: config.maxX,
      width: config.width
    });
  }

  /**
   * Sets physical moonlight color across all cloud materials.
   * Shifted in real-time as the Moon cycles through Halloween colors.
   */
  setMoonlightColor(moonColor, ambientDarkColor) {
    for (let i = 0; i < this.cloudMaterials.length; i++) {
      const mat = this.cloudMaterials[i];
      if (mat.uniforms.uMoonColor) {
        // Highlighting edges with the active lunar color
        mat.uniforms.uMoonColor.value.copy(moonColor);
      }
      if (mat.uniforms.uDarkColor && ambientDarkColor) {
        // Ambient cloud shadows harmonize with celestial light bounce
        mat.uniforms.uDarkColor.value.copy(ambientDarkColor);
      }
    }
  }

  update(delta, elapsed) {
    // 1. Update shader time uniforms for dynamic internal billow flow
    for (let i = 0; i < this.cloudMaterials.length; i++) {
      this.cloudMaterials[i].uniforms.uTime.value = elapsed;
    }

    // 2. Update cloud bank drift across the sky
    for (let i = 0; i < this.cloudMasses.length; i++) {
      const bank = this.cloudMasses[i];

      // Slow, majestic physical wind drift
      bank.mesh.position.x += bank.speedX * delta;

      // Gentle vertical atmospheric swell
      bank.mesh.position.y = bank.baseY + Math.sin(elapsed * 0.14 + bank.driftPhase) * 0.22;

      // Seamless wrap-around across panoramic boundaries
      if (bank.mesh.position.x > bank.maxX) {
        bank.mesh.position.x = bank.minX;
        bank.baseY += (Math.random() - 0.5) * 0.35;
      }
    }
  }
}
