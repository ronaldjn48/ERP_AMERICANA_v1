// Narrador basado en la Web Speech API (speechSynthesis), sin servicios externos ni claves de API.
//
// Problemas conocidos de speechSynthesis que este módulo resuelve:
// 1. Chrome corta las locuciones largas (unos 15 s): el texto se divide en fragmentos cortos por oraciones.
// 2. getVoices() llega vacío al cargar: se esperan las voces con el evento voiceschanged y un sondeo de respaldo.
// 3. El recolector de basura elimina la locución y nunca llega onend: se guarda una referencia a la locución activa.
// 4. cancel() seguido de speak() inmediato a veces se pierde: se espera un breve intervalo antes de hablar.
// 5. pause()/resume() fallan en Android y en algunos Chrome de escritorio: la pausa cancela y la reanudación
//    repite el fragmento en curso.
// 6. onend no siempre se dispara: un temporizador de vigilancia avanza al siguiente fragmento.
// 7. Al volver a una pestaña oculta la síntesis puede quedar detenida: se reanuda el fragmento actual.
// Cada llamada a speak/stop/pause invalida los callbacks pendientes mediante un token de sesión.

export type NarratorStatus = 'idle' | 'speaking' | 'paused';

export interface NarratorOptions {
  enabled: boolean;
  rate: number;
  pitch: number;
  volume: number;
  voiceURI: string | null;
}

export interface VoiceInfo {
  voiceURI: string;
  name: string;
  lang: string;
  spanish: boolean;
}

export interface NarratorSnapshot {
  supported: boolean;
  status: NarratorStatus;
  currentId: string | null;
  chunkIndex: number;
  chunkCount: number;
  voices: VoiceInfo[];
  options: NarratorOptions;
  error: string | null;
}

/** Subconjunto de SpeechSynthesis que usa el narrador (permite pruebas con un doble). */
export interface SynthLike {
  speak(u: UtteranceLike): void;
  cancel(): void;
  getVoices(): VoiceLike[];
  readonly speaking: boolean;
  readonly pending: boolean;
  addEventListener?(type: 'voiceschanged', fn: () => void): void;
}

export interface VoiceLike {
  voiceURI: string;
  name: string;
  lang: string;
  default?: boolean;
}

export interface UtteranceLike {
  text: string;
  lang: string;
  rate: number;
  pitch: number;
  volume: number;
  voice: VoiceLike | null;
  onend: ((ev?: unknown) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
}

export interface Timers {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export const DEFAULT_NARRATOR_OPTIONS: NarratorOptions = {
  enabled: true,
  rate: 1,
  pitch: 1,
  volume: 1,
  voiceURI: null,
};

const MAX_CHUNK = 160;
const CANCEL_GAP_MS = 60;
/** Español de Colombia primero, luego otras variantes latinoamericanas; el español de España queda de último recurso. */
const PREFERRED_LANGS = ['es-co', 'es-419', 'es-us', 'es-mx', 'es-ve', 'es-pe', 'es-ec', 'es-cl', 'es-ar', 'es-pa', 'es-cr', 'es-do', 'es-gt', 'es-hn', 'es-ni', 'es-sv', 'es-py', 'es-uy', 'es-bo', 'es-pr', 'es-cu'];

/** Voces de España: solo se usan si no hay otra voz en español. */
export const isSpainVoice = (lang: string) => lang.toLowerCase().replace('_', '-') === 'es-es';

/** Las voces neuronales ("Natural", "Online", "Neural") y las de Google suenan más claras. */
const qualityRank = (name: string) => (/natural|neural|online/i.test(name) ? 0 : /google/i.test(name) ? 1 : 2);

/** Divide un texto en fragmentos cortos respetando oraciones, luego comas y por último palabras. */
export function chunkText(text: string, max = MAX_CHUNK): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?;:]+[.!?;:]*\s*/g) ?? [clean];
  const chunks: string[] = [];
  const pushPiece = (piece: string) => {
    const p = piece.trim();
    if (!p) return;
    if (p.length <= max) {
      chunks.push(p);
      return;
    }
    const parts = p.split(/(?<=,)\s+/);
    if (parts.length > 1) {
      let buf = '';
      for (const part of parts) {
        if ((buf + ' ' + part).trim().length > max && buf) {
          pushPiece(buf);
          buf = part;
        } else {
          buf = (buf + ' ' + part).trim();
        }
      }
      pushPiece(buf);
      return;
    }
    let buf = '';
    for (const word of p.split(' ')) {
      if ((buf + ' ' + word).trim().length > max && buf) {
        chunks.push(buf);
        buf = word;
      } else {
        buf = (buf + ' ' + word).trim();
      }
    }
    if (buf) chunks.push(buf);
  };
  // Agrupa oraciones cortas para que la voz no haga pausas artificiales.
  let group = '';
  for (const s of sentences) {
    const candidate = (group + ' ' + s).trim();
    if (candidate.length <= max) {
      group = candidate;
    } else {
      if (group) pushPiece(group);
      group = s.trim();
    }
  }
  if (group) pushPiece(group);
  return chunks;
}

