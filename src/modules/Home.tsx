import { LineChart } from '../components/Charts';
import { SpeakButton } from '../components/ui';
import { cop, millions, num } from '../engine/format';
import { balanceOf, incomeStatement } from '../erp/accounts';
import { decisionIndicators, topRecommendation, type IndicatorStatus } from '../erp/insights';
import { MODULE_LABEL } from '../erp/meta';
import { MISSIONS, levelOf, missionProgress } from '../erp/missions';
import { available, orderTotals } from '../erp/ops';
import { formatDay } from '../erp/seed';
import { missionContext, navigate, type Route } from '../erp/store';
import type { ErpState } from '../erp/types';
import { Icon } from '../ui/icons';
import { Empty, Kpi, PageHeader, Section } from '../ui/kit';

interface Task {
  id: string;
  text: string;
  count: number;
  route: Route;
  tone: 'bad' | 'warn' | 'info';
}

export function pendingTasks(s: ErpState): Task[] {
  const so = s.salesOrders;
  const t: Task[] = [
    { id: 'cot', text: 'Cotizaciones por confirmar', count: so.filter((o) => o.status === 'cotizacion').length, route: { module: 'ventas', view: 'cotizaciones' }, tone: 'info' },
    { id: 'desp', text: 'Pedidos confirmados por despachar', count: so.filter((o) => o.status === 'confirmado').length, route: { module: 'ventas', view: 'despachar' }, tone: so.some((o) => o.status === 'confirmado' && s.day - o.day >= 2) ? 'bad' : 'warn' },
    { id: 'fact', text: 'Pedidos despachados por facturar', count: so.filter((o) => o.status === 'despachado').length, route: { module: 'ventas', view: 'facturar' }, tone: 'warn' },
    { id: 'venc', text: 'Facturas vencidas por cobrar', count: so.filter((o) => o.status === 'facturado' && (o.dueDay ?? Infinity) < s.day).length, route: { module: 'contabilidad', view: 'cartera' }, tone: 'bad' },
    { id: 'rec', text: 'Órdenes de compra listas para recibir', count: s.purchaseOrders.filter((p) => p.status === 'aprobada' && p.expectedDay <= s.day).length, route: { module: 'compras' }, tone: 'warn' },
    { id: 'apr', text: 'Órdenes de compra en borrador por aprobar', count: s.purchaseOrders.filter((p) => p.status === 'borrador').length, route: { module: 'compras' }, tone: 'info' },
    { id: 'pagar', text: 'Órdenes recibidas por pagar', count: s.purchaseOrders.filter((p) => p.status === 'recibida').length, route: { module: 'contabilidad', view: 'cartera' }, tone: 'info' },
    { id: 'casos', text: 'Casos de servicio abiertos', count: s.cases.filter((c) => c.status !== 'resuelto').length, route: { module: 'crm', view: 'casos' }, tone: s.cases.some((c) => c.status !== 'resuelto' && c.priority === 'alta') ? 'bad' : 'info' },
    { id: 'reorden', text: 'Productos en o bajo el punto de reorden', count: s.products.filter((p) => p.active && p.reorderPoint > 0 && available(p) <= p.reorderPoint).length, route: { module: 'inventario' }, tone: 'warn' },
    { id: 'quiebre', text: 'Productos con pedidos sin inventario', count: s.products.filter((p) => p.active && available(p) < 0).length, route: { module: 'inventario' }, tone: 'bad' },
  ];
  return t.filter((x) => x.count > 0);
}

