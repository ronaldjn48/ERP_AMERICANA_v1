import { useState } from 'react';
import { AudioBar } from '../components/AudioBar';
import { SpeakButton } from '../components/ui';
import { decodeConfig } from '../engine/config';
import { cop } from '../engine/format';
import { randomSeed } from '../engine/rng';
import { SCENARIOS } from '../engine/scenarios';
import { MISSIONS, TOTAL_XP } from '../erp/missions';
import { createWorkspace, defaultSettings } from '../erp/seed';
import { startWorkspace } from '../erp/store';
import type { ModuleKey } from '../erp/types';
import { loadAudioPrefs, storeAudioPrefs, type AudioPrefs } from '../storage';
import { Icon } from '../ui/icons';

const INTRO =
  'Bienvenido a ERP Americana. Vas a trabajar en el sistema de planificación de recursos de una empresa colombiana que vende a clientes de todo el país. ' +
  'Cada módulo funciona como en un software empresarial real: CRM, ventas, comercio electrónico, inventario, compras, contabilidad y automatización. ' +
  'Tus acciones generan registros, movimientos de inventario y asientos contables. ' +
  'El centro de misiones te guía con prácticas en cada módulo: ganas experiencia, subes de nivel y desbloqueas insignias. ' +
  'Escribe tu nombre, elige la empresa y presiona Crear espacio de trabajo.';

const FEATURES: Array<[ModuleKey, string, string]> = [
  ['crm', 'CRM', 'Clientes, embudo de oportunidades y casos de servicio.'],
  ['ventas', 'Ventas', 'Cotización, pedido, despacho, factura electrónica y cobro.'],
  ['ecommerce', 'Comercio electrónico', 'Catálogo de la tienda, pedidos web y campañas en Meta y TikTok.'],
  ['inventario', 'Inventario', 'Kardex a costo promedio, ajustes y punto de reorden.'],
  ['compras', 'Compras', 'Órdenes de compra, recepción, proveedores y pagos.'],
  ['contabilidad', 'Contabilidad', 'Libro diario, balance de prueba y estados financieros con PUC.'],
  ['automatizacion', 'Automatización', 'Reglas cuando–entonces que trabajan al cerrar cada día.'],
  ['misiones', 'Misiones', `${MISSIONS.length} prácticas gamificadas con ${TOTAL_XP} XP, niveles e insignias.`],
];