/** Tiempo máximo razonable para un fragmento antes de darlo por terminado. */
export function watchdogMs(text: string, rate: number): number {
  const charsPerSecond = 13 * Math.max(0.5, rate);
  return Math.round((text.length / charsPerSecond) * 1000) + 4000;
}

export function sortVoices(voices: VoiceLike[]): VoiceInfo[] {
  const rank = (lang: string) => {
    const l = lang.toLowerCase().replace('_', '-');
    const i = PREFERRED_LANGS.indexOf(l);
    if (i >= 0) return i;
    if (l === 'es-es') return PREFERRED_LANGS.length + 1;
    return l.startsWith('es') ? PREFERRED_LANGS.length : 100;
  };
  return voices
    .map((v) => ({ voiceURI: v.voiceURI, name: v.name, lang: v.lang, spanish: v.lang.toLowerCase().startsWith('es') }))
    .sort((a, b) => rank(a.lang) - rank(b.lang) || qualityRank(a.name) - qualityRank(b.name) || a.name.localeCompare(b.name));
}

type Listener = () => void;

export class Narrator {
  private synth: SynthLike | null;
  private makeUtterance: ((text: string) => UtteranceLike) | null;
  private timers: Timers;
  private listeners = new Set<Listener>();
  private token = 0;
  private chunks: string[] = [];
  private index = 0;
  private current: UtteranceLike | null = null;
  private watchdog: unknown = null;
  private errorsInRow = 0;
  private unlocked = false;
  private rawVoices: VoiceLike[] = [];
  private snapshot: NarratorSnapshot;

