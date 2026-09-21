import * as THREE from 'three';

/**
 * AfterworldAtmosphere:
 * Majestic golden sunset lighting, textured noise sky dome,
 * and celestial Fibonacci spiral particle streams.
 * 
 * Features:
 * - Real-time physical PBR lighting:
 *   - Soft warm ambient fill (0.40) preventing blown-out white bone glare
 *   - Primary golden sunset directional light (3.2) casting deep contact shadows
 *   - Warm marigold ground bounce via HemisphereLight (0.55)
 *   - Backlight/rim light for bone contour definition
 * - Textured Sky Dome:
 *   - Multi-tier sunset gradient with procedural FBM noise for organic atmospheric texture
 * - Celestial Fibonacci Spiral Particles:
 *   - Luminous spirit motes flowing along golden ratio spiral trajectories high across the sky
 * - Papel picado festive garland banners fluttering in the wind
 * - Floating sun spores and petals drifting on thermal wind currents
 */
export class AfterworldAtmosphere {
  constructor(windSystem) {
    this.windSystem = windSystem;
    this.group = new THREE.Group();

    this.initLighting();
    this.createSkyDome();
    this.createFibonacciCelestialParticles(180);
    this.createFloatingSunSpores(120);
  }

  initLighting() {
    // 1. Soft warm ambient fill (balanced to prevent flat white bone washout)
    this.ambientLight = new THREE.AmbientLight(0xffeedd, 0.40);
    this.group.add(this.ambientLight);

    // 2. Primary Golden Sunset Directional Light (Casts deep, crisp contact shadows)
    this.sunLight = new THREE.DirectionalLight(0xffb766, 3.2);
    this.sunLight.position.set(22, 28, 14);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 90;
    this.sunLight.shadow.camera.left = -26;
    this.sunLight.shadow.camera.right = 26;
    this.sunLight.shadow.camera.top = 26;
    this.sunLight.shadow.camera.bottom = -26;
    this.sunLight.shadow.bias = -0.00015;
    this.sunLight.shadow.normalBias = 0.025;
    this.group.add(this.sunLight);

    // 3. Ground GI Bounce Light (HemisphereLight)
    // Warm marigold bounce reflecting onto chin/rib undersides without washing out shadows
    this.hemisphereBounce = new THREE.HemisphereLight(0x5673a3, 0xd4751e, 0.55);
    this.hemisphereBounce.position.set(0, 30, 0);
    this.group.add(this.hemisphereBounce);

    // 4. Backlight / Rim Light for bone contours and translucent butterfly wings
    this.rimLight = new THREE.DirectionalLight(0xffd08a, 1.4);
    this.rimLight.position.set(-16, 20, -22);
    this.group.add(this.rimLight);
  }

