/**
 * TREAT Outcome Transition:
 * 1. Screen-wide black hole gravitational vortex sucks in the scene
 * 2. Cross-fades into The Otherworld of Happiness
 * 3. Switches cello music to gentle, warm, happy mode
 */
export class TreatTransition {
  constructor(canvas, onComplete) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onComplete = onComplete;
    this.isActive = false;

    this.resize();
    window.addEventListener('resize', this.resize.bind(this));
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  start() {
    this.isActive = true;
    this.canvas.classList.add('active');
    const startTime = performance.now();

    // Particle streaks sucked into the black hole
    const particles = [];
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    for (let i = 0; i < 180; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 100 + Math.random() * (Math.max(w, h) * 0.75);
      particles.push({
        angle,
        dist,
        speed: 1.5 + Math.random() * 2.5,
        size: 1.5 + Math.random() * 3,
        color: Math.random() > 0.4 ? '#ffbb44' : '#e0aaff'
      });
    }

    const animateLoop = (time) => {
      if (!this.isActive) return;
      const elapsed = (time - startTime) / 1000;

      this.render(elapsed, cx, cy, particles);

      // At 2.2 seconds, black hole reaches full event horizon -> switch scene!
      if (elapsed > 2.0 && !this.hasSwapped) {
        this.hasSwapped = true;
        if (this.onComplete) this.onComplete();
      }

      if (elapsed < 3.2) {
        requestAnimationFrame(animateLoop);
      } else {
        // Fade out black hole canvas
        this.canvas.classList.remove('active');
        this.isActive = false;
      }
    };

    requestAnimationFrame(animateLoop);
  }

  render(elapsed, cx, cy, particles) {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    // Darkening veil
    const darkness = Math.min(1.0, elapsed * 0.7);
    ctx.fillStyle = `rgba(3, 1, 6, ${darkness * 0.25})`;
    ctx.fillRect(0, 0, w, h);

    // Growing central Event Horizon
    const holeRadius = Math.min(Math.max(w, h) * 0.85, elapsed * 220);

    // Accretion Disk Glow
    const diskGrad = ctx.createRadialGradient(cx, cy, Math.max(0, holeRadius * 0.4), cx, cy, holeRadius + 60);
    diskGrad.addColorStop(0, '#000000');
    diskGrad.addColorStop(0.65, '#240046');
    diskGrad.addColorStop(0.85, '#ff9e00'); // Molten accretion rim
    diskGrad.addColorStop(1, 'rgba(255, 220, 100, 0)');

    ctx.fillStyle = diskGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, holeRadius + 60, 0, Math.PI * 2);
    ctx.fill();

    // Pure black singularity core
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(5, holeRadius * 0.7), 0, Math.PI * 2);
    ctx.fill();

    // Inward spiraling cosmic particles
    particles.forEach(p => {
      p.dist -= p.speed * (150 + elapsed * 120) * 0.016;
      p.angle += (1.8 / Math.max(1, p.dist * 0.02)); // Spagettification spiral

      const x = cx + Math.cos(p.angle) * p.dist;
      const y = cy + Math.sin(p.angle) * p.dist;

      if (p.dist > 5) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
}
