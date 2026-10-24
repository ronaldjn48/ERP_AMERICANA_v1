import { useEffect, useState } from 'react';
import { sfx } from '../audio';
import { SpeakButton } from '../components/ui';
import { MODULE_LABEL } from '../erp/meta';
import { BADGES, LEVELS, MISSIONS, TOTAL_XP, answerQuestion, levelOf, missionProgress, missionStatus, objectiveDone, setActiveMission, type Mission, type QuestionObjective } from '../erp/missions';
import { copyText } from '../export';
import { decisionIndicators } from '../erp/insights';
import { missionContext, navigate, replaceWorkspace, run, toast, useRoute } from '../erp/store';
import type { ErpState } from '../erp/types';
import { Icon } from '../ui/icons';
import { Chip, PageHeader } from '../ui/kit';

export function MissionsModule({ s }: { s: ErpState }) {
  const route = useRoute();
  const [selected, setSelected] = useState<string>(route.id ?? s.gamification.activeMission ?? MISSIONS[0].id);
  useEffect(() => {
    if (route.id) setSelected(route.id);
  }, [route.id]);
  const lvl = levelOf(s.gamification.xp);
  const ctx = missionContext();
  const done = Object.keys(s.gamification.completed).length;
  const m = MISSIONS.find((x) => x.id === selected) ?? MISSIONS[0];

  return (
    <div className="page">
      <PageHeader title="Centro de misiones" crumbs={['General', 'Misiones']} subtitle="Prácticas guiadas en cada módulo del ERP. Gana experiencia, sube de nivel y desbloquea insignias." />
      <section className="panel level-panel">
        <div className="level-main">
          <div className="level-ring" aria-hidden="true">
            <span>{lvl.index + 1}</span>
          </div>
          <div>
            <p className="eyebrow">Nivel {lvl.index + 1} de {LEVELS.length}</p>
            <h2>{lvl.name}</h2>
            <div className="xpbar xpbar-lg" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(lvl.progress * 100)} aria-label="Progreso al siguiente nivel">
              <div style={{ width: `${lvl.progress * 100}%` }} />
            </div>
            <p className="muted small">
              {s.gamification.xp} XP{lvl.next ? ` · faltan ${lvl.next.xp - s.gamification.xp} XP para ${lvl.next.name}` : ' · nivel máximo'} · {done} de {MISSIONS.length} misiones · {TOTAL_XP} XP posibles
            </p>
          </div>
        </div>
        <div className="badges" aria-label="Insignias">
          {BADGES.map((b) => {
            const earned = s.gamification.badges.includes(b.id);
            return (
              <div key={b.id} className={`badge-medal${earned ? ' is-earned' : ''}`} title={b.description}>
                <span className="medal" aria-hidden="true">
                  <Icon name={earned ? 'trophy' : 'lock'} size={18} />
                </span>
                <span className="medal-name">{b.name}</span>
                <span className="sr-only">{earned ? 'obtenida' : 'bloqueada'}: {b.description}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="missions-layout">
        <nav className="mission-list" aria-label="Misiones">
          {MISSIONS.map((x) => {
            const st = missionStatus(s, x);
            const p = missionProgress(s, x, ctx);
            return (
              <button key={x.id} type="button" className={`mission-item st-${st}${x.id === m.id ? ' is-selected' : ''}`} onClick={() => setSelected(x.id)} aria-current={x.id === m.id ? 'true' : undefined}>
                <span className="mi-icon" aria-hidden="true">
                  <Icon name={st === 'completada' ? 'check' : st === 'bloqueada' ? 'lock' : x.module} size={16} />
                </span>
                <span className="mi-text">
                  <strong>{x.title}</strong>
                  <small>
                    {MODULE_LABEL[x.module]} · {x.xp} XP{st === 'disponible' ? ` · ${p.done}/${p.total}` : ''}
                  </small>
                </span>
                {s.gamification.activeMission === x.id ? <span className="chip chip-accent">Activa</span> : null}
              </button>
            );
          })}
        </nav>
        <MissionDetail s={s} m={m} />
      </div>
      <Journal s={s} />
    </div>
  );
}

const JOURNAL_PROMPTS = [
  '¿Qué decisión tomaste en el ERP que más mejoró un indicador? Nombra el indicador y su valor antes y después.',
  '¿Qué error o faltante tuviste y qué hiciste para corregirlo (compra, cobro, ajuste o automatización)?',
  '¿Cómo se conectan las áreas de la empresa? Explica cómo una venta afectó el inventario, la cartera y la contabilidad.',
  '¿Qué regla de decisión aplicarías en una empresa real de tu región y por qué?',
];

/** Bitácora de aprendizaje: reflexión escrita y un informe para entregar en el aula virtual. */
function Journal({ s }: { s: ErpState }) {
  const [answers, setAnswers] = useState<string[]>(s.reflections ?? []);
  const saved = JSON.stringify(answers) === JSON.stringify(s.reflections ?? []);
  const lvl = levelOf(s.gamification.xp);
  const report = () => {
    const indicators = decisionIndicators(s);
    return [
      `Bitácora de aprendizaje · ERP Americana`,
      `Estudiante: ${s.profile.name}${s.profile.group ? ` · ${s.profile.group}` : ''}`,
      `Empresa: ${s.settings.companyName} · día ${s.day} de operación`,
      `Nivel: ${lvl.name} · ${s.gamification.xp} XP · ${Object.keys(s.gamification.completed).length} de ${MISSIONS.length} misiones · ${s.gamification.badges.length} insignias`,
      '',
      'Misiones completadas y reglas de decisión:',
      ...MISSIONS.filter((x) => s.gamification.completed[x.id] !== undefined).map((x) => `- ${x.title} (día ${s.gamification.completed[x.id]}): ${x.takeaway}`),
      '',
      'Indicadores al cierre:',
      ...indicators.map((i) => `- ${i.label}: ${i.value} (${i.target}) · ${i.status === 'bien' ? 'en meta' : i.status === 'atencion' ? 'atención' : i.status === 'critico' ? 'crítico' : 'sin datos'}`),
      '',
      'Reflexión:',
      ...JOURNAL_PROMPTS.map((p, i) => `${i + 1}. ${p}\n${(answers[i] ?? '').trim() || '(sin respuesta)'}`),
    ].join('\n');
  };
  return (
    <section className="panel journal-panel" aria-labelledby="journal-title">
      <header className="panel-head">
        <h2 id="journal-title">Bitácora de aprendizaje</h2>
        <SpeakButton text={`Bitácora de aprendizaje. Responde con datos de tu práctica. ${JOURNAL_PROMPTS.join(' ')}`} id="bitacora" />
      </header>
      <p className="muted">Escribe con datos de tu empresa: valores de los indicadores, números de pedidos, facturas u órdenes. Tus respuestas se guardan en este navegador y se incluyen en el informe.</p>
      {JOURNAL_PROMPTS.map((p, i) => (
        <div key={p} className="ff">
          <label htmlFor={`bit-${i}`}>
            {i + 1}. {p}
          </label>
          <textarea
            id={`bit-${i}`}
            rows={3}
            maxLength={1500}
            value={answers[i] ?? ''}
            onChange={(e) => {
              const next = [...answers];
              next[i] = e.target.value;
              setAnswers(next);
            }}
          />
        </div>
      ))}
      <div className="row wrap">
        <button type="button" className="btn-secondary" disabled={saved} onClick={() => run((x) => ({ ...x, reflections: answers }), 'Bitácora guardada')}>
          Guardar bitácora
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={async () => {
            run((x) => ({ ...x, reflections: answers }));
            const ok = await copyText(report());
            toast(ok ? 'exito' : 'error', ok ? 'Informe copiado' : 'El navegador no permitió copiar', ok ? 'Pégalo en el aula virtual o en un documento para entregarlo.' : 'Selecciona el texto de tus respuestas y cópialo manualmente.');
          }}
        >
          Copiar informe para entregar
        </button>
      </div>
    </section>
  );
}

function MissionDetail({ s, m }: { s: ErpState; m: Mission }) {
  const ctx = missionContext();
  const st = missionStatus(s, m);
  const prog = missionProgress(s, m, ctx);
  return (
    <article className="panel mission-detail" aria-labelledby="md-title">
      <p className="eyebrow">
        {MODULE_LABEL[m.module]} · {m.xp} XP
      </p>
      <h2 id="md-title">{m.title}</h2>
      <p className="concept-line">
        <Icon name="aprendizaje" size={16} /> {m.concept}
      </p>
      {st === 'bloqueada' ? (
        <p className="notice notice-warn">
          Bloqueada. Completa primero: {m.requires.map((r) => MISSIONS.find((x) => x.id === r)?.title).join(' y ')}.
        </p>
      ) : null}
      {st === 'completada' ? (
        <>
          <p className="notice notice-ok">Completada el día {s.gamification.completed[m.id]}. Ganaste {m.xp} XP.</p>
          <div className="takeaway">
            <strong>Regla de decisión</strong>
            <p>{m.takeaway}</p>
          </div>
        </>
      ) : null}
      <p>{m.briefing}</p>
      <div className="row wrap">
        <SpeakButton text={`${m.title}. ${m.briefing} Objetivos: ${m.objectives.map((o) => o.text).join('. ')}.`} id={`mision-${m.id}`} label="Escuchar misión" />
        {st === 'disponible' && s.gamification.activeMission !== m.id ? (
          <button type="button" className="btn-secondary btn-sm" onClick={() => run((x) => setActiveMission(x, m.id), 'Misión fijada como activa')}>
            Fijar como misión activa
          </button>
        ) : null}
      </div>
      <h3 className="mt">
        Objetivos ({prog.done}/{prog.total})
      </h3>
      <div className="xpbar">
        <div style={{ width: `${prog.ratio * 100}%` }} />
      </div>
      <ol className="objectives">
        {m.objectives.map((o) => {
          const ok = objectiveDone(s, m, o, ctx);
          return (
            <li key={o.id} className={ok ? 'is-done' : ''}>
              <span className="obj-mark" aria-hidden="true">{ok ? <Icon name="check" size={14} /> : null}</span>
              <div className="obj-body">
                <span>
                  {o.text}
                  <span className="sr-only">{ok ? ' (cumplido)' : ' (pendiente)'}</span>
                </span>
                {o.kind === 'question' && !ok && st === 'disponible' ? <QuestionBox s={s} m={m} o={o} /> : null}
                {!ok && st === 'disponible' && o.go ? (
                  <button type="button" className="btn-ghost btn-sm" onClick={() => navigate(o.go!)}>
                    Ir a {MODULE_LABEL[o.go.module]} <Icon name="arrowRight" size={14} />
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      {st === 'completada' ? <Chip status="pagado" label="Misión completada" /> : null}
    </article>
  );
}

function QuestionBox({ s, m, o }: { s: ErpState; m: Mission; o: QuestionObjective }) {
  const [value, setValue] = useState('');
  const key = `${m.id}:${o.id}`;
  const attempts = s.gamification.attempts[key] ?? 0;
  const submit = () => {
    const raw = value.trim();
    // En pesos y unidades el punto es separador de miles; en "veces" (ROAS) se acepta 2,5 o 2.5.
    const n = o.unit === 'veces' ? Number(raw.replace(',', '.')) : Number(raw.replace(/[.\s$]/g, '').replace(',', '.'));
    const res = answerQuestion(s, m.id, o.id, n);
    replaceWorkspace(res.state);
    if (res.correct) {
      sfx.play('success');
      toast('logro', 'Respuesta correcta', attempts === 0 ? '+20 XP de bonificación por acertar al primer intento.' : undefined);
      run((x) => x);
    } else {
      sfx.play('error');
      toast('error', 'Respuesta incorrecta', `Pista: ${o.hint}`);
    }
  };
  return (
    <form
      className="question"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label htmlFor={`q-${key}`}>{o.question}</label>
      <div className="row wrap">
        <input id={`q-${key}`} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder={o.unit === 'pesos' ? 'Valor en pesos, sin puntos' : 'Tu respuesta'} />
        <button type="submit" className="btn-primary btn-sm" disabled={!value.trim()}>
          Verificar
        </button>
      </div>
      {attempts > 0 ? <small className="muted">Intentos: {attempts}. Pista: {o.hint}</small> : null}
    </form>
  );
}