function hashCode(): string {
  if (typeof window === 'undefined') return '';
  const m = window.location.hash.match(/^#(?:codigo=)?([A-Za-z0-9-]+)$/);
  return m ? decodeURIComponent(m[1]) : '';
}

export function Onboarding() {
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const [intensity, setIntensity] = useState(1);
  const [code, setCode] = useState(hashCode);
  const [audio, setAudio] = useState<AudioPrefs>(() => loadAudioPrefs());
  const decoded = code.trim() ? decodeConfig(code) : null;

  const create = () => {
    const cfg = decoded;
    const sid = cfg?.scenarioId ?? scenarioId;
    const settings = defaultSettings(sid);
    if (cfg) {
      settings.marketIntensity = { basico: 0.6, intermedio: 1, avanzado: 1.4 }[cfg.difficulty];
      // Los módulos del código docente controlan qué áreas del ERP ve el estudiante.
      settings.enabledModules = {
        ...settings.enabledModules,
        ventas: cfg.modules.erp,
        inventario: cfg.modules.erp,
        compras: cfg.modules.erp,
        crm: cfg.modules.crm,
        ecommerce: cfg.modules.ecommerce,
        automatizacion: cfg.modules.automatizacion,
        contabilidad: cfg.modules.finanzas,
      };
    } else settings.marketIntensity = intensity;
    startWorkspace(createWorkspace({ name: name.trim(), group: group.trim() }, sid, cfg?.seed ?? randomSeed(), settings));
  };

  return (
    <div className="onboarding">
      <header className="onb-top">
        <div className="sidebar-brand">
          <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
            <rect width="64" height="64" rx="14" fill="var(--accent)" />
            <path d="M14 46V30h8v16zm14 0V20h8v26zm14 0V12h8v34z" fill="#fff" />
          </svg>
          <div>
            <strong>ERP Americana</strong>
            <small>Suite empresarial educativa</small>
          </div>
        </div>
        <AudioBar
          prefs={audio}
          onChange={(p) => {
            setAudio(p);
            storeAudioPrefs(p);
          }}
        />
      </header>
      <main className="onb-main" id="erp-main">
        <section className="onb-hero">
          <p className="eyebrow">Práctica empresarial con ERP, CRM, e-commerce y automatización</p>
          <h1>Opera una empresa real desde su sistema ERP</h1>
          <p className="lead">
            Registra clientes, vende, compra, despacha, factura y cierra el mes. Cada acción mueve el inventario y la contabilidad. Las misiones te guían
            módulo por módulo.
          </p>
          <SpeakButton text={INTRO} id="onboarding" label="Escuchar bienvenida" />
          <ul className="onb-features">
            {FEATURES.map(([icon, t, d]) => (
              <li key={t}>
                <Icon name={icon} />
                <div>
                  <strong>{t}</strong>
                  <span>{d}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <form
          className="panel onb-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim().length >= 2) create();
          }}
        >
          <h2>Crear espacio de trabajo</h2>
          <div className="ff">
            <label htmlFor="onb-name">
              Nombre completo <span className="req">*</span>
            </label>
            <input id="onb-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required minLength={2} maxLength={80} />
          </div>
          <div className="ff">
            <label htmlFor="onb-group">Curso, grupo o ficha</label>
            <input id="onb-group" value={group} onChange={(e) => setGroup(e.target.value)} maxLength={60} />
          </div>
          <div className="ff">
            <label htmlFor="onb-code">Código del docente (opcional)</label>
            <input id="onb-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="TECH-I-12-7-123456-ECWAF-G" />
            {code.trim() ? (
              decoded ? (
                <small className="ok-text">Código válido: {SCENARIOS.find((x) => x.id === decoded.scenarioId)?.company}, mercado y módulos asignados por el docente.</small>
              ) : (
                <small className="error-text">Código no válido: revisa que tenga siete partes separadas por guiones.</small>
              )
            ) : null}
          </div>
          <fieldset className="onb-scenarios" disabled={Boolean(decoded)}>
            <legend>Empresa</legend>
            {SCENARIOS.map((sc) => (
              <label key={sc.id} className={`scenario${(decoded?.scenarioId ?? scenarioId) === sc.id ? ' is-selected' : ''}`}>
                <input type="radio" name="onb-sc" checked={(decoded?.scenarioId ?? scenarioId) === sc.id} onChange={() => setScenarioId(sc.id)} />
                <strong>{sc.company}</strong>
                <span className="muted small">
                  {sc.sector} · precio de referencia {cop(sc.refPrice)}
                </span>
              </label>
            ))}
          </fieldset>
          {!decoded ? (
            <div className="ff">
              <label htmlFor="onb-int">Actividad del mercado</label>
              <select id="onb-int" value={intensity} onChange={(e) => setIntensity(Number(e.target.value))}>
                <option value={0.6}>Tranquila: ideal para la primera práctica</option>
                <option value={1}>Normal</option>
                <option value={1.4}>Exigente: más pedidos, casos y cotizaciones</option>
              </select>
            </div>
          ) : null}
          <button type="submit" className="btn-primary btn-lg" disabled={name.trim().length < 2 || (code.trim() !== '' && !decoded)}>
            Crear espacio de trabajo
          </button>
          <p className="muted small">Tu práctica se guarda en este navegador. Puedes copiar un respaldo desde Configuración.</p>
        </form>
      </main>
    </div>
  );
}
