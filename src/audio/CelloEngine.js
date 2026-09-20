/**
 * Web Audio API Procedural Cinematic Cello Engine
 * - Eerie, dramatic, building cello score for Route 13
 * - Modulates to soft, warm, gentle happy cello for The Otherworld
 */
export class CelloEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.isHappy = false;
    this.masterGain = null;
    this.reverbNode = null;
    this.currentTimeout = null;

    // Musical phrase definitions (frequencies in Hz)
    // Dark Cinematic Slasher Progression (D minor / C minor suspense)
    this.darkNotes = [
      { note: 73.42, dur: 4.5, gain: 0.55 }, // D2 (deep low cello root)
      { note: 110.0, dur: 3.5, gain: 0.45 }, // A2 (fifth swell)
      { note: 87.31, dur: 4.0, gain: 0.50 }, // F2 (minor third tension)
      { note: 98.00, dur: 3.5, gain: 0.48 }, // G2 (climbing tension)
      { note: 58.27, dur: 5.5, gain: 0.65 }, // Bb1 (ominous drop into abyss)
      { note: 55.00, dur: 5.0, gain: 0.60 }, // A1 (dominant suspense)
      { note: 73.42, dur: 6.0, gain: 0.70 }, // D2 (dramatic resolving swell)
      { note: 146.83, dur: 3.0, gain: 0.38 },// D3 (eerie high harmonic cry)
      { note: 130.81, dur: 3.5, gain: 0.40 },// C3 (slasher unresolved tension)
      { note: 123.47, dur: 4.5, gain: 0.42 } // B2 (diminished dread)
    ];

    // Happy Otherworld Progression (Warm, lyrical D major / G major paradise)
    this.happyNotes = [
      { note: 146.83, dur: 4.0, gain: 0.35 }, // D3
      { note: 185.00, dur: 3.5, gain: 0.38 }, // F#3 (warm major third)
      { note: 220.00, dur: 4.5, gain: 0.40 }, // A3
      { note: 196.00, dur: 3.8, gain: 0.36 }, // G3
      { note: 246.94, dur: 4.2, gain: 0.42 }, // B3
      { note: 220.00, dur: 3.5, gain: 0.38 }, // A3
      { note: 293.66, dur: 5.0, gain: 0.35 }, // D4 (gentle soaring light)
      { note: 146.83, dur: 4.5, gain: 0.32 }  // D3
    ];

    this.phraseIndex = 0;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    // Master Output & Limiter
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);

    // Procedural Cathedral Reverb convolver
    this.createConvolverReverb();

    this.masterGain.connect(this.ctx.destination);
  }

  createConvolverReverb() {
    const rate = this.ctx.sampleRate;
    const length = rate * 3.5;
    const decay = 2.4;
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const val = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
      left[i] = val;
      right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
    }

    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = impulse;

    const wetGain = this.ctx.createGain();
    wetGain.gain.value = 0.55;

    this.reverbNode.connect(wetGain);
    wetGain.connect(this.masterGain);
  }

  /**
   * Synthesize a single rich, bowed cello note with multi-harmonic string modeling
   */
  playBowedCelloTone(freq, duration, targetGain) {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;

    // 1. Primary Bowed Sawtooth Oscillators (Slightly detuned for chorused string resonance)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const oscSub = this.ctx.createOscillator();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    oscSub.type = this.isHappy ? 'sine' : 'triangle'; // Sub-bass undertone

    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 1.004, now); // Detune
    oscSub.frequency.setValueAtTime(freq * 0.5, now); // Sub-octave resonance

    // 2. Natural Cello Bowing Vibrato LFO
    const vibrato = this.ctx.createOscillator();
    const vibratoGain = this.ctx.createGain();
    vibrato.frequency.value = this.isHappy ? 4.8 : 5.4; // 5Hz human vibrato
    vibratoGain.gain.setValueAtTime(freq * (this.isHappy ? 0.015 : 0.022), now);

    // Swell vibrato intensity over the note duration
    vibratoGain.gain.linearRampToValueAtTime(freq * 0.035, now + duration * 0.7);

    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc1.frequency);
    vibratoGain.connect(osc2.frequency);

    // 3. Acoustic Cello Wooden Body Formant Filters
    const bodyFilter = this.ctx.createBiquadFilter();
    bodyFilter.type = 'bandpass';
    bodyFilter.frequency.value = this.isHappy ? 350 : 240;
    bodyFilter.Q.value = 2.0;

    const airFilter = this.ctx.createBiquadFilter();
    airFilter.type = 'lowpass';
    airFilter.frequency.setValueAtTime(this.isHappy ? 2200 : 1600, now);

    // 4. Note Envelope (Smooth bowed attack, long cinematic swell, and gentle decay)
    const noteGain = this.ctx.createGain();
    const attackTime = duration * 0.35;
    const releaseTime = duration * 0.45;

    noteGain.gain.setValueAtTime(0.0001, now);
    noteGain.gain.exponentialRampToValueAtTime(targetGain, now + attackTime);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + duration + releaseTime);

    // Connect audio graph
    osc1.connect(bodyFilter);
    osc2.connect(bodyFilter);
    oscSub.connect(airFilter);

    bodyFilter.connect(airFilter);
    airFilter.connect(noteGain);

    noteGain.connect(this.masterGain);
    if (this.reverbNode) {
      noteGain.connect(this.reverbNode);
    }

    // Start oscillators
    vibrato.start(now);
    osc1.start(now);
    osc2.start(now);
    oscSub.start(now);

    const stopTime = now + duration + releaseTime;
    vibrato.stop(stopTime);
    osc1.stop(stopTime);
    osc2.stop(stopTime);
    oscSub.stop(stopTime);
  }

  scheduleNextNote() {
    if (!this.isPlaying) return;

    const list = this.isHappy ? this.happyNotes : this.darkNotes;
    const phrase = list[this.phraseIndex % list.length];
    this.phraseIndex++;

    this.playBowedCelloTone(phrase.note, phrase.dur, phrase.gain);

    // Schedule next note with slight organic overlap (legato bowed transition)
    const nextInterval = (phrase.dur * 0.78) * 1000;
    this.currentTimeout = setTimeout(() => {
      this.scheduleNextNote();
    }, nextInterval);
  }

  start() {
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.scheduleNextNote();
  }

  pause() {
    this.isPlaying = false;
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
  }

  toggle() {
    if (this.isPlaying) {
      this.pause();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  setMode(mode) {
    if (mode === 'happy') {
      this.isHappy = true;
      this.phraseIndex = 0;
    } else {
      this.isHappy = false;
      this.phraseIndex = 0;
    }
  }
}
