import { useEffect, useRef, useState } from 'react';
import { DIFFICULTIES } from '../engine/config';
import { cop, millions, num } from '../engine/format';
import { MONTHS, getScenario } from '../engine/scenarios';
import { finalGrade } from '../engine/simulation';
import type { Decisions, SimConfig, SimState, StudentProfile } from '../engine/types';
import { Dashboard } from './Dashboard';
import { DecisionPanel } from './DecisionPanel';
import { Glossary } from './Glossary';
import { ResultsPanel } from './ResultsPanel';
import { ConfirmAction, Stat } from './ui';

export type Tab = 'decisiones' | 'resultados' | 'tablero' | 'glosario';

const TABS: Array<[Tab, string]> = [
  ['decisiones', 'Decisiones'],
  ['resultados', 'Resultados del mes'],
  ['tablero', 'Tablero e historial'],
  ['glosario', 'Glosario'],
];

interface Props {
  profile: StudentProfile;
  config: SimConfig;
  state: SimState;
  draft: Decisions;
  tab: Tab;
  onTab: (t: Tab) => void;
  onDraft: (d: Decisions) => void;
  onRun: () => void;
  onFinish: () => void;
  onExit: () => void;
}

export function GameScreen({ profile, config, state, draft, tab, onTab, onDraft, onRun, onFinish, onExit }: Props) {
  const s = getScenario(config.scenarioId);
  const last = state.history[state.history.length - 1] ?? null;
  const prev = state.history[state.history.length - 2];
  const grade = finalGrade(state.history);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [announce, setAnnounce] = useState('');

  useEffect(() => {
    if (last) setAnnounce(`Mes ${last.period} ejecutado. Utilidad neta ${cop(last.netIncome)}. Puntaje ${Math.round(last.score.total)} de 100.`);
  }, [last]);

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const next = (i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
    onTab(TABS[next][0]);
    tabRefs.current[TABS[next][0]]?.focus();
  };

  return (
    <main className="container game" id="contenido">
      <div className="sr-only" aria-live="polite">
        {announce}
      </div>
      <section className="status-strip" aria-label="Indicadores actuales">
        <div className="status-title">
          <p className="eyebrow">
            {profile.name}
            {profile.group ? ` · ${profile.group}` : ''} · {DIFFICULTIES[config.difficulty].label}
          </p>
          <h1>{s.company}</h1>
          <p className="muted">
            {state.finished
              ? `Simulación terminada${state.bankrupt ? ' por liquidación' : ''}`
              : `Mes ${state.period + 1} de ${config.periods} · ${MONTHS[state.month]}`}
          </p>
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={config.periods} aria-valuenow={state.period} aria-label="Avance de la simulación">
            <div style={{ width: `${(state.period / config.periods) * 100}%` }} />
          </div>
        </div>
        <div className="stats">
          <Stat label="Caja" value={millions(state.cash)} sub={state.overdraft > 0 ? `Sobregiro ${millions(state.overdraft)}` : state.debt > 0 ? `Deuda ${millions(state.debt)}` : 'Sin deuda'} tone={state.overdraft > 0 ? 'bad' : 'neutral'} />
          <Stat label="Inventario" value={num(state.inventory)} sub={s.unitName} />
          <Stat label="Clientes" value={num(state.customers)} sub={`Satisfacción ${num(state.satisfaction)}`} tone={state.satisfaction < 55 ? 'warn' : 'neutral'} />
          <Stat
            label="Utilidad último mes"
            value={last ? millions(last.netIncome) : '—'}
            tone={last ? (last.netIncome < 0 ? 'bad' : 'good') : 'neutral'}
          />
          <Stat label="Nota acumulada" value={state.history.length ? grade.toFixed(1).replace('.', ',') : '—'} sub="escala 0 a 5" tone={state.history.length ? (grade >= 3 ? 'good' : 'bad') : 'neutral'} />
        </div>
      </section>

      <div className="tabs" role="tablist" aria-label="Secciones del simulador">
        {TABS.map(([id, label], i) => (
          <button
            key={id}
            ref={(el) => {
              tabRefs.current[id] = el;
            }}
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            className={tab === id ? 'is-active' : ''}
            onClick={() => onTab(id)}
            onKeyDown={(e) => onTabKey(e, i)}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={-1}>
        {tab === 'decisiones' ? (
          state.finished ? (
            <section className="card finished">
              <h2>{state.bankrupt ? 'La empresa entró en liquidación' : 'Completaste la simulación'}</h2>
              <p>Revisa tu informe final: nota, fortalezas, aspectos a mejorar, reflexión y evaluación de conceptos.</p>
              <button type="button" className="btn-primary btn-lg" onClick={onFinish}>
                Ver informe final
              </button>
            </section>
          ) : (
            <DecisionPanel state={state} config={config} draft={draft} onChange={onDraft} onRun={onRun} />
          )
        ) : null}
        {tab === 'resultados' ? (
          <>
            <ResultsPanel result={last} prev={prev} config={config} />
            <div className="row end">
              {state.finished ? (
                <button type="button" className="btn-primary btn-lg" onClick={onFinish}>
                  Ver informe final
                </button>
              ) : (
                <button type="button" className="btn-primary btn-lg" onClick={() => onTab('decisiones')}>
                  Decidir {MONTHS[state.month]}
                </button>
              )}
            </div>
          </>
        ) : null}
        {tab === 'tablero' ? <Dashboard state={state} config={config} /> : null}
        {tab === 'glosario' ? <Glossary /> : null}
      </div>

      <div className="row end footer-actions">
        <ConfirmAction
          className="btn-ghost"
          label="Salir al inicio"
          question="¿Salir a la pantalla de inicio? Tu partida queda guardada en este navegador."
          confirmLabel="Sí, salir"
          onConfirm={onExit}
        />
      </div>
    </main>
  );
}
