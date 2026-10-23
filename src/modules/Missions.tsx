import { useEffect, useState } from 'react';
import { sfx } from '../audio';
import { SpeakButton } from '../components/ui';
import { MODULE_LABEL } from '../erp/meta';
import { BADGES, LEVELS, MISSIONS, TOTAL_XP, answerQuestion, levelOf, missionProgress, missionStatus, objectiveDone, setActiveMission, type Mission, type QuestionObjective } from '../erp/missions';
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
    </div>
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
      {st === 'completada' ? <p className="notice notice-ok">Completada el día {s.gamification.completed[m.id]}. Ganaste {m.xp} XP.</p> : null}
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
