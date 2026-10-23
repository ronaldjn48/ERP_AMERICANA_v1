import { useMemo, useState } from 'react';
import { GLOSSARY } from '../content/pedagogy';
import { MODULE_INFO, MODULE_ORDER } from '../engine/config';
import type { ModuleId } from '../engine/types';
import { SpeakButton } from './ui';

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export function Glossary() {
  const [q, setQ] = useState('');
  const [mod, setMod] = useState<ModuleId | 'todos'>('todos');
  const items = useMemo(() => {
    const nq = normalize(q.trim());
    return GLOSSARY.filter(
      (g) => (mod === 'todos' || g.module === mod) && (!nq || normalize(`${g.term} ${g.definition}`).includes(nq)),
    ).sort((a, b) => a.term.localeCompare(b.term, 'es'));
  }, [q, mod]);

  return (
    <section className="card glossary" aria-labelledby="glos-title">
      <h2 id="glos-title">Glosario gerencial</h2>
      <div className="row wrap">
        <label className="stack grow">
          <span>Buscar un concepto</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ejemplo: ROAS, punto de reorden" />
        </label>
        <label className="stack">
          <span>Módulo</span>
          <select value={mod} onChange={(e) => setMod(e.target.value as ModuleId | 'todos')}>
            <option value="todos">Todos</option>
            {MODULE_ORDER.map((m) => (
              <option key={m} value={m}>
                {MODULE_INFO[m].short}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted small" role="status">
        {items.length} {items.length === 1 ? 'concepto' : 'conceptos'}
      </p>
      <dl className="terms">
        {items.map((g) => (
          <div key={g.term} className="term">
            <dt>
              {g.term} <span className="badge">{MODULE_INFO[g.module].short}</span>
            </dt>
            <dd>
              <p>{g.definition}</p>
              {g.formula ? <p className="formula">{g.formula}</p> : null}
              <SpeakButton text={`${g.term}. ${g.definition} ${g.formula ?? ''}`} id={`glos-${g.term}`} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
