/**
 * TRICK Outcome Transition:
 * 1. Flips website to RTL
 * 2. Thick boiling hot orange toxic liquid drips down from top, coating the entire screen
 * 3. Liquid gets sucked into a screen-width drain at the bottom
 * 4. Triggers window.location.reload() as the suction completes
 */
export class TrickTransition {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.isActive = false;
    this.progress = 0; // 0 to 1 (filling down) -> 1 to 2 (draining into bottom)
    this.dripColumns = [];
    this.bubbles = [];

    this.resize();
    window.addEventListener('resize', this.resize.bind(this));
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.initDripColumns();
  }

  initDripColumns() {
    const colCount = Math.floor(window.innerWidth / 18) + 1;
    this.dripColumns = [];
    for (let i = 0; i < colCount; i++) {
      this.dripColumns.push({
        x: i * 18,
        speed: 0.8 + Math.random() * 0.9,
        maxDrop: window.innerHeight * (1.1 + Math.random() * 0.2),
        currentY: 0,
        thickness: 16 + Math.random() * 12
      });
    }

    // Boiling bubbles in the liquid flood
    this.bubbles = [];
    for (let i = 0; i < 45; i++) {
      this.bubbles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: 4 + Math.random() * 16,
        phase: Math.random() * Math.PI * 2,
        speed: 1.5 + Math.random() * 2
      });
    }
  }

  start() {
    this.isActive = true;
    this.progress = 0;
    this.canvas.classList.add('active');

    // 1. Flip entire site to RTL
    document.documentElement.setAttribute('dir', 'rtl');
    document.body.classList.add('trick-mode-rtl');

    const startTime = performance.now();

    const renderLoop = (time) => {
      if (!this.isActive) return;
      const elapsed = (time - startTime) / 1000;

      this.render(elapsed);

      // Phase 1: 0 to 2.2s -> Liquid drips down and covers screen
      // Phase 2: 2.2s to 3.8s -> Liquid gets sucked into bottom full-width drain
      // Phase 3: At 3.4s -> trigger reload!
      if (elapsed > 3.4 && !this.hasReloaded) {
        this.hasReloaded = true;
        // Clean reload as liquid is sucked down
        window.location.reload();
      }

      if (elapsed < 4.5) {
        requestAnimationFrame(renderLoop);
      }
    };

    requestAnimationFrame(renderLoop);
  }

  render(elapsed) {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Stage 1: Liquid flooding down from top
    // Stage 2: Liquid draining into bottom drain
    let fillY = 0;
    let drainY = h;

    if (elapsed < 2.0) {
      // Dripping down
      const t = Math.min(1.0, elapsed / 1.8);
      fillY = h * Math.pow(t, 1.4);
    } else {
      fillY = h;
      // Sucking into bottom drain (spread on full width)
      const drainT = (elapsed - 2.0) / 1.5;
      drainY = h * (1.0 - Math.pow(drainT, 1.8));
    }

    // Draw Boiling Hot Orange Liquid Body
    const liquidGrad = ctx.createLinearGradient(0, 0, 0, h);
    liquidGrad.addColorStop(0, '#ffcc00'); // Boiling hot yellow top
    liquidGrad.addColorStop(0.3, '#ff7700'); // Vibrant hot orange
    liquidGrad.addColorStop(0.7, '#ff3300'); // Burning magma
    liquidGrad.addColorStop(1, '#880800'); // Dark viscous sludge

    ctx.fillStyle = liquidGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);

    // Wavy boiling drip front
    if (elapsed < 2.0) {
      for (let x = w; x >= 0; x -= 20) {
        const wave = Math.sin(x * 0.03 + elapsed * 6) * 25 + Math.cos(x * 0.08 - elapsed * 4) * 15;
        ctx.lineTo(x, Math.min(h, fillY + wave));
      }
    } else {
      // Flat or drain suction wave pulling down
      for (let x = w; x >= 0; x -= 25) {
        const drainSuction = Math.sin(x * 0.04 + elapsed * 12) * 18;
        ctx.lineTo(x, Math.max(0, drainY + drainSuction));
      }
    }

    ctx.closePath();
    ctx.fill();

    // Dripping Stalactites
    if (elapsed < 2.2) {
      this.dripColumns.forEach(col => {
        const dripLength = Math.min(h, elapsed * 480 * col.speed);
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(col.x, dripLength, col.thickness * 0.6, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Boiling bubbles in the liquid
    ctx.fillStyle = 'rgba(255, 240, 150, 0.75)';
    this.bubbles.forEach(b => {
      b.y -= b.speed * 2.5;
      if (b.y < 0) b.y = h;
      if (b.y < fillY && (elapsed < 2.0 || b.y < drainY)) {
        const r = b.r * (1 + Math.sin(elapsed * 8 + b.phase) * 0.25);
        ctx.beginPath();
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Bottom Drain Hole Graphic (spread across entire width of screen)
    if (elapsed > 1.8) {
      const drainAlpha = Math.min(1.0, (elapsed - 1.8) / 0.5);
      const drainGrad = ctx.createLinearGradient(0, h - 80, 0, h);
      drainGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      drainGrad.addColorStop(0.5, `rgba(15, 5, 25, ${drainAlpha * 0.85})`);
      drainGrad.addColorStop(1, `rgba(0, 0, 0, ${drainAlpha})`);
      ctx.fillStyle = drainGrad;
      ctx.fillRect(0, h - 90, w, 90);

      // Suction vortex whirlpool streaks
      ctx.strokeStyle = `rgba(255, 170, 40, ${drainAlpha * 0.6})`;
      ctx.lineWidth = 2;
      for (let s = 0; s < w; s += 30) {
        ctx.beginPath();
        ctx.moveTo(s, h - 70);
        ctx.lineTo(s + (Math.random() - 0.5) * 25, h);
        ctx.stroke();
      }
    }
  }
}
