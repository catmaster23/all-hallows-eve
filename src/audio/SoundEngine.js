/**
 * SoundEngine:
 * Procedural & Synthesized Interactive Web Audio System for "All Hallows' Eve".
 * 
 * Features:
 * - Zero external asset dependency: 100% reliable, zero loading latency, instant playback.
 * - Handles browser AudioContext state and auto-resumes on any user gesture.
 * - Procedural Sound Effects:
 *   1. `playBatFlap()`: Leathery wing flutter (dual bandpass noise pulses + sub-bass pop)
 *   2. `startMistAmbience()` / `setMistIntensity()`: Eerie nocturnal wind & mist drone with LFO resonant sweep
 *   3. `playButterflyFlap()`: Airy flutter with celestial fairy sparkle chime
 *   4. `playSkeletonMove()`: Ancient bone rattle/creak (granular dry bone shifting clicks)
 *   5. `playEyeGlow()`: Resonant celestial chord & chime when skeleton eyes light up
 *   6. `playCloudDiveTransition()`: Rushing wind vortex whoosh (Screen 1 -> Screen 2)
 *   7. `playVeilTransition()`: Dimensional cosmic rift shimmer & chime (Screen 2 <-> Screen 3)
 *   8. `playPumpkinLaugh()`: Sinister synthesized Jack-o'-Lantern evil cackle ("MWA-HA-HA-HA-HA!") + hollow pumpkin thud
 */
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.mistGain = null;
    this.isInitialized = false;
    this.isMistActive = false;
    this.lastBatTime = 0;
    this.lastButterflyTime = 0;

    this.initContext();
    this.setupGestureUnlock();
  }

  initContext() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.isInitialized = true;
    } catch (err) {
      console.warn('[SoundEngine] AudioContext initialization deferred:', err);
    }
  }

  setupGestureUnlock() {
    const unlock = () => {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().then(() => {
            console.log('[SoundEngine] AudioContext resumed by user gesture.');
            if (!this.isMistActive) this.startMistAmbience();
          }).catch(e => console.warn('[SoundEngine] Resume error:', e));
        } else if (this.ctx.state === 'running' && !this.isMistActive) {
          this.startMistAmbience();
        }
      } else {
        this.initContext();
      }
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('click', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
  }

  ensureContext() {
    if (!this.ctx) this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // ==========================================
  // 1. Bats Flapping (Leathery Wing Flutter)
  // ==========================================
  playBatFlap(volume = 0.5) {
    const now = performance.now();
    if (now - this.lastBatTime < 90) return; // Debounce rapid triggers
    this.lastBatTime = now;
    this.ensureContext();
    if (!this.ctx || this.ctx.state !== 'running') return;

    const t = this.ctx.currentTime;
    const flapDuration = 0.12;

    // Filtered noise pulse
    const bufferSize = Math.floor(this.ctx.sampleRate * flapDuration);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2.0 - 1.0;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(140, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + flapDuration);
    filter.Q.setValueAtTime(2.2, t);

    // Subtle wing air pop
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(85, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + flapDuration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(volume * 0.45, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + flapDuration);

    noise.connect(filter);
    filter.connect(gain);
    osc.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    osc.start(t);
    noise.stop(t + flapDuration);
    osc.stop(t + flapDuration);
  }

  // ==========================================
  // 2. Mist Ambience (Eerie Nocturnal Fog Drone)
  // ==========================================
  startMistAmbience() {
    if (!this.ctx || this.isMistActive) return;
    this.isMistActive = true;

    const bufferSize = this.ctx.sampleRate * 4.0;
    const noiseBuffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = noiseBuffer.getChannelData(ch);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        // Brown noise generation
        const white = Math.random() * 2.0 - 1.0;
        data[i] = (lastOut + (0.03 * white)) / 1.03;
        lastOut = data[i];
      }
    }

    this.mistSource = this.ctx.createBufferSource();
    this.mistSource.buffer = noiseBuffer;
    this.mistSource.loop = true;

    // Resonant sweep filter
    this.mistFilter = this.ctx.createBiquadFilter();
    this.mistFilter.type = 'lowpass';
    this.mistFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
    this.mistFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    this.mistGain = this.ctx.createGain();
    this.mistGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

    this.mistSource.connect(this.mistFilter);
    this.mistFilter.connect(this.mistGain);
    this.mistGain.connect(this.masterGain);

    this.mistSource.start();

    // Slow ambient wind pitch oscillation
    this.mistLfo = this.ctx.createOscillator();
    this.mistLfo.frequency.setValueAtTime(0.12, this.ctx.currentTime); // 8-second cycle
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(140, this.ctx.currentTime);
    this.mistLfo.connect(lfoGain);
    lfoGain.connect(this.mistFilter.frequency);
    this.mistLfo.start();
  }

  setMistIntensity(intensity = 1.0) {
    if (this.mistGain && this.ctx) {
      const targetGain = Math.max(0.001, intensity * 0.28);
      this.mistGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.4);
    }
  }

  // ==========================================
  // 3. Butterflies Flapping (Airy Flutter + Fairy Chime)
  // ==========================================
  playButterflyFlap(volume = 0.45) {
    const now = performance.now();
    if (now - this.lastButterflyTime < 180) return;
    this.lastButterflyTime = now;
    this.ensureContext();
    if (!this.ctx || this.ctx.state !== 'running') return;

    const t = this.ctx.currentTime;
    const dur = 0.22;

    // High airy flutter
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2.0 - 1.0;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const hpf = this.ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.setValueAtTime(1400, t);

    const flutterGain = this.ctx.createGain();
    flutterGain.gain.setValueAtTime(0.001, t);
    flutterGain.gain.linearRampToValueAtTime(volume * 0.22, t + 0.04);
    flutterGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(hpf);
    hpf.connect(flutterGain);
    flutterGain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + dur);

    // Delicate celestial sparkle ping (sine chime)
    const chime = this.ctx.createOscillator();
    chime.type = 'sine';
    const freqs = [1760, 2093, 2349, 2637];
    const baseFreq = freqs[Math.floor(Math.random() * freqs.length)];
    chime.frequency.setValueAtTime(baseFreq, t);
    chime.frequency.exponentialRampToValueAtTime(baseFreq * 1.15, t + 0.25);

    const chimeGain = this.ctx.createGain();
    chimeGain.gain.setValueAtTime(0.001, t);
    chimeGain.gain.linearRampToValueAtTime(volume * 0.18, t + 0.02);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    chime.connect(chimeGain);
    chimeGain.connect(this.masterGain);
    chime.start(t);
    chime.stop(t + 0.35);
  }

  // ==========================================
  // 4. Skeleton Move & Eye Glow
  // ==========================================
  playSkeletonMove(volume = 0.7) {
    this.ensureContext();
    if (!this.ctx || this.ctx.state !== 'running') return;

    const t = this.ctx.currentTime;
    // Ancient dry bone shifting rattle (3 micro granular clicks)
    for (let c = 0; c < 3; c++) {
      const clickTime = t + c * 0.045 + Math.random() * 0.015;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      const f0 = 240 + Math.random() * 180;
      osc.frequency.setValueAtTime(f0, clickTime);
      osc.frequency.exponentialRampToValueAtTime(80, clickTime + 0.05);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, clickTime);
      gain.gain.linearRampToValueAtTime(volume * 0.35, clickTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.06);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(clickTime);
      osc.stop(clickTime + 0.06);
    }
  }

  playEyeGlow(volume = 0.8) {
    this.ensureContext();
    if (!this.ctx || this.ctx.state !== 'running') return;

    const t = this.ctx.currentTime;
    const dur = 2.2;

    // Celestial triad chord swell (E5: 659Hz, G#5: 830Hz, B5: 987Hz)
    const chord = [659.25, 830.61, 987.77, 1318.51];
    chord.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      // Subtle vibrato
      osc.frequency.linearRampToValueAtTime(freq * 1.01, t + dur * 0.5);
      osc.frequency.linearRampToValueAtTime(freq, t + dur);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(volume * (0.28 / (idx + 1)), t + 0.35); // Gentle swell
      gain.gain.setValueAtTime(volume * (0.28 / (idx + 1)), t + 0.7);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + dur);
    });
  }

  // ==========================================
  // 5. Screen Transitions (Cloud Dive & Veil Rift)
  // ==========================================
  playCloudDiveTransition(volume = 0.75) {
    this.ensureContext();
    if (!this.ctx || this.ctx.state !== 'running') return;

    const t = this.ctx.currentTime;
    const dur = 1.35;

    // Rushing wind vortex filter sweep
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2.0 - 1.0;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(950, t);
    filter.frequency.exponentialRampToValueAtTime(140, t + dur);
    filter.Q.setValueAtTime(2.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(volume * 0.65, t + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + dur);
  }

  playVeilTransition(volume = 0.8) {
    this.ensureContext();
    if (!this.ctx || this.ctx.state !== 'running') return;

    const t = this.ctx.currentTime;
    const dur = 1.25;

    // Mystical cosmic portal rift swell
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.6);
    osc.frequency.exponentialRampToValueAtTime(440, t + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(volume * 0.45, t + 0.55);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + dur);

    // High crystalline shimmer
    const chime = this.ctx.createOscillator();
    chime.type = 'triangle';
    chime.frequency.setValueAtTime(1244, t + 0.3);
    chime.frequency.exponentialRampToValueAtTime(1975, t + dur);

    const chimeGain = this.ctx.createGain();
    chimeGain.gain.setValueAtTime(0.001, t + 0.3);
    chimeGain.gain.linearRampToValueAtTime(volume * 0.35, t + 0.6);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    chime.connect(chimeGain);
    chimeGain.connect(this.masterGain);
    chime.start(t + 0.3);
    chime.stop(t + dur);
  }

  // ==========================================
  // 6. Pumpkin Evil Laugh ("MWA-HA-HA-HA-HA!")
  // ==========================================
  playPumpkinLaugh(volume = 0.9) {
    this.ensureContext();
    if (!this.ctx || this.ctx.state !== 'running') return;

    const t = this.ctx.currentTime;

    // 1. Resonant hollow pumpkin impact thud
    const thud = this.ctx.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(120, t);
    thud.frequency.exponentialRampToValueAtTime(42, t + 0.28);
    const thudGain = this.ctx.createGain();
    thudGain.gain.setValueAtTime(volume * 0.65, t);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    thud.connect(thudGain);
    thudGain.connect(this.masterGain);
    thud.start(t);
    thud.stop(t + 0.3);

    // 2. Synthesized Evil Cackle Laugh: 5 syllabic bursts ("Mwa - ha - ha - ha - HAA!")
    const burstPitches = [196, 174, 155, 146, 130]; // G3, F3, Eb3, D3, C3 descending
    const burstDur = 0.16;
    const burstInterval = 0.17;

    for (let b = 0; b < burstPitches.length; b++) {
      const burstStart = t + 0.12 + b * burstInterval;
      const baseFreq = burstPitches[b];

      // Rich harmonic sawtooth oscillator
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseFreq * 1.08, burstStart);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.92, burstStart + burstDur);

      // Dual Formant Filters (F1 ~600Hz, F2 ~1150Hz for "Ah/Ha" open evil vocal tract)
      const f1 = this.ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.frequency.setValueAtTime(620, burstStart);
      f1.Q.setValueAtTime(4.0, burstStart);

      const f2 = this.ctx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.frequency.setValueAtTime(1180, burstStart);
      f2.Q.setValueAtTime(4.5, burstStart);

      const burstGain = this.ctx.createGain();
      burstGain.gain.setValueAtTime(0.001, burstStart);
      burstGain.gain.linearRampToValueAtTime(volume * 0.48, burstStart + 0.025);
      burstGain.gain.exponentialRampToValueAtTime(0.001, burstStart + burstDur);

      osc.connect(f1);
      osc.connect(f2);
      f1.connect(burstGain);
      f2.connect(burstGain);
      burstGain.connect(this.masterGain);

      osc.start(burstStart);
      osc.stop(burstStart + burstDur);
    }
  }
}
