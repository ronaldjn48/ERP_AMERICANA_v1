import { useEffect, useRef, useState } from 'react';
import { narrator, sfx, useNarrator } from '../audio';
import { isSpainVoice } from '../audio/narrator';
import type { AudioPrefs } from '../storage';

const SAMPLE =
  'Hola. Soy la voz del simulador. Te acompañaré con los resultados de cada mes y las lecciones clave para tomar mejores decisiones.';

export function AudioBar({ prefs, onChange }: { prefs: AudioPrefs; onChange: (p: AudioPrefs) => void }) {
  const snap = useNarrator();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const setNarrator = (patch: Partial<AudioPrefs['narrator']>) => {
    narrator.setOptions(patch);
    onChange({ ...prefs, narrator: { ...prefs.narrator, ...patch } });
  };

  const latam = snap.voices.filter((v) => v.spanish && !isSpainVoice(v.lang));
  const spain = snap.voices.filter((v) => v.spanish && isSpainVoice(v.lang));
  const spanish = [...latam, ...spain];
  const others = snap.voices.filter((v) => !v.spanish);
  const active = prefs.narrator.voiceURI ? snap.voices.find((v) => v.voiceURI === prefs.narrator.voiceURI) : spanish[0];

  return (
    <div className="audio-bar" ref={panelRef}>
      {snap.status !== 'idle' ? (
        <div className="audio-now" role="status" aria-live="polite">
          <span className="audio-pulse" aria-hidden="true" />
          <span>
            {snap.status === 'paused' ? 'En pausa' : 'Narrando'} {snap.chunkIndex + 1}/{snap.chunkCount}
          </span>
          {snap.status === 'speaking' ? (
            <button type="button" className="btn-icon" onClick={() => narrator.pause()} aria-label="Pausar narración">
              ❚❚
            </button>
          ) : (
            <button type="button" className="btn-icon" onClick={() => narrator.resume()} aria-label="Reanudar narración">
              ▶
            </button>
          )}
          <button type="button" className="btn-icon" onClick={() => narrator.stop()} aria-label="Detener narración">
            ■
          </button>
        </div>
      ) : null}
      <button
        type="button"
        className="btn-ghost"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Configuración de audio"
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true">{prefs.narrator.enabled ? '🔊' : '🔇'}</span> <span className="btn-label">Audio</span>
      </button>
      {open ? (
        <div className="audio-panel" role="dialog" aria-label="Configuración de audio">
          <h3>Audio</h3>
          {!snap.supported ? (
            <p className="notice notice-warn">
              Este navegador no tiene síntesis de voz. Usa Chrome, Edge o Safari actualizados. El simulador funciona igual sin audio.
            </p>
          ) : null}
          {snap.error ? <p className="notice notice-warn">{snap.error}</p> : null}
          <label className="check">
            <input
              type="checkbox"
              checked={prefs.narrator.enabled}
              disabled={!snap.supported}
              onChange={(e) => setNarrator({ enabled: e.target.checked })}
            />
            Narración por voz
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={prefs.autoNarrate}
              disabled={!snap.supported || !prefs.narrator.enabled}
              onChange={(e) => onChange({ ...prefs, autoNarrate: e.target.checked })}
            />
            Leer automáticamente eventos y resultados
          </label>
          <label className="stack">
            <span>Voz</span>
            <select
              value={prefs.narrator.voiceURI ?? ''}
              disabled={!snap.supported || snap.voices.length === 0}
              onChange={(e) => setNarrator({ voiceURI: e.target.value || null })}
            >
              <option value="">Automática (español de Colombia o Latinoamérica)</option>
              {latam.length > 0 ? (
                <optgroup label="Español de Colombia y Latinoamérica">
                  {latam.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {spain.length > 0 ? (
                <optgroup label="Español de España">
                  {spain.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {others.length > 0 ? (
                <optgroup label="Otros idiomas">
                  {others.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
            {snap.supported && snap.voices.length > 0 && spanish.length === 0 ? (
              <small>No hay voces en español instaladas. Instala una voz en la configuración del sistema operativo.</small>
            ) : null}
            {active && isSpainVoice(active.lang) ? (
              <small>
                {latam.length > 0
                  ? 'Esta voz tiene acento de España. Elige una voz de Colombia o Latinoamérica en la lista.'
                  : 'Este equipo solo tiene voces de España. Para acento latinoamericano usa Chrome (voz "Google español de Estados Unidos") o Edge (voces de Colombia y México), o instala una voz es-CO o es-MX en el sistema operativo.'}
              </small>
            ) : null}
          </label>
          <label className="stack">
            <span>Velocidad: {prefs.narrator.rate.toFixed(1)}×</span>
            <input
              type="range"
              min={0.6}
              max={1.6}
              step={0.1}
              value={prefs.narrator.rate}
              onChange={(e) => setNarrator({ rate: Number(e.target.value) })}
            />
          </label>
          <label className="stack">
            <span>Volumen de la voz: {Math.round(prefs.narrator.volume * 100)} %</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={prefs.narrator.volume}
              onChange={(e) => setNarrator({ volume: Number(e.target.value) })}
            />
          </label>
          <button type="button" className="btn-secondary" disabled={!snap.supported || !prefs.narrator.enabled} onClick={() => narrator.toggle(SAMPLE, 'muestra')}>
            {snap.currentId === 'muestra' ? 'Detener prueba' : 'Probar voz'}
          </button>
          <hr />
          <label className="check">
            <input
              type="checkbox"
              checked={prefs.sfx}
              onChange={(e) => {
                sfx.enabled = e.target.checked;
                onChange({ ...prefs, sfx: e.target.checked });
                if (e.target.checked) sfx.play('click');
              }}
            />
            Efectos de sonido
          </label>
          <label className="stack">
            <span>Volumen de efectos: {Math.round(prefs.sfxVolume * 100)} %</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={prefs.sfxVolume}
              disabled={!prefs.sfx}
              onChange={(e) => {
                sfx.setVolume(Number(e.target.value));
                onChange({ ...prefs, sfxVolume: Number(e.target.value) });
              }}
              onPointerUp={() => sfx.play('success')}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
