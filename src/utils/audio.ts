/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true; // Start muted by default to respect browser policies, user can toggle in UI

  private init() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn('Web Audio API not supported in this browser', e);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (!this.isMuted) {
      this.init();
    }
    return this.isMuted;
  }

  public getMutedState() {
    return this.isMuted;
  }

  public playCollect() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  public playHit() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime); // A3
    osc.frequency.exponentialRampToValueAtTime(55, this.ctx.currentTime + 0.3); // A1

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    // Apply distortion or simple lowpass filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  public playSave() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5 arpeggio
    notes.forEach((freq, index) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + index * 0.08);

      gain.gain.setValueAtTime(0, this.ctx!.currentTime + index * 0.08);
      gain.gain.linearRampToValueAtTime(0.1, this.ctx!.currentTime + index * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + index * 0.08 + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(this.ctx!.currentTime + index * 0.08);
      osc.stop(this.ctx!.currentTime + index * 0.08 + 0.26);
    });
  }

  public playGameOver() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    // Desolate slide down chord
    const rootOsc = this.ctx.createOscillator();
    const fifthOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    rootOsc.type = 'sawtooth';
    rootOsc.frequency.setValueAtTime(220, this.ctx.currentTime);
    rootOsc.frequency.linearRampToValueAtTime(110, this.ctx.currentTime + 0.8);

    fifthOsc.type = 'sine';
    fifthOsc.frequency.setValueAtTime(330, this.ctx.currentTime);
    fifthOsc.frequency.linearRampToValueAtTime(165, this.ctx.currentTime + 0.8);

    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.9);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, this.ctx.currentTime);

    rootOsc.connect(filter);
    fifthOsc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    rootOsc.start();
    fifthOsc.start();
    rootOsc.stop(this.ctx.currentTime + 1.0);
    fifthOsc.stop(this.ctx.currentTime + 1.0);
  }

  public playLevelUp() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 synth surge

    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.06 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.32);
    });
  }

  public playEngineHum(vx: number, vy: number) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed < 0.2) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Frequency shifts slightly with speed
    osc.frequency.setValueAtTime(80 + Math.min(speed * 20, 100), this.ctx.currentTime);

    gain.gain.setValueAtTime(Math.min(speed * 0.02, 0.06), this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }
}

export const audio = new SoundSystem();