  constructor(opts?: {
    synth?: SynthLike | null;
    makeUtterance?: ((text: string) => UtteranceLike) | null;
    timers?: Timers;
    options?: Partial<NarratorOptions>;
  }) {
    const hasWindow = typeof window !== 'undefined';
    this.synth =
      opts?.synth !== undefined ? opts.synth : hasWindow && 'speechSynthesis' in window ? (window.speechSynthesis as unknown as SynthLike) : null;
    this.makeUtterance =
      opts?.makeUtterance !== undefined
        ? opts.makeUtterance
        : hasWindow && 'SpeechSynthesisUtterance' in window
          ? (text: string) => new SpeechSynthesisUtterance(text) as unknown as UtteranceLike
          : null;
    this.timers = opts?.timers ?? {
      setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
      clearTimeout: (id) => globalThis.clearTimeout(id as ReturnType<typeof setTimeout>),
    };
    this.snapshot = {
      supported: Boolean(this.synth && this.makeUtterance),
      status: 'idle',
      currentId: null,
      chunkIndex: 0,
      chunkCount: 0,
      voices: [],
      options: { ...DEFAULT_NARRATOR_OPTIONS, ...opts?.options },
      error: null,
    };
    if (this.synth) this.initVoices();
    if (hasWindow && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibility);
      window.addEventListener('pagehide', () => this.stop());
    }
  }

  // --- Suscripción para React (useSyncExternalStore) ---
  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = (): NarratorSnapshot => this.snapshot;

  private update(patch: Partial<NarratorSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((fn) => fn());
  }

  // --- Voces ---
  private initVoices() {
    const load = () => {
      const voices = this.synth?.getVoices() ?? [];
      if (voices.length > 0) {
        this.rawVoices = voices;
        this.update({ voices: sortVoices(voices) });
        return true;
      }
      return false;
    };
    if (load()) return;
    this.synth?.addEventListener?.('voiceschanged', () => load());
    // Respaldo: algunos navegadores no disparan voiceschanged.
    let tries = 0;
    const poll = () => {
      if (load() || ++tries > 20) return;
      this.timers.setTimeout(poll, 250);
    };
    this.timers.setTimeout(poll, 250);
  }

  private pickVoice(): VoiceLike | null {
    const { voiceURI } = this.snapshot.options;
    if (voiceURI) {
      const v = this.rawVoices.find((x) => x.voiceURI === voiceURI);
      if (v) return v;
    }
    const sorted = sortVoices(this.rawVoices);
    const best = sorted.find((v) => v.spanish);
    return best ? (this.rawVoices.find((x) => x.voiceURI === best.voiceURI) ?? null) : null;
  }

  setOptions(patch: Partial<NarratorOptions>) {
    const options = { ...this.snapshot.options, ...patch };
    options.rate = Math.min(1.6, Math.max(0.6, options.rate));
    options.pitch = Math.min(1.5, Math.max(0.5, options.pitch));
    options.volume = Math.min(1, Math.max(0, options.volume));
    this.update({ options });
    if (!options.enabled) this.stop();
  }

  // --- Reproducción ---
  speak(text: string, id = 'texto') {
    if (!this.snapshot.supported || !this.snapshot.options.enabled) return;
    const chunks = chunkText(text);
    if (chunks.length === 0) return;
    const wasActive = this.snapshot.status !== 'idle' || Boolean(this.synth?.speaking || this.synth?.pending);
    this.halt();
    this.chunks = chunks;
    this.index = 0;
    this.errorsInRow = 0;
    this.update({ status: 'speaking', currentId: id, chunkIndex: 0, chunkCount: chunks.length, error: null });
    const token = this.token;
    // Si no había nada sonando se habla de inmediato: iOS exige que la primera locución ocurra dentro del gesto del usuario.
    if (wasActive) this.timers.setTimeout(() => this.speakCurrent(token), CANCEL_GAP_MS);
    else this.speakCurrent(token);
  }

  /** Desbloquea la síntesis en iOS/Safari con una locución vacía dentro del primer gesto del usuario. */
  unlock() {
    if (this.unlocked || !this.synth || !this.makeUtterance) return;
    this.unlocked = true;
    try {
      const u = this.makeUtterance(' ');
      u.volume = 0;
      this.synth.speak(u);
    } catch {
      /* sin acción */
    }
  }

  /** Alterna entre reproducir y detener el texto indicado (botones "Escuchar"). */
  toggle(text: string, id: string) {
    if (this.snapshot.currentId === id && this.snapshot.status !== 'idle') this.stop();
    else this.speak(text, id);
  }

  pause() {
    if (this.snapshot.status !== 'speaking') return;
    this.halt();
    this.update({ status: 'paused' });
  }

  resume() {
    if (this.snapshot.status !== 'paused') return;
    this.halt();
    this.update({ status: 'speaking' });
    const token = this.token;
    this.timers.setTimeout(() => this.speakCurrent(token), CANCEL_GAP_MS);
  }

  stop() {
    this.halt();
    this.chunks = [];
    this.index = 0;
    if (this.snapshot.status !== 'idle' || this.snapshot.currentId !== null) {
      this.update({ status: 'idle', currentId: null, chunkIndex: 0, chunkCount: 0 });
    }
  }

  /** Invalida callbacks pendientes y silencia el motor sin cambiar el estado visible. */
  private halt() {
    this.token++;
    this.clearWatchdog();
    this.current = null;
    try {
      this.synth?.cancel();
    } catch {
      /* algunos navegadores lanzan si no hay nada en cola */
    }
  }

  private clearWatchdog() {
    if (this.watchdog !== null) {
      this.timers.clearTimeout(this.watchdog);
      this.watchdog = null;
    }
  }

  private finish() {
    this.clearWatchdog();
    this.current = null;
    this.chunks = [];
    this.update({ status: 'idle', currentId: null, chunkIndex: 0, chunkCount: 0 });
  }

  private advance(token: number) {
    if (token !== this.token) return;
    this.clearWatchdog();
    this.current = null;
    this.index++;
    this.speakCurrent(token);
  }

  private speakCurrent(token: number) {
    if (token !== this.token || !this.synth || !this.makeUtterance) return;
    if (this.index >= this.chunks.length) {
      this.finish();
      return;
    }
    const text = this.chunks[this.index];
    const { rate, pitch, volume } = this.snapshot.options;
    const u = this.makeUtterance(text);
    const voice = this.pickVoice();
    u.voice = voice;
    u.lang = voice?.lang ?? 'es-CO';
    u.rate = rate;
    u.pitch = pitch;
    u.volume = volume;
    u.onend = () => {
      if (u !== this.current) return;
      this.errorsInRow = 0;
      this.advance(token);
    };
    u.onerror = (ev) => {
      if (u !== this.current) return;
      const code = ev?.error ?? 'desconocido';
      if (code === 'interrupted' || code === 'canceled') return;
      this.errorsInRow++;
      if (this.errorsInRow >= 3) {
        this.halt();
        this.chunks = [];
        this.update({
          status: 'idle',
          currentId: null,
          chunkIndex: 0,
          chunkCount: 0,
          error: `La voz del navegador falló (${code}). Puedes leer el texto en pantalla o cambiar de voz.`,
        });
        return;
      }
      this.advance(token);
    };
    this.current = u;
    this.update({ chunkIndex: this.index });
    this.watchdog = this.timers.setTimeout(() => {
      if (u !== this.current || token !== this.token) return;
      // La locución quedó colgada: se cancela y se continúa con el siguiente fragmento.
      this.current = null;
      try {
        this.synth?.cancel();
      } catch {
        /* sin acción */
      }
      this.index++;
      this.timers.setTimeout(() => this.speakCurrent(token), CANCEL_GAP_MS);
    }, watchdogMs(text, rate));
    try {
      this.synth.speak(u);
    } catch {
      this.advance(token);
    }
  }

  private onVisibility = () => {
    if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
    if (this.snapshot.status !== 'speaking' || !this.synth) return;
    if (!this.synth.speaking && !this.synth.pending) {
      this.halt();
      const token = this.token;
      this.timers.setTimeout(() => this.speakCurrent(token), CANCEL_GAP_MS);
    }
  };
}
