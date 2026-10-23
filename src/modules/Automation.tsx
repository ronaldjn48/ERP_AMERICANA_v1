import { useState } from 'react';
import { cop } from '../engine/format';
import { GUIDES } from '../erp/meta';
import { saveRule } from '../erp/ops';
import { run } from '../erp/store';
import type { AutomationRule, ErpState, RuleType } from '../erp/types';
import { Icon } from '../ui/icons';
import { ModuleGuide, NumberInput, PageHeader } from '../ui/kit';

const RULE_INFO: Record<RuleType, { when: string; then: string; params: Array<{ key: string; label: string; suffix?: string; step?: number; help?: string }> }> = {
  reorden: {
    when: 'al cerrar el día, el disponible de un producto es menor o igual a su punto de reorden y no tiene una orden abierta',
    then: 'crea una orden de compra al proveedor principal por la cantidad de reposición y la aprueba si no supera el monto definido',
    params: [{ key: 'aprobarHasta', label: 'Aprobar automáticamente hasta', suffix: 'COP', step: 500000, help: 'Las órdenes de mayor valor quedan en borrador para revisión.' }],
  },
  despacho_auto: {
    when: 'al cerrar el día hay pedidos confirmados con inventario suficiente',
    then: 'despacha el pedido: descarga el kardex y registra el costo de ventas',
    params: [{ key: 'soloWeb', label: 'Solo pedidos web (1 = sí, 0 = todos)', step: 1 }],
  },
  factura_web: {
    when: 'un pedido de la tienda virtual quedó despachado',
    then: 'emite la factura electrónica y registra el recaudo de la pasarela de pagos',
    params: [],
  },
  recordatorio_cobro: {
    when: 'una factura a crédito lleva vencida los días indicados',
    then: 'envía un recordatorio de cobro por WhatsApp (máximo 3 por factura)',
    params: [{ key: 'diasVencida', label: 'Días de vencimiento', suffix: 'días', step: 1 }],
  },
  escalar_casos: {
    when: 'un caso de servicio lleva abierto los días indicados',
    then: 'sube su prioridad a alta y avisa al equipo',
    params: [{ key: 'diasAbierto', label: 'Días abierto', suffix: 'días', step: 1 }],
  },
  correo_confirmacion: {
    when: 'se confirma un pedido de un cliente con correo registrado',
    then: 'envía el correo de confirmación con el detalle del pedido',
    params: [],
  },
  pausar_campana: {
    when: 'una campaña activa cumple los días mínimos y su ROAS es menor al mínimo',
    then: 'pausa la campaña para no seguir invirtiendo sin retorno',
    params: [
      { key: 'roasMinimo', label: 'ROAS mínimo', step: 0.1 },
      { key: 'diasMinimos', label: 'Días mínimos de prueba', suffix: 'días', step: 1 },
    ],
  },
};

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
