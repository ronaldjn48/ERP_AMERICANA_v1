import { useState } from 'react';
import { cop } from '../engine/format';
import { GUIDES, RULE_INFO } from '../erp/meta';
import { saveRule } from '../erp/ops';
import { run } from '../erp/store';
import type { AutomationRule, ErpState } from '../erp/types';
import { Icon } from '../ui/icons';
import { ModuleGuide, NumberInput, PageHeader } from '../ui/kit';


export function AutomationModule({ s }: { s: ErpState }) {
  const log = [...s.log].filter((l) => l.module === 'automatizacion').reverse().slice(0, 25);
  const total = s.rules.reduce((a, r) => a + r.runs, 0);
  return (
    <div className="page">
      <PageHeader
        title="Automatización de procesos"
        crumbs={['Plataforma', 'Automatización']}
        subtitle={`${s.rules.filter((r) => r.active).length} de ${s.rules.length} reglas activas · ${total} acciones ejecutadas`}
      />
      <ModuleGuide id="automatizacion" {...GUIDES.automatizacion!} />
      <div className="rules">
        {s.rules.map((r) => (
          <RuleCard key={r.id} r={r} />
        ))}
      </div>
      <section className="panel">
        <header className="panel-head">
          <h2>Registro de ejecución</h2>
        </header>
        {log.length === 0 ? (
          <p className="muted">Las reglas activas se ejecutan al cerrar cada día. Aquí verás lo que hicieron.</p>
        ) : (
          <ul className="activity">
            {log.map((l) => (
              <li key={l.id} className={`act kind-${l.kind}`}>
                <span className="act-day">Día {l.day}</span>
                <span className="act-text">{l.text}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RuleCard({ r }: { r: AutomationRule }) {
  const info = RULE_INFO[r.type];
  const [params, setParams] = useState(r.params);
  const dirty = JSON.stringify(params) !== JSON.stringify(r.params);
  return (
    <article className={`rule${r.active ? ' is-on' : ''}`}>
      <header className="rule-head">
        <Icon name="automatizacion" />
        <h3>{r.name}</h3>
        <label className="switch">
          <input type="checkbox" role="switch" checked={r.active} onChange={(e) => run((x) => saveRule(x, r.id, { active: e.target.checked }), e.target.checked ? `Regla "${r.name}" activada` : `Regla "${r.name}" desactivada`)} />
          <span className="switch-track" aria-hidden="true">
            <span className="switch-thumb" />
          </span>
          <span className="sr-only">Activar {r.name}</span>
        </label>
      </header>
      <p className="rule-logic">
        <span className="kw">Cuando</span> {info.when}, <span className="kw">entonces</span> {info.then}.
      </p>
      {info.params.length ? (
        <div className="rule-params">
          {info.params.map((p) => (
            <NumberInput key={p.key} label={p.label} value={params[p.key] ?? 0} step={p.step} suffix={p.suffix} help={p.key === 'aprobarHasta' ? `${p.help} Actual: ${cop(r.params[p.key] ?? 0)}.` : p.help} onChange={(v) => setParams({ ...params, [p.key]: v })} />
          ))}
          <button type="button" className="btn-secondary btn-sm" disabled={!dirty} onClick={() => run((x) => saveRule(x, r.id, { params }), 'Parámetros guardados')}>
            Guardar parámetros
          </button>
        </div>
      ) : null}
      <footer className="rule-foot muted small">
        Ejecuciones: <strong>{r.runs}</strong>
        {r.lastRunDay !== null ? ` · última el día ${r.lastRunDay}` : ''}
      </footer>
    </article>
  );
}