export function Home({ s }: { s: ErpState }) {
  const month0 = Math.floor((s.day - 1) / 30) * 30 + 1;
  const isMonth = incomeStatement(s.journal, month0, s.day);
  const isAll = incomeStatement(s.journal);
  const cash = balanceOf(s.journal, '1110');
  const ar = balanceOf(s.journal, '1305');
  const inv = balanceOf(s.journal, '1435');
  const tasks = pendingTasks(s);
  const lvl = levelOf(s.gamification.xp);
  const ctx = missionContext();
  const active = MISSIONS.find((m) => m.id === s.gamification.activeMission);
  const done = Object.keys(s.gamification.completed).length;

  const days = Array.from({ length: Math.min(14, s.day) }, (_, i) => s.day - Math.min(14, s.day) + 1 + i);
  const salesByDay = days.map((d) =>
    s.salesOrders.filter((o) => o.invoiceDay === d).reduce((a, o) => a + orderTotals(o.lines, s.settings.ivaRate).subtotal, 0),
  );
  const ordersByDay = days.map((d) => s.salesOrders.filter((o) => o.day === d && o.status !== 'anulado').length);

  const speech =
    `Resumen del día ${s.day}. Bancos: ${cop(cash)}. ` +
    (tasks.length ? `Tienes ${tasks.length} tipos de tareas pendientes. ${tasks.slice(0, 4).map((t) => `${t.count} ${t.text}`).join('. ')}.` : 'No hay tareas pendientes.') +
    (active ? ` Tu misión activa es: ${active.title}.` : '');

  return (
    <div className="page">
      <PageHeader
        title={`Hola, ${s.profile.name.split(' ')[0]}`}
        subtitle={`${s.settings.companyName} · día ${s.day} de operación (${formatDay(s, s.day)}) · ${lvl.name}`}
        actions={<SpeakButton text={speech} id={`inicio-${s.day}`} label="Escuchar resumen" />}
      />

      <div className="kpi-grid">
        <Kpi label="Ventas del mes" value={millions(isMonth.revenue)} sub={`Acumulado ${millions(isAll.revenue)}`} onClick={() => navigate({ module: 'contabilidad', view: 'estados' })} />
        <Kpi label="Utilidad del mes" value={millions(isMonth.operatingProfit)} tone={isMonth.operatingProfit < 0 ? 'bad' : 'good'} sub={`Desde el día ${month0}; los gastos fijos se registran el primer día`} onClick={() => navigate({ module: 'contabilidad', view: 'estados' })} />
        <Kpi label="Bancos" value={millions(cash)} tone={cash < 0 ? 'bad' : undefined} sub="Cuenta 1110" onClick={() => navigate({ module: 'contabilidad', view: 'balance' })} />
        <Kpi label="Cartera" value={millions(ar)} sub="Cuentas por cobrar" onClick={() => navigate({ module: 'contabilidad', view: 'cartera' })} />
        <Kpi label="Inventario" value={millions(inv)} sub={`${num(s.products.reduce((a, p) => a + p.stock, 0))} unidades`} onClick={() => navigate({ module: 'inventario' })} />
        <Kpi label="Misiones" value={`${done}/${MISSIONS.length}`} sub={`${s.gamification.xp} XP`} onClick={() => navigate({ module: 'misiones' })} />
      </div>

      <DecisionBoard s={s} />

      <div className="grid-home">
        <Section title="Tareas pendientes">
          {tasks.length === 0 ? (
            <p className="muted">Todo al día. Cierra el día para recibir nuevos pedidos y solicitudes.</p>
          ) : (
            <ul className="task-list">
              {tasks.map((t) => (
                <li key={t.id} className={`task tone-${t.tone}`}>
                  <span className="task-count">{t.count}</span>
                  <span className="task-text">{t.text}</span>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => navigate(t.route)}>
                    Ir <Icon name="arrowRight" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Misión activa" actions={<button type="button" className="btn-ghost btn-sm" onClick={() => navigate({ module: 'misiones' })}>Todas</button>}>
          {active ? (
            <div className="home-mission">
              <p className="eyebrow">{MODULE_LABEL[active.module]} · {active.xp} XP</p>
              <h3>{active.title}</h3>
              <p className="muted">{active.concept}</p>
              <div className="xpbar">
                <div style={{ width: `${missionProgress(s, active, ctx).ratio * 100}%` }} />
              </div>
              <div className="row wrap">
                <button type="button" className="btn-primary btn-sm" onClick={() => navigate({ module: 'misiones', id: active.id })}>
                  Abrir misión
                </button>
                <SpeakButton text={active.briefing} id={`home-${active.id}`} label="Escuchar" />
              </div>
            </div>
          ) : (
            <p className="muted">Completaste todas las misiones disponibles.</p>
          )}
        </Section>
      </div>

      <div className="grid-2">
        <section className="panel">
          {salesByDay.some((v) => v > 0) ? (
            <LineChart
              title="Ventas facturadas por día (sin IVA)"
              labels={days.map((d) => `D${d}`)}
              format={millions}
              series={[{ name: 'Ventas', values: salesByDay, color: 'var(--series-1)' }]}
            />
          ) : (
            <Empty title="Ventas facturadas por día" text="Aún no hay facturas. Despacha y factura pedidos en Ventas para ver la tendencia." />
          )}
        </section>
        <section className="panel">
          {ordersByDay.some((v) => v > 0) ? (
            <LineChart
              title="Pedidos recibidos por día"
              labels={days.map((d) => `D${d}`)}
              format={(v) => `${Math.round(v)}`}
              series={[{ name: 'Pedidos', values: ordersByDay, color: 'var(--series-3)' }]}
            />
          ) : (
            <Empty title="Pedidos recibidos por día" text="Cierra el día para recibir pedidos de la tienda virtual y de clientes empresariales." />
          )}
        </section>
      </div>

      <Section title="Actividad reciente">
        <ul className="activity">
          {[...s.log].reverse().slice(0, 12).map((l) => (
            <li key={l.id} className={`act kind-${l.kind}`}>
              <span className="act-day">Día {l.day}</span>
              <span className="act-mod">{MODULE_LABEL[l.module]}</span>
              <span className="act-text">{l.text}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

const STATUS_LABEL: Record<IndicatorStatus, string> = { bien: 'En meta', atencion: 'Atención', critico: 'Crítico', 'sin-datos': 'Sin datos' };

/** Indicadores para decidir: meta, significado y acción recomendada. */
function DecisionBoard({ s }: { s: ErpState }) {
  const list = decisionIndicators(s);
  const top = topRecommendation(s);
  const speech =
    (top ? `Recomendación del día: ${top.label}, ${top.value}. ${top.action} ` : 'Todos los indicadores están en meta. ') +
    list.filter((i) => i.status === 'critico' || i.status === 'atencion').map((i) => `${i.label}: ${i.value}. ${STATUS_LABEL[i.status]}.`).join(' ');
  return (
    <Section title="Indicadores para decidir" actions={<SpeakButton text={speech} id={`decidir-${s.day}`} label="Escuchar análisis" />}>
      {top ? (
        <div className={`reco reco-${top.status}`}>
          <Icon name="alert" size={20} />
          <div>
            <strong>Recomendación del día: {top.label.toLowerCase()}</strong>
            <p>{top.action}</p>
          </div>
          <button type="button" className="btn-primary btn-sm" onClick={() => navigate(top.route)}>
            Resolver
          </button>
        </div>
      ) : (
        <p className="notice notice-ok">Todos los indicadores están en meta. Cierra el día y sigue atento a los cambios.</p>
      )}
      <div className="indicators">
        {list.map((i) => (
          <article key={i.id} className={`indicator ind-${i.status}`}>
            <header>
              <span className="ind-label">{i.label}</span>
              <span className={`chip ind-chip-${i.status}`}>{STATUS_LABEL[i.status]}</span>
            </header>
            <strong className="ind-value">{i.value}</strong>
            <span className="muted small">{i.target}</span>
            <details>
              <summary>Qué significa y qué hacer</summary>
              <p className="small">{i.meaning}</p>
              <p className="small">
                <strong>Decisión:</strong> {i.action}
              </p>
              <button type="button" className="btn-ghost btn-sm" onClick={() => navigate(i.route)}>
                Ir <Icon name="arrowRight" size={14} />
              </button>
            </details>
          </article>
        ))}
      </div>
    </Section>
  );
}
