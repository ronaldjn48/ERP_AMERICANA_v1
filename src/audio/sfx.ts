// Efectos de sonido sintetizados con Web Audio API: no dependen de archivos externos ni de la red.
// Cada nota usa una envolvente (ataque y caída) para evitar chasquidos, y el contexto de audio se crea
// solo después de un gesto del usuario, como exigen las políticas de reproducción automática.

export type SfxKind = 'click' | 'success' | 'warning' | 'error' | 'event' | 'finish';

type Note = [frequency: number, start: number, duration: number];

const PATTERNS: Record<SfxKind, { type: OscillatorType; notes: Note[]; gain: number }> = {
  click: { type: 'triangle', notes: [[880, 0, 0.05]], gain: 0.15 },
  success: { type: 'sine', notes: [[523.25, 0, 0.12], [659.25, 0.1, 0.12], [783.99, 0.2, 0.22]], gain: 0.25 },
  warning: { type: 'triangle', notes: [[659.25, 0, 0.14], [523.25, 0.14, 0.2]], gain: 0.25 },
  error: { type: 'square', notes: [[196, 0, 0.18], [164.81, 0.18, 0.26]], gain: 0.12 },
  event: { type: 'sine', notes: [[987.77, 0, 0.12], [1318.51, 0.12, 0.3]], gain: 0.2 },
  finish: {
    type: 'sine',
    notes: [[523.25, 0, 0.15], [659.25, 0.15, 0.15], [783.99, 0.3, 0.15], [1046.5, 0.45, 0.4]],
    gain: 0.25,
  },
};

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = true;
  volume = 0.6;

  /** Debe llamarse dentro de un gesto del usuario (clic o tecla). */
  unlock() {
    if (typeof window === 'undefined') return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try {
      if (!this.ctx) {
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state !== 'running') void this.ctx.resume().catch(() => undefined);
    } catch {
      this.ctx = null;
    }
  }

  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.master) this.master.gain.value = this.volume;
  }

  play(kind: SfxKind) {
    if (!this.enabled || this.volume <= 0) return;
    this.unlock();
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const run = () => {
      const pattern = PATTERNS[kind];
      const t0 = ctx.currentTime + 0.01;
      for (const [freq, start, dur] of pattern.notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = pattern.type;
        osc.frequency.value = freq;
        const s = t0 + start;
        gain.gain.setValueAtTime(0.0001, s);
        gain.gain.exponentialRampToValueAtTime(pattern.gain, s + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, s + dur);
        osc.connect(gain).connect(master);
        osc.start(s);
        osc.stop(s + dur + 0.02);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
      }
    };
    if (ctx.state === 'running') run();
    else void ctx.resume().then(run).catch(() => undefined);
  }
}
