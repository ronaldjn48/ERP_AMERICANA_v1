import type { ReactNode } from 'react';
import { AUTOMATION_COSTS, DIFFICULTIES, MAX_AGENTS, MODULE_INFO, priceBounds } from '../engine/config';
import { buildHints } from '../engine/feedback';
import { cop, num, pct } from '../engine/format';
import { MONTHS, getScenario } from '../engine/scenarios';
import { importUnitCost } from '../engine/simulation';
import type { AutomationDecisions, AutomationId, Decisions, ModuleId, SimConfig, SimState } from '../engine/types';
import { NumberField, SpeakButton, Toggle } from './ui';

interface Props {
  state: SimState;
  config: SimConfig;
  draft: Decisions;
  onChange: (d: Decisions) => void;
  onRun: () => void;
}

function ModuleSection({
  id,
  enabled,
  auto,
  children,
}: {
  id: ModuleId;
  enabled: boolean;
  auto: ReactNode;
  children: ReactNode;
}) {
  const info = MODULE_INFO[id];
  return (
    <section className={`card module module-${id}`} aria-labelledby={`mod-${id}`}>
      <header className="module-head">
        <h3 id={`mod-${id}`}>{info.label}</h3>
        {!enabled ? <span className="badge">Política automática</span> : null}
      </header>
      {enabled ? children : <p className="muted">{auto}</p>}
    </section>
  );
}

const AUTOMATIONS: Array<{ id: AutomationId; label: string; help: string }> = [
  {
    id: 'autoReorder',
    label: 'Reposición automática de inventario',
    help: 'El ERP compra al proveedor local cuando el inventario disponible queda por debajo del punto de reorden.',
  },
  {
    id: 'cartRecovery',
    label: 'Recuperación de carritos abandonados',
    help: 'Mensajes automáticos por correo y WhatsApp a quien no terminó el pago. Sube la conversión cerca de 12 %.',
  },
  {
    id: 'chatbot',
    label: 'Chatbot de atención integrado al CRM',
    help: 'Responde preguntas frecuentes y estado de pedidos las 24 horas. Suma capacidad de atención.',
  },
  {
    id: 'eInvoicing',
    label: 'Facturación electrónica integrada al ERP',
    help: 'Elimina digitación y conciliación manual. El costo administrativo baja de 1,5 % a 0,4 % de las ventas.',
  },
];

