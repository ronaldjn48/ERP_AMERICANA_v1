import { useState } from 'react';
import { sfx } from '../audio';
import { DIFFICULTIES, MODULE_INFO, MODULE_ORDER, decodeConfig, encodeConfig, sanitizeConfig } from '../engine/config';
import { cop } from '../engine/format';
import { randomSeed } from '../engine/rng';
import { MONTHS, SCENARIOS } from '../engine/scenarios';
import type { Difficulty, SimConfig, StudentProfile } from '../engine/types';
import type { SaveGame } from '../storage';
import { copyText, EMBED } from '../export';
import { ConfirmAction, SpeakButton, Toggle } from './ui';

interface Props {
  initialConfig: SimConfig;
  initialProfile: StudentProfile;
  /** Configuración asignada por el docente mediante enlace: se muestra bloqueada. */
  assigned: boolean;
  save: SaveGame | null;
  onStart: (profile: StudentProfile, config: SimConfig) => void;
  onResume: () => void;
  onDiscard: () => void;
}

const INTRO =
  'Bienvenido al simulador gerencial ERP Americana. Vas a dirigir una empresa durante varios meses. ' +
  'Cada mes tomarás decisiones de inventario, precio, servicio al cliente, pauta digital, automatización y finanzas. ' +
  'El sistema integrado te mostrará los resultados y te explicará qué pasó y por qué. Configura tu partida y presiona comenzar.';

