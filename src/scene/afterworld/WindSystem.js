import * as THREE from 'three';

/**
 * WindSystem:
 * Simulates Disney-style gentle ambient breezes across the meadow,
 * plus powerful physics-based displacement wind gusts radiating outward
 * when the colossal 70ft skeleton moves upon user interaction.
 */
export class WindSystem {
  constructor() {
    this.baseSpeed = 1.2;
    this.baseStrength = 0.45;
    this.direction = new THREE.Vector2(0.85, 0.52).normalize();

    // Sudden gust triggered by skeleton movement
    this.gust = {
      active: false,
      origin: new THREE.Vector3(0, 0, -4),
      time: 0,
      duration: 3.8,
      intensity: 0,
      radius: 45.0
    };

    this.currentWind = new THREE.Vector3(0, 0, 0);
  }

  /**
   * Trigger a giant air displacement shockwave / gust when the skeleton shifts
   */
  triggerSkeletonGust(origin = new THREE.Vector3(0, 0, -4), intensity = 3.6) {
    this.gust.active = true;
    this.gust.origin.copy(origin);
    this.gust.time = 0;
    this.gust.intensity = intensity;
  }

  update(delta, elapsed) {
    if (this.gust.active) {
      this.gust.time += delta;
      if (this.gust.time >= this.gust.duration) {
        this.gust.active = false;
        this.gust.intensity = 0;
      }
    }
  }

  /**
   * Get dynamic wind vector at a specific ground location (x, z)
   */
  getWindAt(x, z, elapsed, target = new THREE.Vector3()) {
    // 1. Base organic ambient breeze (layered sine waves)
    const wave1 = Math.sin(x * 0.18 + z * 0.12 + elapsed * this.baseSpeed);
    const wave2 = Math.cos(x * 0.09 - z * 0.15 + elapsed * (this.baseSpeed * 0.7));
    const wave3 = Math.sin((x + z) * 0.05 + elapsed * 1.8);
    const ambientFactor = (wave1 * 0.6 + wave2 * 0.3 + wave3 * 0.1) * this.baseStrength;

    target.x = this.direction.x * ambientFactor;
    target.z = this.direction.y * ambientFactor;
    target.y = Math.sin(elapsed * 2.0 + x * 0.2) * 0.08 * Math.abs(ambientFactor);

    // 2. Add skeleton movement shockwave if active
    if (this.gust.active) {
      const dx = x - this.gust.origin.x;
      const dz = z - this.gust.origin.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      // Gust expands outward like an atmospheric wave
      const waveFront = (this.gust.time / this.gust.duration) * this.gust.radius;
      const distFromWave = Math.abs(dist - waveFront);
      const waveWidth = 8.0;

      if (distFromWave < waveWidth) {
        const falloff = 1.0 - (distFromWave / waveWidth);
        const timeDecay = Math.max(0, 1.0 - (this.gust.time / this.gust.duration));
        const gustForce = this.gust.intensity * falloff * timeDecay;

        // Radial outward blast
        const dirX = dist > 0.001 ? dx / dist : 0;
        const dirZ = dist > 0.001 ? dz / dist : 1;

        target.x += dirX * gustForce;
        target.z += dirZ * gustForce;
        target.y += (Math.random() - 0.5) * 0.15 * gustForce;
      }
    }

    return target;
  }
}
