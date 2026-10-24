import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { GLOSSARY, LEARNING_OUTCOMES, QUIZ, REFLECTION_PROMPTS } from '../content/pedagogy';
import { DIFFICULTIES, MODULE_INFO, MODULE_ORDER } from '../engine/config';
import { cop, dec, num, pct } from '../engine/format';
import { SCENARIOS } from '../engine/scenarios';
import { MONTHLY_COSTS } from '../erp/day';
import { decisionIndicators } from '../erp/insights';
import { GUIDES, MODULE_LABEL, RULE_INFO } from '../erp/meta';
import { BADGES, LEVELS, MISSIONS, levelOf, type QuestionObjective } from '../erp/missions';
import { JOURNAL_PROMPTS, STATUS_LABEL, learningReport, parseBackup } from '../erp/report';
import { CUSTOMERS, DEFAULT_RULES, formatDay } from '../erp/seed';
import { openTeacher, toast } from '../erp/store';
import {
  CONTENT_COUNTS,
  DURATION,
  GRADE_SCALE,
  MONTHS,
  SESSIONS,
  TEACHER_KEY,
  catalogOf,
  indicatorCatalog,
  missionNumber,
  missionTitle,
  scenarioEvents,
  teacherContentText,
} from '../erp/teacherContent';
import type { ErpState, ModuleKey } from '../erp/types';
import { EMBED, copyText } from '../export';
import { Chip, Facts, PageHeader, Section, SubNav } from '../ui/kit';

type Tab = 'resumen' | 'misiones' | 'empresas' | 'indicadores' | 'simulador' | 'estudiante';

const UNLOCK_KEY = 'erp-americana:docente';
const normalizeKey = (k: string) => k.trim().toUpperCase().replace(/\s+/g, '-');

