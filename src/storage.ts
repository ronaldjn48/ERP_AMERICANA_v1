// Persistencia local del progreso. Todas las operaciones toleran almacenamiento bloqueado (modo privado, LMS en iframe).
import { sanitizeConfig } from './engine/config';
import type { Decisions, SimConfig, SimState, StudentProfile } from './engine/types';
import { DEFAULT_NARRATOR_OPTIONS, type NarratorOptions } from './audio/narrator';

export type Phase = 'setup' | 'briefing' | 'play' | 'final';

export interface SaveGame {
  v: 1;
  phase: Phase;
  profile: StudentProfile;
  config: SimConfig;
  state: SimState;
  draft: Decisions;
  reflections: string[];
  quiz: Record<string, number>;
  savedAt: string;
}

export interface AudioPrefs {
  narrator: NarratorOptions;
  sfx: boolean;
  sfxVolume: number;
  autoNarrate: boolean;
}

const SAVE_KEY = 'erp-americana:partida:v1';
const AUDIO_KEY = 'erp-americana:audio:v1';

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento lleno o bloqueado: la partida sigue en memoria */
  }
}

export function loadSave(): SaveGame | null {
  const s = read<SaveGame>(SAVE_KEY);
  if (!s || s.v !== 1 || !s.state || !Array.isArray(s.state.history)) return null;
  return { ...s, config: sanitizeConfig(s.config), reflections: s.reflections ?? [], quiz: s.quiz ?? {} };
}

export function storeSave(s: Omit<SaveGame, 'v' | 'savedAt'>) {
  write(SAVE_KEY, { ...s, v: 1, savedAt: new Date().toISOString() });
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    /* sin acción */
  }
}

export const DEFAULT_AUDIO: AudioPrefs = {
  narrator: DEFAULT_NARRATOR_OPTIONS,
  sfx: true,
  sfxVolume: 0.5,
  autoNarrate: true,
};

export function loadAudioPrefs(): AudioPrefs {
  const p = read<Partial<AudioPrefs>>(AUDIO_KEY);
  return {
    ...DEFAULT_AUDIO,
    ...p,
    narrator: { ...DEFAULT_AUDIO.narrator, ...(p?.narrator ?? {}) },
  };
}

export function storeAudioPrefs(p: AudioPrefs) {
  write(AUDIO_KEY, p);
}
