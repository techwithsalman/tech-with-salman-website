// Highway Racer 3D - Procedural Web Audio Engine (Zero external dependencies)

export class AudioSystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.ctx = null;
    this.initialized = false;
    this.masterGain = null;

    // Engine synth nodes
    this.engineGain = null;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineSub = null;
    this.engineFilter = null;

    // Wind noise nodes
    this.windGain = null;
    this.windFilter = null;
    this.noiseBuffer = null;

    // Skid sound nodes
    this.skidGain = null;
    this.skidFilter = null;

    this.gameState.on('soundToggled', (enabled) => {
      this.setMuted(!enabled);
    });
  }

  ensureContext() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.gameState.soundEnabled ? 1.0 : 0.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.generateNoiseBuffer();
      this.setupEngineSynth();
      this.setupWindSynth();
      this.setupSkidSynth();

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio initialization error:', e);
    }
  }

  generateNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  setupEngineSynth() {
    if (!this.ctx) return;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(350, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    // Primary V8 cylinder oscillator (sawtooth)
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);

    // Secondary harmonic oscillator (triangle)
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(90, this.ctx.currentTime);

    // Sub rumble
    this.engineSub = this.ctx.createOscillator();
    this.engineSub.type = 'sine';
    this.engineSub.frequency.setValueAtTime(22.5, this.ctx.currentTime);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    this.engineSub.connect(subGain);
    subGain.connect(this.engineFilter);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
    this.engineSub.start();
  }

  setupWindSynth() {
    if (!this.ctx || !this.noiseBuffer) return;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;
    noiseSource.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
    this.windFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    noiseSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    noiseSource.start();
  }

  setupSkidSynth() {
    if (!this.ctx || !this.noiseBuffer) return;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;
    noiseSource.loop = true;

    this.skidFilter = this.ctx.createBiquadFilter();
    this.skidFilter.type = 'bandpass';
    this.skidFilter.frequency.setValueAtTime(2400, this.ctx.currentTime);
    this.skidFilter.Q.setValueAtTime(6.0, this.ctx.currentTime);

    this.skidGain = this.ctx.createGain();
    this.skidGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    noiseSource.connect(this.skidFilter);
    this.skidFilter.connect(this.skidGain);
    this.skidGain.connect(this.masterGain);

    noiseSource.start();
  }

  setMuted(muted) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0.0 : 1.0, this.ctx.currentTime, 0.05);
    }
  }

  updateEngine(speedKmh, throttle, isBraking, isSkidding) {
    if (!this.initialized || !this.ctx) return;

    const now = this.ctx.currentTime;
    const speedRatio = Math.max(0, Math.min(1.0, speedKmh / 230));

    // Dynamic pitch: 40Hz idle up to 260Hz redline
    const baseFreq = 42 + (speedRatio * 180) + (throttle * 30);
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.02, now, 0.05);
    this.engineSub.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.05);

    // Filter opens with speed and throttle
    const filterFreq = 260 + (speedRatio * 1800) + (throttle * 600);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.05);

    // Volume
    const isPlaying = this.gameState.isPlaying();
    const targetVolume = isPlaying ? (0.25 + (speedRatio * 0.25) + (throttle * 0.15)) : 0.0001;
    this.engineGain.gain.setTargetAtTime(targetVolume, now, 0.08);

    // Wind rush noise at higher speeds
    if (this.windGain) {
      const windVolume = isPlaying ? Math.pow(speedRatio, 2.2) * 0.35 : 0.0001;
      this.windGain.gain.setTargetAtTime(windVolume, now, 0.1);
      this.windFilter.frequency.setTargetAtTime(600 + (speedRatio * 1400), now, 0.1);
    }

    // Tire screech on hard braking or high speed cornering
    if (this.skidGain) {
      const skidVolume = isPlaying && isSkidding ? 0.4 : 0.0001;
      this.skidGain.gain.setTargetAtTime(skidVolume, now, 0.04);
    }
  }

  playNearMiss() {
    if (!this.initialized || !this.ctx || !this.gameState.soundEnabled) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    // Frequency sweep down for doppler effect
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.35);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  playCrash() {
    if (!this.initialized || !this.ctx || !this.gameState.soundEnabled) return;

    const now = this.ctx.currentTime;

    // 1. Heavy low-end impact boom
    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.type = 'triangle';
    boomOsc.frequency.setValueAtTime(160, now);
    boomOsc.frequency.exponentialRampToValueAtTime(25, now + 0.8);

    boomGain.gain.setValueAtTime(0.8, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    boomOsc.connect(boomGain);
    boomGain.connect(this.masterGain);
    boomOsc.start(now);
    boomOsc.stop(now + 0.9);

    // 2. High-frequency metal crunch
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1500, now);
      filter.frequency.exponentialRampToValueAtTime(400, now + 0.5);
      filter.Q.setValueAtTime(2.0, now);

      const crunchGain = this.ctx.createGain();
      crunchGain.gain.setValueAtTime(0.7, now);
      crunchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      noise.connect(filter);
      filter.connect(crunchGain);
      crunchGain.connect(this.masterGain);

      noise.start(now);
      noise.stop(now + 0.65);
    }
  }

  playButtonClick() {
    if (!this.initialized || !this.ctx || !this.gameState.soundEnabled) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.06);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  stopAll() {
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
    }
    if (this.windGain && this.ctx) {
      this.windGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
    }
    if (this.skidGain && this.ctx) {
      this.skidGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
    }
  }
}
