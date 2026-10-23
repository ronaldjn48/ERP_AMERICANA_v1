import { useSyncExternalStore } from 'react';
import { loadAudioPrefs } from '../storage';
import { Narrator } from './narrator';
import { Sfx } from './sfx';

const prefs = loadAudioPrefs();

/** Instancias únicas: una sola voz y un solo contexto de audio para toda la aplicación. */
export const narrator = new Narrator({ options: prefs.narrator });
export const sfx = new Sfx();
sfx.enabled = prefs.sfx;
sfx.setVolume(prefs.sfxVolume);

// Desbloqueo de audio en el primer gesto del usuario (requisito de Safari/iOS y de Chrome).
if (typeof window !== 'undefined') {
  const unlock = () => {
    narrator.unlock();
    sfx.unlock();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

export function useNarrator() {
  return useSyncExternalStore(narrator.subscribe, narrator.getSnapshot, narrator.getSnapshot);
}