  createSkyDome() {
    // Large hemisphere with procedural noise-textured sunset gradient
    const skyGeo = new THREE.SphereGeometry(220, 48, 36);
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uHorizonGlow: { value: new THREE.Color(0xffcf70) },   // Solar horizon gold
        uSunsetPeach: { value: new THREE.Color(0xff7844) },   // Warm sunset apricot
        uSunsetRose: { value: new THREE.Color(0xc93d6b) },    // Sunset rose/coral
        uTwilightZenith: { value: new THREE.Color(0x221345) } // Deep celestial indigo/violet
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uHorizonGlow;
        uniform vec3 uSunsetPeach;
        uniform vec3 uSunsetRose;
        uniform vec3 uTwilightZenith;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;

        // Hash & 2D Value Noise
        float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
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

        // Fractal Brownian Motion for rich atmospheric cloud wisps
        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p = p * 2.04 + vec2(1.2, 3.4);
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec3 dir = normalize(vWorldPosition);
          float h = clamp(dir.y, 0.0, 1.0);

          // Spherical mapping for noise
          vec2 noiseCoord = vec2(atan(dir.z, dir.x) * 4.0, dir.y * 8.0);
          float slowTime = uTime * 0.03;
          float clouds = fbm(noiseCoord + vec2(slowTime, slowTime * 0.4));
          float microGrain = hash(gl_FragCoord.xy + fract(uTime)) * 0.025;

          // Perturb gradient height with organic wisps
          float perturbedH = clamp(h + (clouds - 0.5) * 0.12, 0.0, 1.0);

          // Multi-tier rich sunset color gradient
          vec3 col;
          if (perturbedH < 0.22) {
            float t = perturbedH / 0.22;
            col = mix(uHorizonGlow, uSunsetPeach, smoothstep(0.0, 1.0, t));
          } else if (perturbedH < 0.58) {
            float t = (perturbedH - 0.22) / 0.36;
            col = mix(uSunsetPeach, uSunsetRose, smoothstep(0.0, 1.0, t));
          } else {
            float t = (perturbedH - 0.58) / 0.42;
            col = mix(uSunsetRose, uTwilightZenith, smoothstep(0.0, 1.0, t));
          }

          // Golden horizon flare boost toward the sunset azimuth
          float sunDot = max(0.0, dot(dir, normalize(vec3(0.5, 0.15, -0.85))));
          float sunGlow = pow(sunDot, 6.0) * 0.45 + pow(sunDot, 32.0) * 0.8;
          col += vec3(1.0, 0.78, 0.45) * sunGlow * (1.0 - h * 0.8);

          // Atmospheric subtle noise texture & dither
          col += (clouds * 0.05 - 0.025) + microGrain;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false
    });

    this.skyDome = new THREE.Mesh(skyGeo, this.skyMat);
    this.group.add(this.skyDome);
  }

  /**
   * Celestial particles flowing along Fibonacci sequence golden spirals high across the sky
   */
  createFibonacciCelestialParticles(count = 180) {
    this.fibCount = count;
    this.fibGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    this.fibParticles = [];

    // Golden ratio angle: ~137.5077 degrees in radians
    const phiAngle = Math.PI * (3.0 - Math.sqrt(5.0)); // 2.39996323 rad

    const palette = [
      new THREE.Color(0xffd54f), // Warm golden amber
      new THREE.Color(0xffb74d), // Sunset peach
      new THREE.Color(0xff8a65), // Radiant apricot
      new THREE.Color(0xffffff)  // Celestial star white
    ];

    for (let i = 0; i < count; i++) {
      // Fibonacci spiral distribution
      const theta = i * phiAngle;
      const r = Math.sqrt(i + 1) * 3.2; // Spiral expansion
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r - 22.0;
      const y = 14.0 + Math.sin(i * 0.35) * 4.5;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const col = palette[i % palette.length];
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      scales[i] = 12.0 + (i % 5) * 4.0;

      this.fibParticles.push({
        baseIndex: i,
        theta,
        baseR: r,
        baseY: y,
        speed: 0.15 + (i % 7) * 0.04,
        pulseSpeed: 1.2 + Math.random() * 2.0,
        phase: Math.random() * Math.PI * 2
      });
    }

    this.fibGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.fibGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.fibGeo.setAttribute('size', new THREE.BufferAttribute(scales, 1));

    this.fibMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 }
      },
      vertexShader: `
        attribute vec3 color;
        attribute float size;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (60.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
          vAlpha = clamp(1.0 - (-mvPosition.z / 90.0), 0.3, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          // Soft radial celestial aura
          float glow = smoothstep(0.5, 0.0, dist);
          float core = smoothstep(0.2, 0.0, dist) * 0.6;
          gl_FragColor = vec4(vColor + core, (glow + core) * vAlpha * 0.85);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.fibPoints = new THREE.Points(this.fibGeo, this.fibMat);
    this.group.add(this.fibPoints);
  }

  /**
   * Floating Sun Spores & Drifting Marigold Petals
   */
  createFloatingSunSpores(count = 120) {
    this.spores = [];
    const sporeGeo = new THREE.PlaneGeometry(0.18, 0.24);
    const sporeColors = [0xffd54f, 0xffa726, 0xff7043, 0xffffff];

    for (let i = 0; i < count; i++) {
      const col = sporeColors[i % sporeColors.length];
      const sporeMat = new THREE.MeshBasicMaterial({
        color: col,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending
      });

      const mesh = new THREE.Mesh(sporeGeo, sporeMat);
      const x = (Math.random() - 0.5) * 42.0;
      const y = 0.5 + Math.random() * 9.0;
      const z = -22.0 + Math.random() * 28.0;

      mesh.position.set(x, y, z);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.group.add(mesh);

      this.spores.push({
        mesh,
        baseY: y,
        speedY: 0.18 + Math.random() * 0.25,
        rotSpeed: 1.0 + Math.random() * 2.2,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  update(delta, elapsed) {
    // 1. Update Sky Dome Time for noise wisps
    if (this.skyMat) {
      this.skyMat.uniforms.uTime.value = elapsed;
    }

    // 2. Animate Fibonacci Celestial Particles in the Sky
    if (this.fibGeo && this.fibParticles) {
      const posAttr = this.fibGeo.attributes.position;

      for (let i = 0; i < this.fibCount; i++) {
        const p = this.fibParticles[i];
        // Steady golden spiral rotation & gentle harmonic breathing
        const currentTheta = p.theta + elapsed * p.speed * 0.18;
        const currentR = p.baseR + Math.sin(elapsed * 0.8 + p.phase) * 0.8;

        const x = Math.cos(currentTheta) * currentR;
        const z = Math.sin(currentTheta) * currentR - 22.0;
        const y = p.baseY + Math.sin(elapsed * p.pulseSpeed + p.phase) * 0.75;

        posAttr.setXYZ(i, x, y, z);
      }
      posAttr.needsUpdate = true;
    }

    // 3. Floating Sun Spores drifting on wind currents
    const windVec = new THREE.Vector3();
    for (let i = 0; i < this.spores.length; i++) {
      const sp = this.spores[i];
      this.windSystem.getWindAt(sp.mesh.position.x, sp.mesh.position.z, elapsed + sp.phase, windVec);

      sp.mesh.position.x += windVec.x * delta * 1.5;
      sp.mesh.position.z += windVec.z * delta * 1.5;
      sp.mesh.position.y += Math.sin(elapsed * 1.2 + sp.phase) * delta * 0.4;
      sp.mesh.rotation.x += delta * sp.rotSpeed;
      sp.mesh.rotation.y += delta * sp.rotSpeed * 0.7;

      if (sp.mesh.position.x > 22) sp.mesh.position.x = -22;
      if (sp.mesh.position.x < -22) sp.mesh.position.x = 22;
      if (sp.mesh.position.z > 8) sp.mesh.position.z = -22;
      if (sp.mesh.position.z < -22) sp.mesh.position.z = 8;
    }
  }
}