export function DecisionPanel({ state, config, draft, onChange, onRun }: Props) {
  const s = getScenario(config.scenarioId);
  const m = config.modules;
  const diff = DIFFICULTIES[config.difficulty];
  const set = (patch: Partial<Decisions>) => onChange({ ...draft, ...patch });
  const setAuto = (patch: Partial<AutomationDecisions>) => onChange({ ...draft, automation: { ...draft.automation, ...patch } });
  const pb = priceBounds(s);
  const impCost = importUnitCost(s, state.trm);
  const event = state.pendingEvent;
  const hints = config.guided ? buildHints(state, draft, s, config) : [];
  const arriving = state.pipeline.filter((p) => p.arrivesAt <= state.period + 1).reduce((a, p) => a + p.units, 0);

  const grossMargin = draft.price > 0 ? 1 - state.avgUnitCost / draft.price : 0;
  const purchases =
    (m.erp ? draft.purchaseLocal * s.localCost : 0) +
    (m.erp && impCost !== null && draft.purchaseImport > 0 ? draft.purchaseImport * impCost + s.importFixedCost : 0);
  let automationSpend = 0;
  (Object.keys(AUTOMATION_COSTS) as AutomationId[]).forEach((id) => {
    if (draft.automation[id]) automationSpend += AUTOMATION_COSTS[id].monthly + (state.activated[id] ? 0 : AUTOMATION_COSTS[id].setup);
  });
  const committed =
    purchases +
    s.fixedCosts +
    draft.agents * s.agentSalary * state.salaryIndex +
    draft.metaBudget +
    draft.tiktokBudget +
    draft.uxInvestment +
    automationSpend +
    draft.loanRepay;
  const available = state.cash + draft.loanDraw;
  const overdraftRoom = Math.max(0, diff.overdraftLimit - state.overdraft);
  const needsChoice = Boolean(event?.choices && !draft.eventChoice);

  return (
    <div className="decisions">
      {event ? (
        <section className="card event" aria-labelledby="event-title" role="region">
          <div className="row between">
            <p className="eyebrow">Evento del mes</p>
            <SpeakButton text={`${event.title}. ${event.description}`} id={`evento-${state.period}`} />
          </div>
          <h3 id="event-title">{event.title}</h3>
          <p>{event.description}</p>
          {event.choices ? (
            <div className="segmented" role="radiogroup" aria-label="Respuesta al evento">
              {event.choices.map((c) => (
                <label key={c.id} className={draft.eventChoice === c.id ? 'is-selected' : ''}>
                  <input type="radio" name="event-choice" checked={draft.eventChoice === c.id} onChange={() => set({ eventChoice: c.id })} />
                  {c.label}
                </label>
              ))}
            </div>
          ) : null}
        </section>
      ) : (
        <p className="notice">Este mes no hay eventos especiales. {s.seasonNotes[state.month] ?? ''}</p>
      )}

      {hints.length > 0 ? (
        <section className="card hints" aria-labelledby="hints-title">
          <div className="row between">
            <h3 id="hints-title">Modo guiado: datos para decidir</h3>
            <SpeakButton
              text={hints.map((h) => `${h.title}: ${h.value}. ${h.explanation}`).join(' ')}
              id={`pistas-${state.period}`}
            />
          </div>
          <div className="hint-grid">
            {hints.map((h) => (
              <div key={h.id} className="hint">
                <span className="hint-title">{h.title}</span>
                <strong className="hint-value">{h.value}</strong>
                <span className="hint-exp">{h.explanation}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <ModuleSection id="erp" enabled={m.erp} auto="El ERP compra lo necesario para cubrir el pronóstico más 20 % de seguridad y mantiene el precio de mercado.">
        <NumberField
          label="Precio de venta por unidad"
          value={draft.price}
          min={pb.min}
          max={pb.max}
          step={pb.step}
          format={cop}
          onChange={(v) => set({ price: v })}
          help={
            <>
              Precio de mercado: {cop(s.refPrice)}. Costo promedio en bodega: {cop(state.avgUnitCost)}. Margen bruto con este precio:{' '}
              <strong>{pct(grossMargin)}</strong>.
            </>
          }
        />
        <NumberField
          label="Compra al proveedor local (llega de inmediato)"
          value={draft.purchaseLocal}
          min={0}
          max={Math.round(s.baseDemand * 4)}
          step={10}
          suffix={s.unitName}
          format={num}
          onChange={(v) => set({ purchaseLocal: v })}
          help={
            <>
              {cop(s.localCost)} por unidad. Total: <strong>{cop(draft.purchaseLocal * s.localCost)}</strong>. Inventario actual:{' '}
              {num(state.inventory)}
              {arriving > 0 ? ` + ${num(arriving)} importadas que llegan este mes` : ''}.
            </>
          }
        />
        {impCost !== null ? (
          <NumberField
            label="Orden de importación (llega el mes siguiente)"
            value={draft.purchaseImport}
            min={0}
            max={Math.round(s.baseDemand * 5)}
            step={50}
            suffix={s.unitName}
            format={num}
            onChange={(v) => set({ purchaseImport: v })}
            help={
              <>
                TRM hoy: {num(state.trm)}. Costo nacionalizado: {cop(impCost)} por unidad + {cop(s.importFixedCost)} de flete por embarque.
                {draft.purchaseImport > 0 ? (
                  <>
                    {' '}
                    Costo real por unidad: <strong>{cop(impCost + s.importFixedCost / draft.purchaseImport)}</strong>.
                  </>
                ) : null}
              </>
            }
          />
        ) : (
          <p className="muted small">Este producto no se importa: solo hay proveedor local.</p>
        )}
      </ModuleSection>

      <ModuleSection id="crm" enabled={m.crm} auto="El CRM asigna los asesores necesarios según el pronóstico y mantiene un descuento de fidelización de 5 %.">
        <NumberField
          label="Asesores de servicio al cliente"
          value={draft.agents}
          min={0}
          max={MAX_AGENTS}
          step={1}
          onChange={(v) => set({ agents: v })}
          help={
            <>
              Cada asesor cuesta {cop(s.agentSalary * state.salaryIndex)} al mes con prestaciones y atiende {s.ordersPerAgent} pedidos. Capacidad:{' '}
              <strong>
                {num(draft.agents * s.ordersPerAgent + (draft.automation.chatbot ? s.chatbotCapacity : 0))} pedidos
              </strong>
              .
            </>
          }
        />
        <NumberField
          label="Descuento para clientes recurrentes"
          value={Math.round(draft.loyaltyDiscount * 100)}
          min={0}
          max={20}
          step={1}
          suffix="%"
          onChange={(v) => set({ loyaltyDiscount: v / 100 })}
          help="Aumenta la recompra y la satisfacción, pero reduce el ingreso de cada venta a clientes que ya compraron."
        />
      </ModuleSection>

      <ModuleSection id="ecommerce" enabled={m.ecommerce} auto={`Pauta fija: Meta Ads ${cop(s.defaults.metaBudget)} y TikTok Ads ${cop(s.defaults.tiktokBudget)} al mes, sin envío gratis.`}>
        <NumberField
          label="Presupuesto Meta Ads (Facebook e Instagram)"
          value={draft.metaBudget}
          min={0}
          max={20000000}
          step={100000}
          format={cop}
          onChange={(v) => set({ metaBudget: v })}
          help={`Costo por clic de referencia: ${cop(s.cpc.meta)}. Audiencia con mejor conversión.`}
        />
        <NumberField
          label="Presupuesto TikTok Ads"
          value={draft.tiktokBudget}
          min={0}
          max={20000000}
          step={100000}
          format={cop}
          onChange={(v) => set({ tiktokBudget: v })}
          help={`Costo por clic de referencia: ${cop(s.cpc.tiktok)}. Clics más baratos, conversión ${pct(s.channelConversion.tiktok, 0)} de la de Meta.`}
        />
        <Toggle
          label="Envío gratis"
          checked={draft.freeShipping}
          onChange={(v) => set({ freeShipping: v })}
          help={`Sube la conversión cerca de 18 % y la satisfacción. La empresa paga ${cop(s.shippingCost)} por pedido.`}
        />
        <NumberField
          label="Inversión en mejoras de la tienda virtual (este mes)"
          value={draft.uxInvestment}
          min={0}
          max={10000000}
          step={250000}
          format={cop}
          onChange={(v) => set({ uxInvestment: v })}
          help={
            <>
              Experiencia de la tienda: <strong>{num(state.ux)} / 100</strong>. Se deteriora 3 % al mes sin mantenimiento. Cada punto cuesta{' '}
              {cop(s.uxCostPerPoint)} y mejora la conversión.
            </>
          }
        />
      </ModuleSection>

      <ModuleSection id="automatizacion" enabled={m.automatizacion} auto="Sin automatizaciones: los procesos se hacen de forma manual.">
        {AUTOMATIONS.map((a) => (
          <div key={a.id} className="automation">
            <Toggle
              label={
                <>
                  {a.label}{' '}
                  {state.activated[a.id] ? <span className="badge badge-ok">Implementada</span> : null}
                </>
              }
              checked={draft.automation[a.id]}
              onChange={(v) => setAuto({ [a.id]: v } as Partial<AutomationDecisions>)}
              help={
                <>
                  {a.help} Mensualidad {cop(AUTOMATION_COSTS[a.id].monthly)}
                  {state.activated[a.id] ? '' : ` + implementación única de ${cop(AUTOMATION_COSTS[a.id].setup)}`}.
                </>
              }
            />
            {a.id === 'autoReorder' && draft.automation.autoReorder ? (
              <div className="nested">
                <NumberField
                  label="Punto de reorden"
                  value={draft.automation.reorderPoint}
                  min={0}
                  max={Math.round(s.baseDemand * 3)}
                  step={10}
                  suffix={s.unitName}
                  format={num}
                  onChange={(v) => setAuto({ reorderPoint: v })}
                  help="Si el inventario disponible más tu compra manual queda por debajo de este nivel, el ERP compra la cantidad de reposición."
                />
                <NumberField
                  label="Cantidad de reposición"
                  value={draft.automation.reorderQty}
                  min={0}
                  max={Math.round(s.baseDemand * 3)}
                  step={10}
                  suffix={s.unitName}
                  format={num}
                  onChange={(v) => setAuto({ reorderQty: v })}
                />
              </div>
            ) : null}
          </div>
        ))}
      </ModuleSection>

      <ModuleSection id="finanzas" enabled={m.finanzas} auto="Sin préstamos: si falta caja, el banco aplica sobregiro.">
        <NumberField
          label="Solicitar préstamo bancario"
          value={draft.loanDraw}
          min={0}
          max={Math.max(0, diff.creditLimit - state.debt)}
          step={1000000}
          format={cop}
          onChange={(v) => set({ loanDraw: v })}
          help={`Tasa ${pct(diff.loanRate)} mensual. Cupo disponible: ${cop(Math.max(0, diff.creditLimit - state.debt))}. El sobregiro cuesta ${pct(diff.overdraftRate)} mensual y tiene un cupo de ${cop(diff.overdraftLimit)}.`}
        />
        <NumberField
          label="Abonar a la deuda"
          value={draft.loanRepay}
          min={0}
          max={state.debt}
          step={1000000}
          format={cop}
          disabled={state.debt <= 0}
          onChange={(v) => set({ loanRepay: v })}
          help={`Deuda actual: ${cop(state.debt)}. Abonar reduce los intereses del mes siguiente.`}
        />
      </ModuleSection>

      <section className="card summary" aria-labelledby="summary-title">
        <h3 id="summary-title">Antes de ejecutar {MONTHS[state.month]}</h3>
        <ul className="facts">
          <li>
            <span>Caja disponible (incluye préstamo nuevo)</span>
            <strong>{cop(available)}</strong>
          </li>
          <li>
            <span>Salidas comprometidas (compras, nómina, fijos, pauta, automatización, abonos)</span>
            <strong>{cop(committed)}</strong>
          </li>
          <li>
            <span>Saldo antes de recibir las ventas del mes</span>
            <strong className={available - committed < 0 ? 'bad-text' : ''}>{cop(available - committed)}</strong>
          </li>
        </ul>
        {purchases > available + overdraftRoom ? (
          <p className="notice notice-bad">
            Las compras superan tu caja más el cupo de sobregiro: el proveedor no despachará la parte que no puedas pagar.
          </p>
        ) : available - committed < 0 ? (
          <p className="notice notice-warn">
            Si las ventas del mes no cubren la diferencia, usarás sobregiro a {pct(diff.overdraftRate)} mensual.
          </p>
        ) : null}
        {needsChoice ? <p className="notice notice-warn">Responde al evento del mes antes de ejecutar.</p> : null}
        <button type="button" className="btn-primary btn-lg" onClick={onRun} disabled={needsChoice}>
          Ejecutar {MONTHS[state.month]} (mes {state.period + 1} de {config.periods})
        </button>
      </section>
    </div>
  );
}
