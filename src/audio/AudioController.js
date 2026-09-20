/**
 * Cello Audio Theme Controller:
 * - Plays `/audio themes/cello theme.mp3` in a continuous loop.
 * - Volume never exceeds 80% (0.80).
 * - Smoothly undulates between 80% and 50% over a 60-second period.
 * - Handles browser autoplay restrictions gracefully by auto-unlocking on first interaction.
 */
export class AudioController {
  constructor() {
    this.audio = new Audio('/audio%20themes/cello%20theme.mp3');
    this.audio.loop = true;
    this.audio.preload = 'auto';

    this.maxVolume = 0.80;
    this.minVolume = 0.50;
    this.cycleDuration = 60.0; // 60 seconds period
    this.startTime = null;
    this.isPlaying = false;

    // Set initial volume to maxVolume
    this.audio.volume = this.maxVolume;

    this.initAutoplay();
    this.startModulationLoop();
  }

  initAutoplay() {
    // Attempt immediate autoplay
    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isPlaying = true;
          this.startTime = performance.now();
          console.log('[AudioController] Cello theme autoplaying.');
        })
        .catch((error) => {
          console.log('[AudioController] Autoplay deferred until user gesture:', error.message);
          this.setupGestureUnlock();
        });
    }
  }

  setupGestureUnlock() {
    const unlock = () => {
      if (!this.isPlaying) {
        this.audio.play()
          .then(() => {
            this.isPlaying = true;
            this.startTime = performance.now();
            console.log('[AudioController] Cello theme unlocked by user gesture.');
          })
          .catch((err) => {
            console.warn('[AudioController] Unlock attempt failed:', err);
          });
      }
      // Remove listeners once invoked
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('scroll', unlock);
    };

    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('click', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
    window.addEventListener('touchstart', unlock, { once: true, passive: true });
    window.addEventListener('scroll', unlock, { once: true, passive: true });
  }

  startModulationLoop() {
    const updateVolume = () => {
      if (this.isPlaying && this.startTime !== null) {
        const elapsed = (performance.now() - this.startTime) / 1000.0;
        // Cosine wave oscillating between 1.0 (at t=0, 60s) and 0.0 (at t=30s)
        const wave = 0.5 + 0.5 * Math.cos((2.0 * Math.PI * elapsed) / this.cycleDuration);
        // Linear interpolation between minVolume (0.50) and maxVolume (0.80)
        const targetVol = this.minVolume + (this.maxVolume - this.minVolume) * wave;
        this.audio.volume = Math.max(0.0, Math.min(0.80, targetVol));
      }
      requestAnimationFrame(updateVolume);
    };

    requestAnimationFrame(updateVolume);
  }
}
