import { describe, expect, it } from 'vitest';
import { Narrator, chunkText, sortVoices, watchdogMs, type SynthLike, type Timers, type UtteranceLike, type VoiceLike } from '../src/audio/narrator';
import { pesosHabla, toSpeech } from '../src/engine/format';

/** Temporizadores manuales para avanzar el tiempo en las pruebas. */
class FakeTimers implements Timers {
  now = 0;
  private seq = 0;
  private tasks = new Map<number, { at: number; fn: () => void }>();
  setTimeout(fn: () => void, ms: number) {
    const id = ++this.seq;
    this.tasks.set(id, { at: this.now + ms, fn });
    return id;
  }
  clearTimeout(id: unknown) {
    this.tasks.delete(id as number);
  }
  advance(ms: number) {
    const end = this.now + ms;
    for (;;) {
      const next = [...this.tasks.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      this.tasks.delete(next[0]);
      this.now = next[1].at;
      next[1].fn();
    }
    this.now = end;
  }
}

class FakeSynth implements SynthLike {
  spoken: UtteranceLike[] = [];
  queue: UtteranceLike[] = [];
  cancels = 0;
  voices: VoiceLike[] = [
    { voiceURI: 'en', name: 'English', lang: 'en-US' },
    { voiceURI: 'es-es', name: 'Español España', lang: 'es-ES' },
    { voiceURI: 'es-co', name: 'Español Colombia', lang: 'es-CO' },
  ];
  get speaking() {
    return this.queue.length > 0;
  }
  get pending() {
    return false;
  }
  speak(u: UtteranceLike) {
    this.spoken.push(u);
    this.queue.push(u);
  }
  cancel() {
    this.cancels++;
    const q = this.queue;
    this.queue = [];
    q.forEach((u) => u.onerror?.({ error: 'interrupted' }));
  }
  getVoices() {
    return this.voices;
  }
  /** Simula que el navegador terminó de leer la locución activa. */
  finishCurrent() {
    const u = this.queue.shift();
    u?.onend?.();
  }
}

function makeUtterance(text: string): UtteranceLike {
  return { text, lang: '', rate: 1, pitch: 1, volume: 1, voice: null, onend: null, onerror: null };
}

function setup() {
  const synth = new FakeSynth();
  const timers = new FakeTimers();
  const narrator = new Narrator({ synth, makeUtterance, timers });
  return { synth, timers, narrator };
}

const LONG =
  'El inventario es el corazón del ERP. Si compras poco, pierdes ventas. Si compras mucho, inmovilizas caja. ' +
  'El punto de reorden se calcula con la demanda diaria, el tiempo de entrega y el stock de seguridad. ' +
  'La pauta digital se evalúa con el ROAS, comparándolo con el ROAS de equilibrio, que depende del margen de contribución del producto.';

describe('fragmentación del texto', () => {
  it('ningún fragmento supera el máximo y no se pierde texto', () => {
    const chunks = chunkText(LONG, 120);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(120));
    expect(chunks.join(' ').replace(/\s+/g, ' ')).toBe(LONG.replace(/\s+/g, ' ').trim());
  });
  it('corta palabras sueltas muy largas sin perder contenido', () => {
    const text = Array.from({ length: 80 }, (_, i) => `palabra${i}`).join(' ');
    const chunks = chunkText(text, 60);
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(60));
    expect(chunks.join(' ')).toBe(text);
  });
  it('devuelve vacío para texto vacío', () => {
    expect(chunkText('   ')).toEqual([]);
  });
});

