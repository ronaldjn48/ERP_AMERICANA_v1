import { useMemo } from 'react';
import { QUIZ, REFLECTION_PROMPTS } from '../content/pedagogy';
import { DIFFICULTIES, encodeConfig } from '../engine/config';
import { analyzePeriod } from '../engine/feedback';
import { cop, millions, num, pct, pesosHabla } from '../engine/format';
import { MONTHS, getScenario } from '../engine/scenarios';
import { finalGrade } from '../engine/simulation';
import type { Feedback, SimConfig, SimState, StudentProfile } from '../engine/types';
import { exportCsv, exportJson } from '../export';
import { LineChart } from './Charts';
import { historyLabels } from './Dashboard';
import { Meter, SpeakButton, Stat } from './ui';

interface Props {
  profile: StudentProfile;
  config: SimConfig;
  state: SimState;
  reflections: string[];
  quiz: Record<string, number>;
  onReflections: (r: string[]) => void;
  onQuiz: (q: Record<string, number>) => void;
  onBack: () => void;
  onRestart: () => void;
}

function verdict(grade: number): { label: string; text: string } {
  if (grade >= 4.5) return { label: 'Desempeño excelente', text: 'Equilibraste rentabilidad, liquidez, clientes y procesos durante toda la simulación.' };
  if (grade >= 4.0) return { label: 'Desempeño sobresaliente', text: 'Tomaste decisiones sólidas. Revisa los aspectos a mejorar para llegar a la excelencia.' };
  if (grade >= 3.0) return { label: 'Desempeño aprobatorio', text: 'Lograste resultados aceptables con oportunidades claras de mejora en la planeación.' };
  return { label: 'Desempeño por mejorar', text: 'Los resultados muestran decisiones que afectaron la empresa. Analiza las causas y repite la simulación.' };
}

