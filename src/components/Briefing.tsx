import { DIFFICULTIES, MODULE_INFO, MODULE_ORDER } from '../engine/config';
import { cop, num, pesosHabla } from '../engine/format';
import { MONTHS, getScenario } from '../engine/scenarios';
import type { SimConfig, SimState, StudentProfile } from '../engine/types';
import { LEARNING_OUTCOMES } from '../content/pedagogy';
import { SpeakButton } from './ui';

const CYCLE = [
  ['Analizar', 'Revisa el tablero, el evento del mes y, en modo guiado, el pronóstico.'],
  ['Decidir', 'Ajusta precio, compras, equipo de servicio, pauta, automatizaciones y crédito.'],
  ['Ejecutar', 'El ERP simula el mes completo: demanda, ventas, costos, caja y clientes.'],
  ['Reflexionar', 'Lee la retroalimentación, identifica la causa y corrige en el mes siguiente.'],
];

export function Briefing({
  profile,
  config,
  state,
  onStart,
  onBack,
}: {
  profile: StudentProfile;
  config: SimConfig;
  state: SimState;
  onStart: () => void;
  onBack: () => void;
}) {
  const s = getScenario(config.scenarioId);
  const controlled = MODULE_ORDER.filter((m) => config.modules[m]);
  const speech =
    `${profile.name.split(' ')[0]}, desde hoy eres gerente general de ${s.company}. ${s.description} ` +
    `Tu reto: ${s.challenge} ` +
    `Empiezas en ${MONTHS[config.startMonth]} con ${pesosHabla(state.cash)} en caja, ${num(state.inventory)} ${s.unitName} en bodega y ${num(state.customers)} clientes activos. ` +
    `La simulación dura ${config.periods} meses. Cada mes sigue el ciclo: analizar, decidir, ejecutar y reflexionar. ` +
    'Tu nota final sale de un cuadro de mando que equilibra finanzas, clientes y procesos. Mucho éxito.';

  return (
    <div className="container briefing" id="contenido">
      <p className="eyebrow">Sesión informativa</p>
      <h1>{s.company}</h1>
      <p className="lead">{s.description}</p>
      <SpeakButton text={speech} id="briefing" label="Escuchar sesión informativa" />

      <div className="grid-2">
        <section className="card">
          <h2>Tu reto como gerente</h2>
          <p>{s.challenge}</p>
          <h3>Posición inicial</h3>
          <ul className="facts">
            <li>
              <span>Caja</span>
              <strong>{cop(state.cash)}</strong>
            </li>
            <li>
              <span>Inventario</span>
              <strong>
                {num(state.inventory)} {s.unitName}
              </strong>
            </li>
            <li>
              <span>Clientes activos</span>
              <strong>{num(state.customers)}</strong>
            </li>
            <li>
              <span>Precio de mercado</span>
              <strong>{cop(s.refPrice)}</strong>
            </li>
            <li>
              <span>Mes de inicio</span>
              <strong>{MONTHS[config.startMonth]}</strong>
            </li>
            <li>
              <span>Duración</span>
              <strong>{config.periods} meses</strong>
            </li>
            <li>
              <span>Nivel</span>
              <strong>{DIFFICULTIES[config.difficulty].label}</strong>
            </li>
          </ul>
        </section>
        <section className="card">
          <h2>Resultados de aprendizaje</h2>
          <ol className="outcomes">
            {LEARNING_OUTCOMES.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ol>
        </section>
      </div>

      <section className="card">
        <h2>Ciclo de cada mes</h2>
        <ol className="cycle">
          {CYCLE.map(([t, d], i) => (
            <li key={t}>
              <span className="cycle-n">{i + 1}</span>
              <strong>{t}</strong>
              <span>{d}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid-2">
        <section className="card">
          <h2>Módulos que controlas</h2>
          <ul className="plain">
            {controlled.map((m) => (
              <li key={m}>
                <strong>{MODULE_INFO[m].label}.</strong> {MODULE_INFO[m].description}
              </li>
            ))}
          </ul>
          {controlled.length < MODULE_ORDER.length ? (
            <p className="muted small">
              Los demás módulos ({MODULE_ORDER.filter((m) => !config.modules[m]).map((m) => MODULE_INFO[m].short).join(', ')}) funcionan
              con una política automática.
            </p>
          ) : null}
        </section>
        <section className="card">
          <h2>Cómo se calcula tu nota</h2>
          <ul className="plain">
            <li>
              <strong>Finanzas (40 puntos):</strong> utilidad neta frente a una meta de 12 % sobre las ventas esperadas y liquidez sin sobregiro.
            </li>
            <li>
              <strong>Clientes (30 puntos):</strong> satisfacción y crecimiento de la base de clientes.
            </li>
            <li>
              <strong>Procesos (30 puntos):</strong> nivel de servicio del inventario, capacidad de atención, días de inventario y eficiencia de la pauta.
            </li>
          </ul>
          <p className="muted small">La nota final es el promedio mensual convertido a escala de 0,0 a 5,0.</p>
        </section>
      </div>

      <div className="row end">
        <button type="button" className="btn-secondary" onClick={onBack}>
          Volver a la configuración
        </button>
        <button type="button" className="btn-primary btn-lg" onClick={onStart}>
          Ir al primer mes
        </button>
      </div>
    </div>
  );
}