describe('narrador', () => {
  it('prefiere voces en español de Colombia', () => {
    const sorted = sortVoices(new FakeSynth().voices);
    expect(sorted[0].lang).toBe('es-CO');
    expect(sorted[sorted.length - 1].spanish).toBe(false);
  });

  it('lee todos los fragmentos en orden y vuelve a reposo', () => {
    const { synth, narrator } = setup();
    narrator.speak(LONG, 'demo');
    const expected = chunkText(LONG);
    for (let i = 0; i < expected.length; i++) {
      expect(narrator.getSnapshot().status).toBe('speaking');
      expect(synth.spoken[i].text).toBe(expected[i]);
      expect(synth.spoken[i].lang).toBe('es-CO');
      synth.finishCurrent();
    }
    expect(narrator.getSnapshot().status).toBe('idle');
    expect(synth.spoken).toHaveLength(expected.length);
  });

  it('stop() detiene y los callbacks tardíos no reactivan la lectura', () => {
    const { synth, narrator, timers } = setup();
    narrator.speak(LONG, 'demo');
    const first = synth.spoken[0];
    narrator.stop();
    expect(narrator.getSnapshot().status).toBe('idle');
    first.onend?.();
    timers.advance(60000);
    expect(synth.spoken).toHaveLength(1);
  });

  it('pausa y reanuda desde el fragmento en curso', () => {
    const { synth, narrator, timers } = setup();
    narrator.speak(LONG, 'demo');
    synth.finishCurrent();
    const second = synth.spoken[1].text;
    narrator.pause();
    expect(narrator.getSnapshot().status).toBe('paused');
    narrator.resume();
    timers.advance(100);
    expect(synth.spoken[synth.spoken.length - 1].text).toBe(second);
  });

  it('el temporizador de vigilancia avanza si el navegador nunca dispara onend', () => {
    const { synth, narrator, timers } = setup();
    narrator.speak(LONG, 'demo');
    const total = chunkText(LONG).length;
    timers.advance(10 * 60 * 1000);
    expect(synth.spoken).toHaveLength(total);
    expect(narrator.getSnapshot().status).toBe('idle');
  });

  it('un nuevo speak reemplaza la lectura anterior sin mezclar textos', () => {
    const { synth, narrator, timers } = setup();
    narrator.speak(LONG, 'a');
    narrator.speak('Segundo texto.', 'b');
    timers.advance(100);
    expect(synth.spoken[synth.spoken.length - 1].text).toBe('Segundo texto.');
    synth.finishCurrent();
    expect(narrator.getSnapshot().status).toBe('idle');
  });

  it('tras tres errores seguidos informa el problema y se detiene', () => {
    const { synth, narrator, timers } = setup();
    narrator.speak(LONG, 'demo');
    for (let i = 0; i < 3; i++) {
      const u = synth.queue.shift();
      u?.onerror?.({ error: 'synthesis-failed' });
      timers.advance(100);
    }
    const snap = narrator.getSnapshot();
    expect(snap.status).toBe('idle');
    expect(snap.error).toMatch(/falló/);
  });

  it('no habla si está desactivado o no hay soporte', () => {
    const { synth, narrator } = setup();
    narrator.setOptions({ enabled: false });
    narrator.speak('Hola.');
    expect(synth.spoken).toHaveLength(0);
    const silent = new Narrator({ synth: null, makeUtterance: null });
    expect(silent.getSnapshot().supported).toBe(false);
    silent.speak('Hola.');
  });

  it('limita la velocidad a un rango seguro', () => {
    const { narrator } = setup();
    narrator.setOptions({ rate: 5 });
    expect(narrator.getSnapshot().options.rate).toBe(1.6);
    expect(watchdogMs('x'.repeat(130), 1)).toBeGreaterThan(10000);
  });
});

describe('texto para voz', () => {
  it('convierte cifras a lenguaje hablado', () => {
    expect(pesosHabla(12500000)).toBe('12,5 millones de pesos');
    expect(pesosHabla(1000000)).toBe('1 millón de pesos');
    expect(pesosHabla(-45000)).toBe('menos 45 mil pesos');
    expect(toSpeech('Ganaste $1.200.000 con 15 % de margen en el CRM')).toBe(
      'Ganaste 1,2 millones de pesos con 15 por ciento de margen en el C R M',
    );
  });
});