export function FinalReport({ profile, config, state, reflections, quiz, onReflections, onQuiz, onBack, onRestart }: Props) {
  const s = getScenario(config.scenarioId);
  const h = state.history;
  const grade = finalGrade(h);
  const v = verdict(grade);
  const labels = historyLabels(h);
  const n = Math.max(1, h.length);
  const avg = {
    financial: h.reduce((a, r) => a + r.score.financial, 0) / n,
    customer: h.reduce((a, r) => a + r.score.customer, 0) / n,
    process: h.reduce((a, r) => a + r.score.process, 0) / n,
  };
  const totals = {
    revenue: h.reduce((a, r) => a + r.revenue, 0),
    netIncome: h.reduce((a, r) => a + r.netIncome, 0),
    units: h.reduce((a, r) => a + r.unitsSold, 0),
    lost: h.reduce((a, r) => a + r.lostUnits, 0),
    demand: h.reduce((a, r) => a + r.demandUnits, 0),
  };
  const last = h[h.length - 1];
  const best = h.reduce((b, r) => (r.score.total > b.score.total ? r : b), h[0]);
  const worst = h.reduce((b, r) => (r.score.total < b.score.total ? r : b), h[0]);

  const { strengths, improvements } = useMemo(() => {
    const counts = new Map<string, { f: Feedback; n: number }>();
    h.forEach((r, i) => {
      analyzePeriod(r, s, config, h[i - 1]).forEach((f) => {
        if (f.id === 'evento') return;
        const key = `${f.level === 'logro' ? 'L' : f.level === 'info' ? 'I' : 'P'}:${f.id}`;
        const prev = counts.get(key);
        counts.set(key, { f: prev?.f ?? f, n: (prev?.n ?? 0) + 1 });
      });
    });
    const list = [...counts.entries()];
    return {
      strengths: list.filter(([k]) => k.startsWith('L:')).sort((a, b) => b[1].n - a[1].n).slice(0, 4).map(([, x]) => x),
      improvements: list.filter(([k]) => k.startsWith('P:')).sort((a, b) => b[1].n - a[1].n).slice(0, 4).map(([, x]) => x),
    };
  }, [h, s, config]);

  const answered = QUIZ.filter((q) => quiz[q.id] !== undefined);
  const correct = answered.filter((q) => quiz[q.id] === q.answer).length;

  const speech =
    `Informe final de ${profile.name}. Dirigiste ${s.company} durante ${h.length} meses. ` +
    `Tu nota es ${grade.toLocaleString('es-CO', { maximumFractionDigits: 1 })} sobre 5. ${v.label}. ${v.text} ` +
    `Vendiste en total ${pesosHabla(totals.revenue)} y la utilidad neta acumulada fue de ${pesosHabla(totals.netIncome)}. ` +
    (improvements.length > 0 ? `El aspecto que más se repitió para mejorar fue: ${improvements[0].f.title}. ` : '') +
    'Completa la reflexión y la evaluación de conceptos para cerrar la actividad.';

  return (
    <main className="container final" id="contenido">
      <section className="card report-head">
        <div className="row between wrap">
          <div>
            <p className="eyebrow">Informe final · {new Date().toLocaleDateString('es-CO', { dateStyle: 'long' })}</p>
            <h1>{s.company}</h1>
            <p>
              <strong>{profile.name}</strong>
              {profile.group ? ` · ${profile.group}` : ''} · {DIFFICULTIES[config.difficulty].label} · {h.length} meses desde {MONTHS[config.startMonth]} ·
              código {encodeConfig(config)}
            </p>
          </div>
          <SpeakButton text={speech} id="informe-final" label="Escuchar informe" />
        </div>
        <div className="grade-row">
          <div className={`grade ${grade >= 3 ? 'pass' : 'fail'}`}>
            <span>{grade.toFixed(1).replace('.', ',')}</span>
            <small>sobre 5,0</small>
          </div>
          <div>
            <h2>{v.label}</h2>
            <p>{v.text}</p>
            {state.bankrupt ? <p className="notice notice-bad">La empresa entró en liquidación en el mes {last?.period}: el patrimonio quedó negativo.</p> : null}
          </div>
        </div>
        <div className="score-meters">
          <Meter label="Finanzas (promedio)" value={Math.round(avg.financial * 10) / 10} max={40} />
          <Meter label="Clientes (promedio)" value={Math.round(avg.customer * 10) / 10} max={30} />
          <Meter label="Procesos (promedio)" value={Math.round(avg.process * 10) / 10} max={30} />
        </div>
      </section>

      <section className="stats stats-wide" aria-label="Resultados acumulados">
        <Stat label="Ventas acumuladas" value={millions(totals.revenue)} />
        <Stat label="Utilidad neta acumulada" value={millions(totals.netIncome)} tone={totals.netIncome >= 0 ? 'good' : 'bad'} />
        <Stat label="Nivel de servicio total" value={pct(totals.demand ? totals.units / totals.demand : 1)} sub={`${num(totals.lost)} ${s.unitName} perdidas`} />
        <Stat label="Patrimonio final" value={last ? millions(last.equity) : '—'} />
        <Stat label="Clientes activos" value={last ? num(last.customers) : '—'} sub={last ? `Satisfacción ${num(last.satisfaction)}` : ''} />
        <Stat label="Mejor mes" value={best ? `${MONTHS[best.month]}` : '—'} sub={best ? `${Math.round(best.score.total)} puntos` : ''} />
        <Stat label="Mes más difícil" value={worst ? `${MONTHS[worst.month]}` : '—'} sub={worst ? `${Math.round(worst.score.total)} puntos` : ''} />
      </section>

      <div className="grid-2">
        <section className="card">
          <h2>Fortalezas</h2>
          {strengths.length === 0 ? (
            <p className="muted">No se registraron logros destacados. Revisa el tablero para identificar qué decisión mejorar primero.</p>
          ) : (
            <ul className="plain">
              {strengths.map(({ f, n: count }) => (
                <li key={f.id}>
                  <strong>{f.title.replace(/:.*$/, '')}</strong> ({count} {count === 1 ? 'mes' : 'meses'}). {f.concept ? `Concepto: ${f.concept}.` : ''}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card">
          <h2>Aspectos a mejorar</h2>
          {improvements.length === 0 ? (
            <p className="muted">No hubo alertas recurrentes. Mantén la disciplina de pronosticar y revisar la caja antes de decidir.</p>
          ) : (
            <ul className="plain">
              {improvements.map(({ f, n: count }) => (
                <li key={f.id}>
                  <strong>{f.title.replace(/:.*$/, '')}</strong> ({count} {count === 1 ? 'mes' : 'meses'}). {f.concept ? `Concepto a repasar: ${f.concept}.` : ''}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <LineChart
            title="Ingresos y utilidad neta (millones)"
            labels={labels}
            format={millions}
            series={[
              { name: 'Ingresos', values: h.map((r) => r.revenue), color: 'var(--series-1)' },
              { name: 'Utilidad neta', values: h.map((r) => r.netIncome), color: 'var(--series-2)' },
            ]}
          />
        </section>
        <section className="card">
          <LineChart
            title="Puntaje mensual"
            labels={labels}
            format={(x) => `${Math.round(x)}`}
            reference={{ value: 60, label: 'Aprobación' }}
            series={[{ name: 'Puntaje', values: h.map((r) => r.score.total), color: 'var(--series-3)' }]}
          />
        </section>
      </div>

      <section className="card" aria-labelledby="reflexion-title">
        <h2 id="reflexion-title">Reflexión gerencial</h2>
        <p className="muted">Responde con datos de tu simulación. Tus respuestas se incluyen en el informe impreso y en el archivo exportado.</p>
        {REFLECTION_PROMPTS.map((p, i) => (
          <label key={p} className="stack">
            <span>
              {i + 1}. {p}
            </span>
            <textarea
              rows={4}
              maxLength={2000}
              value={reflections[i] ?? ''}
              onChange={(e) => {
                const next = [...reflections];
                next[i] = e.target.value;
                onReflections(next);
              }}
            />
          </label>
        ))}
      </section>

      <section className="card quiz" aria-labelledby="quiz-title">
        <div className="row between wrap">
          <h2 id="quiz-title">Evaluación de conceptos (tipo Saber Pro)</h2>
          <p className="quiz-score" role="status">
            {answered.length === 0 ? `${QUIZ.length} preguntas` : `${correct} de ${answered.length} correctas · ${QUIZ.length - answered.length} sin responder`}
          </p>
        </div>
        <ol className="quiz-list">
          {QUIZ.map((q) => {
            const chosen = quiz[q.id];
            const done = chosen !== undefined;
            return (
              <li key={q.id} className="quiz-item">
                <p className="quiz-context">{q.context}</p>
                <fieldset>
                  <legend>{q.question}</legend>
                  {q.options.map((o, i) => (
                    <label
                      key={o}
                      className={`option${done && i === q.answer ? ' is-correct' : ''}${done && i === chosen && i !== q.answer ? ' is-wrong' : ''}`}
                    >
                      <input type="radio" name={q.id} checked={chosen === i} disabled={done} onChange={() => onQuiz({ ...quiz, [q.id]: i })} />
                      <span>
                        {String.fromCharCode(65 + i)}. {o}
                      </span>
                    </label>
                  ))}
                </fieldset>
                {done ? (
                  <div className={`notice ${chosen === q.answer ? 'notice-ok' : 'notice-bad'}`} role="status">
                    <strong>{chosen === q.answer ? 'Correcto.' : `Incorrecto. La respuesta es ${String.fromCharCode(65 + q.answer)}.`}</strong> {q.explanation}
                    <SpeakButton text={q.explanation} id={`quiz-${q.id}`} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="print-only card">
        <h2>Historial mensual</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Mes</th>
              <th>Ingresos</th>
              <th>Utilidad</th>
              <th>Caja</th>
              <th>Servicio</th>
              <th>Puntaje</th>
            </tr>
          </thead>
          <tbody>
            {h.map((r) => (
              <tr key={r.period}>
                <td>
                  {r.period}. {MONTHS[r.month]}
                </td>
                <td>{cop(r.revenue)}</td>
                <td>{cop(r.netIncome)}</td>
                <td>{cop(r.cashEnd)}</td>
                <td>{pct(r.fillRate, 0)}</td>
                <td>{Math.round(r.score.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="row end wrap no-print">
        <button type="button" className="btn-secondary" onClick={onBack}>
          Volver al tablero
        </button>
        <button type="button" className="btn-secondary" onClick={() => window.print()}>
          Imprimir o guardar PDF
        </button>
        <button type="button" className="btn-secondary" onClick={() => exportCsv(h, profile, config)}>
          Descargar datos (CSV)
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            exportJson(
              {
                estudiante: profile,
                codigo: encodeConfig(config),
                configuracion: config,
                nota: grade,
                reflexion: REFLECTION_PROMPTS.map((p, i) => ({ pregunta: p, respuesta: reflections[i] ?? '' })),
                evaluacion: { correctas: correct, respondidas: answered.length, total: QUIZ.length },
                historial: h,
              },
              profile,
            )
          }
        >
          Descargar evidencia (JSON)
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            if (window.confirm('¿Iniciar una nueva simulación? La partida actual se borrará de este navegador.')) onRestart();
          }}
        >
          Nueva simulación
        </button>
      </div>
    </main>
  );
}
