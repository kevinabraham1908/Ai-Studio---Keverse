export class VillageAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private breezeGain: GainNode | null = null;
  private enabled = false;
  private nextBirdTime = 0;

  public setEnabled(on: boolean): void {
    this.enabled = on;
    if (on) {
      this.ensureContext();
      if (this.ctx?.state === 'suspended') {
        void this.ctx.resume();
      }
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(0.32, this.ctx.currentTime, 0.25);
      }
    } else if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.15);
    }
  }

  private ensureContext(): void {
    if (this.ctx) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // Soft filtered pink-ish morning breeze
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      data[i] = (b0 + b1) * 0.45;
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = buffer;
    noiseSrc.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;

    const breezeGain = ctx.createGain();
    breezeGain.gain.value = 0.18;

    noiseSrc.connect(filter);
    filter.connect(breezeGain);
    breezeGain.connect(master);
    noiseSrc.start();

    this.ctx = ctx;
    this.masterGain = master;
    this.breezeGain = breezeGain;
    this.nextBirdTime = ctx.currentTime + 1.2;
  }

  /**
   * Plays a warm, resonant Swiss brass cowbell clang.
   */
  public triggerCowbell(distanceFactor = 1.0): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const vol = Math.max(0.05, Math.min(0.28, 0.24 * distanceFactor));

    // Classic Swiss cowbell inharmonic partials
    const freqs = [392, 524, 786, 1185];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f * (0.99 + Math.random() * 0.02), now);

      const decay = 0.75 / (idx + 1);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(vol / (idx + 1.4), now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + decay + 0.05);
    });
  }

  public update(speedScale: number): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    if (this.breezeGain) {
      this.breezeGain.gain.setTargetAtTime(0.14 + 0.06 * speedScale, now, 0.3);
    }

    if (now >= this.nextBirdTime && speedScale > 0.05) {
      this.triggerBirdChirp(now);
      this.nextBirdTime = now + 2.6 + Math.random() * 4.5;
    }
  }

  private triggerBirdChirp(now: number): void {
    if (!this.ctx || !this.masterGain) return;
    const notes = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < notes; i++) {
      const t = now + i * 0.14;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const base = 2200 + Math.random() * 900;
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.exponentialRampToValueAtTime(base * 1.28, t + 0.07);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.035, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.11);
    }
  }

  public dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
      this.breezeGain = null;
    }
  }
}
