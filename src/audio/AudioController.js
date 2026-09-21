import { SoundEngine } from './SoundEngine.js';

/**
 * Cello Audio Theme Controller & Sound Engine Orchestrator:
 * - Plays `/audio themes/cello theme.mp3` in a continuous, constant loop.
 * - Volume never exceeds 80% (0.80 maxVolume).
 * - Smoothly undulates between 80% (0.80) and 50% (0.50) over a 60-second cycle.
 * - Keeps playing constantly via native loop and 'ended' fallback.
 * - Exposes `getCycleProgress()` to drive synchronous celestial color progression.
 * - Houses the interactive Web Audio `SoundEngine` for all scene sound effects.
 */
export class AudioController {
  constructor() {
    this.audioSrc = '/audio%20themes/cello%20theme.mp3';
    this.audio = new Audio(this.audioSrc);
    this.audio.loop = true;
    this.audio.preload = 'auto';

    // Error fallback for path unescaping
    this.audio.addEventListener('error', () => {
      console.warn('[AudioController] Retrying with unescaped path...');
      this.audio.src = '/audio themes/cello theme.mp3';
      this.audio.load();
      if (this.isPlaying) {
        this.audio.play().catch(() => {});
      }
    });

    // Guarantee constant continuous playback
    this.audio.addEventListener('ended', () => {
      this.audio.currentTime = 0;
      this.audio.play().catch(() => {});
    });

    // Precise 60-second volume cycle parameters
    this.maxVolume = 0.80; // Capped strictly at 80%
    this.minVolume = 0.50; // Drops to 50%
    this.cycleDuration = 60.0; // 60 seconds period
    this.startTime = null;
    this.isPlaying = false;
    this.currentBaseVolume = this.maxVolume;

    // Set initial volume
    this.audio.volume = this.maxVolume;

    // Interactive Web Audio sound effects engine
    this.soundEngine = new SoundEngine();

    this.initAutoplay();
    this.setupGestureUnlock();
    this.startModulationLoop();
  }

  initAutoplay() {
    // Attempt immediate unmuted playback
    this.audio.volume = this.maxVolume;
    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isPlaying = true;
          this.startTime = performance.now();
          console.log('[AudioController] Cello theme autoplaying constantly at 80% max volume.');
          if (this.soundEngine) this.soundEngine.ensureContext();
        })
        .catch((error) => {
          console.log('[AudioController] Autoplay deferred until user gesture:', error.message);
          this.setupGestureUnlock();
        });
    }
  }

  setupGestureUnlock() {
    const unlock = () => {
      if (this.soundEngine) {
        this.soundEngine.ensureContext();
      }

      if (!this.isPlaying || this.audio.paused) {
        this.audio.volume = this.currentBaseVolume;
        this.audio.play()
          .then(() => {
            this.isPlaying = true;
            if (this.startTime === null) this.startTime = performance.now();
            console.log('[AudioController] Cello theme unlocked & playing constantly.');
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('click', unlock);
            window.removeEventListener('keydown', unlock);
            window.removeEventListener('touchstart', unlock);
            window.removeEventListener('pointermove', unlock);
          })
          .catch((err) => {
            console.warn('[AudioController] Gesture unlock attempt deferred:', err.message);
          });
      } else {
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('click', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock);
        window.removeEventListener('pointermove', unlock);
      }
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('click', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('pointermove', unlock, { once: true, passive: true });
  }

  /**
   * Continuous 60-second Volume Modulation Loop:
   * - Starts at 80% (t = 0s)
   * - Undulates down to 50% (t = 30s)
   * - Rises back to 80% (t = 60s)
   * - Never exceeds 0.80
   */
  startModulationLoop() {
    const updateVolume = () => {
      if (this.isPlaying && this.startTime !== null && !this.audio.paused) {
        const elapsed = (performance.now() - this.startTime) / 1000.0;
        // Cosine wave oscillating between 1.0 (at t=0, 60s) and 0.0 (at t=30s)
        const wave = 0.5 + 0.5 * Math.cos((2.0 * Math.PI * elapsed) / this.cycleDuration);
        // Linear interpolation between minVolume (0.50) and maxVolume (0.80)
        const targetVol = this.minVolume + (this.maxVolume - this.minVolume) * wave;
        this.currentBaseVolume = Math.max(0.0, Math.min(0.80, targetVol));
        this.audio.volume = this.currentBaseVolume;
      }
      requestAnimationFrame(updateVolume);
    };

    requestAnimationFrame(updateVolume);
  }

  /**
   * Returns normalized cycle progress from 0.0 to 1.0 of the 60-second cycle.
   */
  getCycleProgress() {
    const elapsed = this.startTime !== null
      ? (performance.now() - this.startTime) / 1000.0
      : performance.now() / 1000.0;
    return ((elapsed % this.cycleDuration) + this.cycleDuration) % this.cycleDuration / this.cycleDuration;
  }

  /**
   * Returns current master base volume (between 0.50 and 0.80).
   */
  getCurrentVolume() {
    return this.currentBaseVolume;
  }

  /**
   * Toggle mute / pause callable by UI icon button
   */
  toggle() {
    if (this.soundEngine) this.soundEngine.ensureContext();

    if (this.isPlaying && !this.audio.paused) {
      this.audio.pause();
      this.isPlaying = false;
    } else {
      this.audio.volume = this.currentBaseVolume;
      this.audio.play()
        .then(() => {
          this.isPlaying = true;
          if (this.startTime === null) this.startTime = performance.now();
        })
        .catch(() => {});
    }
  }

  resume() {
    if (this.soundEngine) this.soundEngine.ensureContext();
    if (this.audio.paused) {
      this.audio.volume = this.currentBaseVolume;
      this.audio.play()
        .then(() => {
          this.isPlaying = true;
          if (this.startTime === null) this.startTime = performance.now();
        })
        .catch(() => {});
    }
  }
}
