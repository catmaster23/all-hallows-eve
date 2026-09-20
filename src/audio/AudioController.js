/**
 * Seamless Crossfaded Cello Audio Theme Controller:
 * - Plays `/audio themes/cello theme.mp3` in an infinite, seamless loop using
 *   dual ping-pong audio players with automatic crossfade before track ends.
 * - Volume continuously undulates between 50% and 80% over a 60-second cycle.
 * - Exposes `getCycleProgress()` to drive synchronous celestial color progression.
 * - Handles browser autoplay policies with robust user-gesture unlocking.
 */
export class AudioController {
  constructor() {
    this.audioSrc = '/audio%20themes/cello%20theme.mp3';

    // Dual audio players for gapless crossfading
    this.playerA = new Audio(this.audioSrc);
    this.playerB = new Audio(this.audioSrc);
    this.playerA.preload = 'auto';
    this.playerB.preload = 'auto';

    this.activePlayer = this.playerA;
    this.nextPlayer = this.playerB;
    this.isCrossfading = false;
    this.crossfadeDuration = 4.5; // 4.5s smooth crossfade

    this.maxVolume = 0.80;
    this.minVolume = 0.50;
    this.cycleDuration = 60.0; // 60 seconds volume cycle
    this.startTime = null;
    this.isPlaying = false;
    this.currentBaseVolume = this.maxVolume;

    this.initAutoplay();
    this.startAudioLoop();
  }

  initAutoplay() {
    this.activePlayer.volume = this.maxVolume;
    const playPromise = this.activePlayer.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isPlaying = true;
          this.startTime = performance.now();
          console.log('[AudioController] Cello theme started with seamless crossfade looping.');
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
        this.activePlayer.play()
          .then(() => {
            this.isPlaying = true;
            this.startTime = performance.now();
            console.log('[AudioController] Cello theme unlocked by user gesture.');
          })
          .catch((err) => {
            console.warn('[AudioController] Unlock attempt failed:', err);
          });
      }
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

  startAudioLoop() {
    const tick = () => {
      if (this.isPlaying && this.startTime !== null) {
        const elapsed = (performance.now() - this.startTime) / 1000.0;

        // 60-second undulating volume cycle:
        // Starts at 80% (elapsed=0), drops to 50% (elapsed=30s), rises to 80% (elapsed=60s)
        const wave = 0.5 + 0.5 * Math.cos((2.0 * Math.PI * elapsed) / this.cycleDuration);
        this.currentBaseVolume = this.minVolume + (this.maxVolume - this.minVolume) * wave;

        // Crossfade check near end of track
        const curr = this.activePlayer.currentTime;
        const dur = this.activePlayer.duration;

        if (dur && dur > this.crossfadeDuration * 2) {
          const remaining = dur - curr;

          if (remaining <= this.crossfadeDuration && !this.isCrossfading) {
            // Trigger secondary player crossfade
            this.isCrossfading = true;
            this.nextPlayer.currentTime = 0;
            this.nextPlayer.volume = 0;
            this.nextPlayer.play().catch(e => console.warn('Next player play error:', e));
          }

          if (this.isCrossfading) {
            const fadeProgress = Math.max(0, Math.min(1, 1 - (remaining / this.crossfadeDuration)));
            // Equal-power / linear crossfade
            this.activePlayer.volume = Math.max(0, Math.min(0.80, this.currentBaseVolume * (1 - fadeProgress)));
            this.nextPlayer.volume = Math.max(0, Math.min(0.80, this.currentBaseVolume * fadeProgress));

            if (remaining <= 0.2 || curr >= dur - 0.1) {
              // Swap players
              this.activePlayer.pause();
              this.activePlayer.currentTime = 0;

              const temp = this.activePlayer;
              this.activePlayer = this.nextPlayer;
              this.nextPlayer = temp;

              this.activePlayer.volume = this.currentBaseVolume;
              this.isCrossfading = false;
            }
          } else {
            this.activePlayer.volume = Math.max(0, Math.min(0.80, this.currentBaseVolume));
          }
        } else {
          this.activePlayer.volume = Math.max(0, Math.min(0.80, this.currentBaseVolume));
        }
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  /**
   * Returns normalized cycle progress from 0.0 to 1.0 of the 60-second cycle.
   */
  getCycleProgress() {
    const elapsed = this.startTime !== null
      ? (performance.now() - this.startTime) / 1000.0
      : performance.now() / 1000.0;
    return (elapsed % this.cycleDuration) / this.cycleDuration;
  }

  /**
   * Returns current master base volume (between 0.50 and 0.80).
   */
  getCurrentVolume() {
    return this.currentBaseVolume;
  }
}