export function SetupScreen({ initialConfig, initialProfile, assigned, save, onStart, onResume, onDiscard }: Props) {
  const [profile, setProfile] = useState<StudentProfile>(initialProfile);
  const [config, setConfig] = useState<SimConfig>(initialConfig);
  const [codeInput, setCodeInput] = useState('');
  const [codeMsg, setCodeMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [locked, setLocked] = useState(assigned);

  const patch = (p: Partial<SimConfig>) => setConfig((c) => sanitizeConfig({ ...c, ...p }));
  const code = encodeConfig(config);
  const link = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}#${code}` : '';
  const canStart = profile.name.trim().length >= 2;

  const copy = async (text: string, what: string) => {
    setCopied((await copyText(text)) ? what : 'error');
    window.setTimeout(() => setCopied(null), 2500);
  };

  const applyCode = () => {
    const c = decodeConfig(codeInput);
    if (!c) {
      setCodeMsg({ ok: false, text: 'El código no es válido. Verifica que tenga siete partes separadas por guiones.' });
      sfx.play('error');
      return;
    }
    setConfig(c);
    setLocked(true);
    setCodeMsg({ ok: true, text: 'Configuración del docente aplicada.' });
    sfx.play('success');
  };

  return (
    <div className="container setup" id="contenido">
      <section className="hero">
        <div>
          <p className="eyebrow">Nivel estratégico · decisiones mensuales</p>
          <h1>Simulador gerencial</h1>
          <p className="lead">
            Mientras el ERP te entrena en la operación diaria, el simulador resume la empresa en decisiones mensuales de precio, compras,
            servicio, pauta, automatización y crédito. Decide, observa los indicadores y aprende de las consecuencias.
          </p>
          <SpeakButton text={INTRO} id="intro" label="Escuchar introducción" />
        </div>
      </section>

      {save ? (
        <section className="card resume" aria-labelledby="resume-title">
          <h2 id="resume-title">Tienes una partida guardada</h2>
          <p>
            {save.profile.name} · {SCENARIOS.find((s) => s.id === save.config.scenarioId)?.company} · mes {save.state.period} de{' '}
            {save.config.periods}
            {save.state.finished ? ' (terminada)' : ''}
          </p>
          <div className="row">
            <button type="button" className="btn-primary" onClick={onResume}>
              Continuar partida
            </button>
            <ConfirmAction
              label="Borrar y empezar otra"
              question="¿Borrar la partida guardada? Esta acción no se puede deshacer."
              confirmLabel="Sí, borrar"
              onConfirm={onDiscard}
            />
          </div>
        </section>
      ) : null}

      <form
        className="setup-grid"
        onSubmit={(e) => {
          e.preventDefault();
          if (canStart) onStart({ name: profile.name.trim(), group: profile.group.trim() }, config);
        }}
      >
        <section className="card" aria-labelledby="perfil-title">
          <h2 id="perfil-title">1. Tus datos</h2>
          <label className="stack">
            <span>Nombre completo *</span>
            <input
              required
              minLength={2}
              maxLength={80}
              value={profile.name}
              autoComplete="name"
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </label>
          <label className="stack">
            <span>Curso, grupo o ficha</span>
            <input maxLength={60} value={profile.group} onChange={(e) => setProfile({ ...profile, group: e.target.value })} />
          </label>
          <div className="teacher-code">
            <label className="stack">
              <span>¿Tu docente te dio un código de partida?</span>
              <div className="row">
                <input
                  value={codeInput}
                  placeholder="TECH-B-12-7-123456-ECWAF-G"
                  onChange={(e) => setCodeInput(e.target.value)}
                  aria-describedby="code-msg"
                />
                <button type="button" className="btn-secondary" onClick={applyCode} disabled={!codeInput.trim()}>
                  Aplicar
                </button>
              </div>
            </label>
            <p id="code-msg" className={codeMsg ? (codeMsg.ok ? 'ok-text' : 'error-text') : 'sr-only'} role="status">
              {codeMsg?.text ?? ''}
            </p>
          </div>
        </section>

        {locked ? (
          <p className="notice span-all">
            Estás usando la configuración asignada por tu docente ({code}).{' '}
            <button type="button" className="link" onClick={() => setLocked(false)}>
              Desbloquear para práctica libre
            </button>
          </p>
        ) : null}

        <fieldset className="card" disabled={locked} aria-labelledby="empresa-title">
          <h2 id="empresa-title">2. Empresa a dirigir</h2>
          <div className="scenario-list" role="radiogroup" aria-label="Escenario">
            {SCENARIOS.map((s) => (
              <label key={s.id} className={`scenario${config.scenarioId === s.id ? ' is-selected' : ''}`}>
                <input type="radio" name="scenario" value={s.id} checked={config.scenarioId === s.id} onChange={() => patch({ scenarioId: s.id })} />
                <strong>{s.company}</strong>
                <span className="muted">{s.sector}</span>
                <span>{s.description}</span>
                <span className="muted small">
                  Precio de mercado {cop(s.refPrice)} · costo local {cop(s.localCost)}
                  {s.importCostUSD !== null ? ` · importable (USD ${s.importCostUSD})` : ' · solo proveedor local'}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="card" disabled={locked} aria-labelledby="reglas-title">
          <h2 id="reglas-title">3. Reglas de la partida</h2>
          <div className="segmented" role="radiogroup" aria-label="Nivel de dificultad">
            {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => (
              <label key={d} className={config.difficulty === d ? 'is-selected' : ''}>
                <input type="radio" name="difficulty" checked={config.difficulty === d} onChange={() => patch({ difficulty: d })} />
                {DIFFICULTIES[d].label}
              </label>
            ))}
          </div>
          <p className="muted small">{DIFFICULTIES[config.difficulty].description}</p>
          <div className="two-col">
            <label className="stack">
              <span>Duración</span>
              <select value={config.periods} onChange={(e) => patch({ periods: Number(e.target.value) })}>
                {[3, 6, 9, 12, 18, 24].map((n) => (
                  <option key={n} value={n}>
                    {n} meses
                  </option>
                ))}
              </select>
            </label>
            <label className="stack">
              <span>Mes de inicio</span>
              <select value={config.startMonth} onChange={(e) => patch({ startMonth: Number(e.target.value) })}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>
                    {m[0].toUpperCase() + m.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Toggle
            label="Modo guiado"
            checked={config.guided}
            onChange={(v) => patch({ guided: v })}
            help="Muestra pronósticos y cálculos de referencia antes de cada decisión. Recomendado para la primera partida."
          />
        </fieldset>

        <fieldset className="card" disabled={locked} aria-labelledby="modulos-title">
          <h2 id="modulos-title">4. Módulos que vas a controlar</h2>
          <p className="muted small">Los módulos desactivados funcionan con una política automática. Útil para enfocar la clase en un tema.</p>
          {MODULE_ORDER.map((m) => (
            <Toggle
              key={m}
              label={MODULE_INFO[m].label}
              checked={config.modules[m]}
              onChange={(v) => patch({ modules: { ...config.modules, [m]: v } })}
              help={MODULE_INFO[m].description}
            />
          ))}
        </fieldset>

        <details className="card teacher">
          <summary>
            <h2>Panel docente: compartir la misma partida con el grupo</h2>
          </summary>
          <p>
            Todos los estudiantes que usen este código enfrentan el mismo mercado y los mismos eventos. Así los resultados se pueden
            comparar y discutir en clase.
          </p>
          <div className="two-col">
            <label className="stack">
              <span>Semilla del mercado</span>
              <div className="row">
                <input
                  type="number"
                  value={config.seed}
                  disabled={locked}
                  onChange={(e) => patch({ seed: Number(e.target.value) })}
                />
                <button type="button" className="btn-secondary" disabled={locked} onClick={() => patch({ seed: randomSeed() })}>
                  Nueva
                </button>
              </div>
            </label>
            <div className="stack">
              <span>Código de la partida</span>
              <code className="code-box">{code}</code>
            </div>
          </div>
          <div className="row wrap">
            <button type="button" className="btn-secondary" onClick={() => copy(code, 'codigo')}>
              {copied === 'codigo' ? 'Código copiado' : 'Copiar código'}
            </button>
            {EMBED ? null : (
              <button type="button" className="btn-secondary" onClick={() => copy(link, 'enlace')}>
                {copied === 'enlace' ? 'Enlace copiado' : 'Copiar enlace para estudiantes'}
              </button>
            )}
          </div>
          {copied === 'error' ? (
            <p className="error-text" role="status">
              El navegador no permitió copiar. Selecciona el código y cópialo manualmente.
            </p>
          ) : null}
          <p className="muted small">
            {EMBED
              ? `Para compartir la partida, agrega #${code} al final del enlace de esta página, o pide a los estudiantes que escriban el código.`
              : 'Los estudiantes también pueden escribir el código en el campo "¿Tu docente te dio un código de partida?".'}
          </p>
        </details>

        <div className="setup-actions">
          {!canStart ? <p className="muted">Escribe tu nombre para comenzar.</p> : null}
          <button type="submit" className="btn-primary btn-lg" disabled={!canStart}>
            Comenzar simulación
          </button>
        </div>
      </form>
    </div>
  );
}
