import * as THREE from 'three';

/**
 * Photorealistic Radiant Lunar Glow & Atmospheric Corona Shader:
 * Starts directly at the Moon's limb and radiates seamlessly into the night sky:
 * - Pure warm-white incandescent core bloom (zero artificial blue tint)
 * - Powerful exponential atmospheric dispersion that illuminates the sky
 * - Delicate breathing anamorphic diffraction rays
 * - Pure additive blending with one-to-one optical light accumulation
 */
const lunarGlowVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const lunarGlowFragmentShader = `
  uniform vec3 uCoreColor;    // Blazing pure white moonlight (#ffffff)
  uniform vec3 uMidColor;     // Warm champagne/ivory corona (#fff9e6)
  uniform vec3 uHazeColor;    // Soft silver-pearl ambient scatter (#eee6d6)
  uniform float uIntensity;
  uniform float uMoonRadiusRatio; // Fraction of billboard radius occupied by solid Moon (~0.416)
  uniform float uTime;

  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vec2 center = vec2(0.5);
    float dist = length(vUv - center);

    if (dist > 0.5) {
      discard;
    }

    // Normalized radial distance (0 at center, 1 at billboard edge)
    float r = dist * 2.0;

    // Continuous Monotonic Optical Gaussian Bloom radiating seamlessly from lunar center:
    // Core radiance (silky smooth light dispersion from the lunar disk into the sky)
    float core = exp(-pow(r * 2.2, 1.4) * 2.4) * 1.5;

    // Broad atmospheric scatter (soft champagne dispersion illuminating passing mist and sky)
    float broad = exp(-pow(r * 1.2, 0.95) * 1.6) * 0.65;

    // Subtle breathing diffraction rays
    float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
    float ray1 = sin(angle * 6.0 + uTime * 0.12) * 0.5 + 0.5;
    float ray2 = cos(angle * 10.0 - uTime * 0.18) * 0.5 + 0.5;
    float rays = pow(ray1 * ray2, 3.0) * 0.18 * exp(-r * 2.2);

    // Smooth boundary fade to zero at billboard perimeter
    float outerFade = 1.0 - smoothstep(0.70, 1.0, r);

    float glow = (core + broad + rays) * outerFade;

    // Color Temperature Gradient (warm blazing core -> champagne corona -> pearl outer scatter)
    vec3 col = mix(uCoreColor, uMidColor, smoothstep(0.15, 0.50, r));
    col = mix(col, uHazeColor, smoothstep(0.50, 0.95, r));

    // Pure optical additive output
    vec3 outRgb = col * (glow * uIntensity);
    gl_FragColor = vec4(outRgb, 1.0);
  }
`;

export function createLunarGlowMaterial(options = {}) {
  const {
    coreColor = new THREE.Color(0xffffff),
    midColor = new THREE.Color(0xfff8e4),
    hazeColor = new THREE.Color(0xf2ebd9),
    intensity = 1.25,
    moonRadiusRatio = 0.416
  } = options;

  return new THREE.ShaderMaterial({
    uniforms: {
      uCoreColor: { value: new THREE.Color(coreColor) },
      uMidColor: { value: new THREE.Color(midColor) },
      uHazeColor: { value: new THREE.Color(hazeColor) },
      uIntensity: { value: intensity },
      uMoonRadiusRatio: { value: moonRadiusRatio },
      uTime: { value: 0 }
    },
    vertexShader: lunarGlowVertexShader,
    fragmentShader: lunarGlowFragmentShader,
    side: THREE.DoubleSide,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    transparent: true,
    depthWrite: false
  });
}