function sessionUnlocked(): boolean {
  try {
    return window.sessionStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

function Table({ head, rows, caption }: { head: string[]; rows: ReactNode[][]; caption?: string }) {
  return (
    <div className="table-scroll">
      <table className="table teacher-table">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Vista del docente: todo el contenido del ERP y del simulador en una sola página, con respuestas, y la revisión del respaldo de un estudiante. */
export function TeacherView() {
  const [unlocked, setUnlocked] = useState(sessionUnlocked);
  const [tab, setTab] = useState<Tab>('resumen');
  return (
    <div className="onboarding teacher">
      <header className="onb-top">
        <div className="sidebar-brand">
          <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
            <rect width="64" height="64" rx="14" fill="var(--accent)" />
            <path d="M14 46V30h8v16zm14 0V20h8v26zm14 0V12h8v34z" fill="#fff" />
          </svg>
          <div>
            <strong>ERP Americana</strong>
            <small>Vista del docente</small>
          </div>
        </div>
        <button type="button" className="btn-ghost" onClick={() => openTeacher(false)}>
          Volver al ERP
        </button>
      </header>
      <main className="onb-main teacher-main" id="erp-main">
        {unlocked ? (
          <>
            <PageHeader
              title="Vista del docente"
              subtitle="Todo el contenido del ERP y del simulador en una sola página, con las respuestas. No cambia la práctica guardada en este navegador."
              actions={
                <>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={async () => {
                      const ok = await copyText(teacherContentText());
                      toast(ok ? 'exito' : 'error', ok ? 'Contenido copiado' : 'El navegador no permitió copiar', ok ? 'Pégalo en un documento de Word o de Google.' : undefined);
                    }}
                  >
                    Copiar todo el contenido
                  </button>
                  {!EMBED ? (
                    <button type="button" className="btn-secondary" onClick={() => window.print()}>
                      Imprimir
                    </button>
                  ) : null}
                </>
              }
            />
            <SubNav<Tab>
              value={tab}
              onChange={setTab}
              items={[
                { id: 'resumen', label: 'Resumen y ruta' },
                { id: 'misiones', label: 'Misiones y respuestas', count: MISSIONS.length },
                { id: 'empresas', label: 'Empresas y datos' },
                { id: 'indicadores', label: 'Indicadores y reglas' },
                { id: 'simulador', label: 'Simulador gerencial' },
                { id: 'estudiante', label: 'Revisar a un estudiante' },
              ]}
            />
            {tab === 'resumen' ? <Summary /> : null}
            {tab === 'misiones' ? <Missions /> : null}
            {tab === 'empresas' ? <Companies /> : null}
            {tab === 'indicadores' ? <Indicators /> : null}
            {tab === 'simulador' ? <Simulator /> : null}
            {tab === 'estudiante' ? <StudentReview /> : null}
          </>
        ) : (
          <Gate onUnlock={() => setUnlocked(true)} />
        )}
      </main>
    </div>
  );
}

function Gate({ onUnlock }: { onUnlock: () => void }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (normalizeKey(key) !== TEACHER_KEY) {
      setError(true);
      return;
    }
    try {
      window.sessionStorage.setItem(UNLOCK_KEY, '1');
    } catch {
      // Sin almacenamiento de sesión la clave se vuelve a pedir la próxima vez.
    }
    onUnlock();
  };
  return (
    <form className="panel teacher-gate" onSubmit={submit}>
      <h1>Vista del docente</h1>
      <p>Esta vista muestra las respuestas de las misiones y del simulador. Escribe la clave docente que aparece en la Guía docente.</p>
      <div className="ff">
        <label htmlFor="teacher-key">Clave docente</label>
        <input
          id="teacher-key"
          value={key}
          autoComplete="off"
          onChange={(e) => {
            setKey(e.target.value);
            setError(false);
          }}
          aria-invalid={error}
          aria-describedby={error ? 'teacher-key-error' : undefined}
        />
        {error ? (
          <small id="teacher-key-error" className="bad-text">
            La clave no es correcta.
          </small>
        ) : null}
      </div>
      <div className="row wrap">
        <button type="submit" className="btn-primary" disabled={key.trim().length < 3}>
          Entrar
        </button>
        <button type="button" className="btn-ghost" onClick={() => openTeacher(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Summary() {
  return (
    <>
      <Section title="Contenido del aplicativo">
        <Facts items={CONTENT_COUNTS()} />
      </Section>
      <Section title="Duración y ruta sugerida">
        <p>{DURATION}</p>
        <Table caption="Sesiones sugeridas" head={['Sesión', 'Misiones', 'Días simulados', 'Enfoque de decisión']} rows={SESSIONS.map((x) => [x.name, x.missions, x.days, x.focus])} />
        <p className="muted small">El avance del estudiante se guarda en su navegador. Para revisarlo sin abrir su equipo, pídale el respaldo (Configuración → Copiar respaldo) y péguelo en la pestaña Revisar a un estudiante.</p>
      </Section>
      <div className="grid-2">
        <Section title="Resultados de aprendizaje">
          <ol className="outcomes">
            {LEARNING_OUTCOMES.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ol>
        </Section>
        <Section title="Bitácora de aprendizaje">
          <p>Una sola bitácora para todo el ejercicio, en el Centro de misiones. El informe incluye nivel, XP, misiones con su regla de decisión, los indicadores al cierre y estas respuestas:</p>
          <ol>
            {JOURNAL_PROMPTS.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </Section>
      </div>
      <div className="grid-2">
        <Section title="Niveles">
          <Table caption="Niveles" head={['Nivel', 'Desde']} rows={LEVELS.map((l) => [l.name, `${num(l.xp)} XP`])} />
        </Section>
        <Section title="Insignias">
          <Table caption="Insignias" head={['Insignia', 'Cómo se gana']} rows={BADGES.map((b) => [b.name, b.description])} />
        </Section>
      </div>
      <Section title="Módulos del ERP y sus guías">
        <div className="teacher-cards">
          {(Object.keys(GUIDES) as ModuleKey[]).map((k) => {
            const g = GUIDES[k]!;
            return (
              <article key={k} className="teacher-card">
                <p className="eyebrow">{MODULE_LABEL[k]}</p>
                <h3>{g.title}</h3>
                <p>{g.text}</p>
                <ol className="small">
                  {g.steps.map((st) => (
                    <li key={st}>{st}</li>
                  ))}
                </ol>
              </article>
            );
          })}
        </div>
      </Section>
    </>
  );
}

function Missions() {
  const [module, setModule] = useState<'todos' | ModuleKey>('todos');
  const modules = [...new Set(MISSIONS.map((m) => m.module))];
  const list = MISSIONS.filter((m) => module === 'todos' || m.module === module);
  return (
    <>
      <div className="toolbar">
        <label className="stack">
          <span className="small muted">Filtrar por módulo</span>
          <select value={module} onChange={(e) => setModule(e.target.value as 'todos' | ModuleKey)}>
            <option value="todos">Todas las misiones ({MISSIONS.length})</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {MODULE_LABEL[m]} ({MISSIONS.filter((x) => x.module === m).length})
              </option>
            ))}
          </select>
        </label>
      </div>
      {list.map((m) => (
        <article key={m.id} className="panel teacher-mission">
          <p className="eyebrow">
            Misión {missionNumber(m)} · {MODULE_LABEL[m.module]} · {m.xp} XP
          </p>
          <h2>{m.title}</h2>
          <p className="muted small">
            Concepto: {m.concept} · Requisitos: {m.requires.length ? m.requires.map(missionTitle).join(', ') : 'ninguno'}
          </p>
          <p>{m.briefing}</p>
          <ol className="teacher-objectives">
            {m.objectives.map((o) =>
              o.kind === 'check' ? (
                <li key={o.id}>
                  <Chip status="confirmado" label="Acción" /> {o.text}
                </li>
              ) : (
                <li key={o.id}>
                  <Chip status="cotizacion" label="Pregunta" /> <strong>{o.question}</strong>
                  <div className="small muted">Pista para el estudiante: {o.hint}</div>
                  <div className="teacher-answer">Respuesta: {o.solution}</div>
                </li>
              ),
            )}
          </ol>
          <div className="takeaway">
            <strong>Regla de decisión</strong>
            <p>{m.takeaway}</p>
          </div>
        </article>
      ))}
    </>
  );
}

function Companies() {
  const [id, setId] = useState(SCENARIOS[0].id);
  const sc = SCENARIOS.find((x) => x.id === id) ?? SCENARIOS[0];
  const cat = catalogOf(sc.id);
  return (
    <>
      <SubNav<string> value={id} onChange={setId} items={SCENARIOS.map((x) => ({ id: x.id, label: x.company }))} />
      <Section title={`${sc.company} · ${sc.sector}`}>
        <p>{sc.description}</p>
        <p>
          <strong>Reto:</strong> {sc.challenge}
        </p>
        <h3>Temporadas</h3>
        <ul className="plain">
          {Object.entries(sc.seasonNotes).map(([m, t]) => (
            <li key={m}>
              <strong>{MONTHS[Number(m)]}:</strong> {t}
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Productos">
        <Table
          caption="Productos"
          head={['SKU', 'Producto', 'Costo', 'Precio', 'Margen', 'Stock inicial', 'Proveedor']}
          rows={cat.products.map((p) => [p.sku, p.name, cop(p.cost), cop(p.price), pct(1 - p.cost / p.price, 0), `${num(p.stock)} ${p.unit}`, cat.suppliers[p.supplier]?.name ?? ''])}
        />
      </Section>
      <Section title="Proveedores">
        <Table caption="Proveedores" head={['Proveedor', 'NIT', 'Ciudad', 'Entrega', 'Plazo de pago']} rows={cat.suppliers.map((x) => [x.name, x.nit, x.city, `${x.leadTimeDays} días`, `${x.paymentTermDays} días`])} />
      </Section>
      <Section title="Clientes iniciales (iguales en las tres empresas)">
        <Table
          caption="Clientes"
          head={['Cliente', 'Ciudad', 'Segmento', 'Cupo de crédito', 'Plazo']}
          rows={CUSTOMERS.map((c) => [c.name, c.city, c.segment, c.creditLimit ? cop(c.creditLimit) : 'Contado', c.paymentTerm ? `${c.paymentTerm} días` : 'Contado'])}
        />
        <p className="muted small">La empresa abre con dos facturas a crédito emitidas antes de la apertura (cartera heredada) para practicar el cobro en la misión 15.</p>
      </Section>
      <Section title="Gastos fijos mensuales">
        <Table caption="Gastos fijos" head={['Cuenta', 'Concepto', 'Valor']} rows={MONTHLY_COSTS.map((c) => [c.account, c.label, cop(c.value)])} />
      </Section>
    </>
  );
}

function Indicators() {
  const list = useMemo(indicatorCatalog, []);
  return (
    <>
      <Section title="Indicadores para decidir (Inicio)">
        <p className="muted">Cada indicador compara la operación con una meta y se pinta en verde (en meta), amarillo (atención) o rojo (crítico). La recomendación del día es el indicador más urgente.</p>
        <Table caption="Indicadores" head={['Indicador', 'Meta', 'Qué significa', 'Qué hacer']} rows={list.map((i) => [i.label, i.target, i.meaning, i.action])} />
      </Section>
      <Section title="Reglas de automatización">
        <Table caption="Reglas" head={['Regla', 'Cuando', 'Entonces']} rows={DEFAULT_RULES.map((r) => [r.name, RULE_INFO[r.type].when, RULE_INFO[r.type].then])} />
      </Section>
    </>
  );
}

function Simulator() {
  const events = scenarioEvents(SCENARIOS[0]);
  return (
    <>
      <Section title="Cómo se califica">
        <p>La misión 20 exige completar una partida con nota de 3,5 o más. La nota es el promedio mensual del cuadro de mando (finanzas 40, clientes 30, procesos 30) llevado a escala de 0 a 5.</p>
        <Table caption="Escala de notas" head={['Nota desde', 'Resultado']} rows={GRADE_SCALE.map((g) => [g.from, g.label])} />
      </Section>
      <div className="grid-2">
        <Section title="Niveles de dificultad">
          <Table caption="Dificultad" head={['Nivel', 'Descripción', 'Evento por mes']} rows={Object.values(DIFFICULTIES).map((d) => [d.label, d.description, pct(d.eventProbability, 0)])} />
        </Section>
        <Section title="Áreas de decisión">
          <ul className="plain">
            {MODULE_ORDER.map((m) => (
              <li key={m}>
                <strong>{MODULE_INFO[m].label}:</strong> {MODULE_INFO[m].description}
              </li>
            ))}
          </ul>
        </Section>
      </div>
      <Section title="Eventos del mercado">
        <Table
          caption="Eventos"
          head={['Evento', 'Qué pasa', 'Lección', 'Empresas']}
          rows={events.map((e) => {
            const excluded = SCENARIOS.filter((sc) => !scenarioEvents(sc).find((x) => x.id === e.id)?.applies).map((sc) => sc.company);
            return [<strong key="t">{e.title}</strong>, e.description, e.lesson, excluded.length ? `Todas menos ${excluded.join(', ')}` : 'Todas'];
          })}
        />
      </Section>
      <Section title="Preguntas de conceptos con respuesta">
        <ol className="teacher-quiz">
          {QUIZ.map((q) => (
            <li key={q.id}>
              <p>
                {q.context} <strong>{q.question}</strong>
              </p>
              <ol type="a">
                {q.options.map((o, j) => (
                  <li key={o} className={j === q.answer ? 'good-text' : undefined}>
                    {o}
                    {j === q.answer ? ' (correcta)' : ''}
                  </li>
                ))}
              </ol>
              <p className="small muted">{q.explanation}</p>
            </li>
          ))}
        </ol>
      </Section>
      <Section title="Reflexión del informe final del simulador">
        <ol>
          {REFLECTION_PROMPTS.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
      </Section>
      <Section title="Glosario">
        <dl className="teacher-glossary">
          {GLOSSARY.map((g) => (
            <div key={g.term}>
              <dt>{g.term}</dt>
              <dd>
                {g.definition}
                {g.formula ? <span className="small muted"> Fórmula: {g.formula}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
    </>
  );
}

function StudentReview() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<ErpState | string | null>(null);
  return (
    <>
      <Section title="Revisar el respaldo de un estudiante">
        <p className="muted">
          El estudiante copia su respaldo en Configuración → Copiar respaldo y lo entrega en el aula virtual. Pégalo aquí para ver su avance, sus respuestas correctas con sus propios datos y su bitácora. No reemplaza la práctica guardada en este navegador.
        </p>
        <div className="ff">
          <label htmlFor="backup-text">Respaldo del estudiante</label>
          <textarea id="backup-text" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder='{"version":1, ...}' />
        </div>
        <div className="row wrap">
          <button type="button" className="btn-primary" disabled={text.trim().length < 10} onClick={() => setResult(parseBackup(text))}>
            Revisar respaldo
          </button>
          {result ? (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setText('');
                setResult(null);
              }}
            >
              Limpiar
            </button>
          ) : null}
        </div>
        {typeof result === 'string' ? (
          <p className="notice notice-bad" role="alert">
            {result}
          </p>
        ) : null}
      </Section>
      {result && typeof result !== 'string' ? <StudentReport s={result} /> : null}
    </>
  );
}

function StudentReport({ s }: { s: ErpState }) {
  const lvl = levelOf(s.gamification.xp);
  const done = Object.keys(s.gamification.completed).length;
  const questions = MISSIONS.flatMap((m) => m.objectives.filter((o): o is QuestionObjective => o.kind === 'question').map((o) => ({ m, o })));
  const answerOf = (o: QuestionObjective) => {
    try {
      const v = o.answer(s);
      return o.unit === 'pesos' ? cop(v) : o.unit === 'veces' ? dec(v) : `${num(v)} ${o.unit}`;
    } catch {
      return '—';
    }
  };
  return (
    <>
      <Section
        title={`${s.profile.name}${s.profile.group ? ` · ${s.profile.group}` : ''}`}
        actions={
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={async () => {
              const ok = await copyText(learningReport(s));
              toast(ok ? 'exito' : 'error', ok ? 'Informe del estudiante copiado' : 'El navegador no permitió copiar');
            }}
          >
            Copiar informe
          </button>
        }
      >
        <Facts
          items={[
            ['Empresa', s.settings.companyName],
            ['Ciudad registrada', s.settings.city || 'Sin registrar'],
            ['Día de operación', `${s.day} (${formatDay(s, s.day)})`],
            ['Nivel', `${lvl.name} · ${num(s.gamification.xp)} XP`],
            ['Misiones', `${done} de ${MISSIONS.length}`],
            ['Insignias', `${s.gamification.badges.length} de ${BADGES.length}`],
          ]}
        />
      </Section>
      <Section title="Avance por misión">
        <Table
          caption="Misiones del estudiante"
          head={['Misión', 'Estado', 'Día', 'Intentos en preguntas']}
          rows={MISSIONS.map((m) => {
            const day = s.gamification.completed[m.id];
            const tries = m.objectives.filter((o) => o.kind === 'question').map((o) => s.gamification.attempts[`${m.id}:${o.id}`] ?? 0);
            return [
              `${missionNumber(m)}. ${m.title}`,
              day !== undefined ? <Chip key="c" status="pagado" label="Completada" /> : <Chip key="c" status="borrador" label="Pendiente" />,
              day !== undefined ? String(day) : '—',
              tries.length ? tries.join(', ') : '—',
            ];
          })}
        />
      </Section>
      <Section title="Respuestas correctas con los datos actuales del estudiante">
        <p className="muted small">Los saldos cambian cada día. Si el estudiante respondió en un día anterior, su respuesta pudo ser correcta con los saldos de ese día.</p>
        <Table
          caption="Respuestas"
          head={['Misión', 'Pregunta', 'Valor actual', 'Respondida']}
          rows={questions.map(({ m, o }) => [String(missionNumber(m)), o.question, answerOf(o), s.gamification.answered[`${m.id}:${o.id}`] ? 'Sí' : 'No'])}
        />
      </Section>
      <Section title="Indicadores al día de la revisión">
        <Table caption="Indicadores del estudiante" head={['Indicador', 'Valor', 'Meta', 'Estado']} rows={decisionIndicators(s).map((i) => [i.label, i.value, i.target, STATUS_LABEL[i.status]])} />
      </Section>
      <Section title="Bitácora de aprendizaje">
        <ol>
          {JOURNAL_PROMPTS.map((p, i) => (
            <li key={p}>
              <p className="small muted">{p}</p>
              <p>{(s.reflections?.[i] ?? '').trim() || 'Sin respuesta'}</p>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}
