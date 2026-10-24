// Indicadores para decidir: cada uno compara la operación con una meta, explica qué significa y qué hacer.
import { cop, pct } from '../engine/format';
import { balanceOf, incomeStatement } from './accounts';
import { MONTHLY_COSTS } from './day';
import { GATEWAY_FEE, available, orderTotals } from './ops';
import type { Route } from './store';
import type { ErpState } from './types';

export type IndicatorStatus = 'bien' | 'atencion' | 'critico' | 'sin-datos';

export interface Indicator {
  id: string;
  label: string;
  value: string;
  target: string;
  status: IndicatorStatus;
  meaning: string;
  action: string;
  route: Route;
}

const MONTHLY_FIXED = MONTHLY_COSTS.reduce((a, m) => a + m.value, 0);

export function decisionIndicators(s: ErpState): Indicator[] {
  const out: Indicator[] = [];
  const orders = s.salesOrders.filter((o) => o.status !== 'anulado' && o.day >= 1);

  // 1. Despacho a tiempo (últimos 7 días): pedidos despachados máximo un día después de confirmarse.
  const recent = orders.filter((o) => o.day >= s.day - 7 && o.day < s.day && o.status !== 'cotizacion');
  const onTime = recent.filter((o) => o.dispatchDay !== null && o.dispatchDay - o.day <= 1).length;
  const ratio = recent.length ? onTime / recent.length : null;
  out.push({
    id: 'despacho',
    label: 'Despachos a tiempo (7 días)',
    value: ratio === null ? 'Sin pedidos' : pct(ratio, 0),
    target: 'Meta: 90 % o más',
    status: ratio === null ? 'sin-datos' : ratio >= 0.9 ? 'bien' : ratio >= 0.7 ? 'atencion' : 'critico',
    meaning: 'Porcentaje de pedidos despachados máximo un día después de confirmados. Mide el nivel de servicio que percibe el cliente.',
    action: 'Despacha los pedidos confirmados cada día, compra lo que falta y considera el despacho automático.',
    route: { module: 'ventas', view: 'despachar' },
  });

  // 2. Pedidos atrasados.
  const late = orders.filter((o) => o.status === 'confirmado' && s.day - o.day >= 2).length;
  out.push({
    id: 'atrasados',
    label: 'Pedidos atrasados',
    value: String(late),
    target: 'Meta: 0',
    status: late === 0 ? 'bien' : late <= 2 ? 'atencion' : 'critico',
    meaning: 'Pedidos confirmados que llevan dos días o más sin despacharse. Cada uno puede convertirse en un reclamo.',
    action: late ? 'Revisa si falta inventario: crea la orden de compra desde el pedido o habla con el cliente.' : 'Mantén la disciplina de despacho diario.',
    route: { module: 'ventas', view: 'despachar' },
  });

  // 3. Cartera vencida.
  const invoiced = s.salesOrders.filter((o) => o.status === 'facturado');
  const total = invoiced.reduce((a, o) => a + orderTotals(o.lines, s.settings.ivaRate).total, 0);
  const overdue = invoiced.filter((o) => o.dueDay !== null && o.dueDay < s.day).reduce((a, o) => a + orderTotals(o.lines, s.settings.ivaRate).total, 0);
  const share = total > 0 ? overdue / total : 0;
  out.push({
    id: 'cartera',
    label: 'Cartera vencida',
    value: cop(overdue),
    target: 'Meta: menos de 10 % de la cartera',
    status: overdue === 0 ? 'bien' : share < 0.2 ? 'atencion' : 'critico',
    meaning: `Facturas a crédito que ya pasaron su fecha de pago (${total > 0 ? pct(share, 0) : '0 %'} de la cartera). Es dinero vendido que todavía no entra a bancos.`,
    action: overdue ? 'Envía recordatorios y registra los pagos que confirmen los clientes. Revisa el cupo de quien paga tarde.' : 'Haz seguimiento a las facturas antes de que venzan.',
    route: { module: 'contabilidad', view: 'cartera' },
  });

  // 4. Margen bruto del mes.
  const month0 = Math.floor((s.day - 1) / 30) * 30 + 1;
  const is = incomeStatement(s.journal, month0, s.day);
  const gm = is.revenue > 0 ? is.grossProfit / is.revenue : null;
  out.push({
    id: 'margen',
    label: 'Margen bruto del mes',
    value: gm === null ? 'Sin ventas' : pct(gm, 1),
    target: 'Meta: 35 % o más',
    status: gm === null ? 'sin-datos' : gm >= 0.35 ? 'bien' : gm >= 0.25 ? 'atencion' : 'critico',
    meaning: 'Lo que queda de cada peso vendido después del costo de la mercancía. Con él se pagan nómina, arriendo, pauta y servicios.',
    action: 'Controla los descuentos, revisa precios frente al costo promedio y negocia mejores costos con los proveedores.',
    route: { module: 'contabilidad', view: 'estados' },
  });

  // 5. Cobertura de caja.
  const cash = balanceOf(s.journal, '1110');
  const months = cash / MONTHLY_FIXED;
  out.push({
    id: 'caja',
    label: 'Cobertura de caja',
    value: `${months.toLocaleString('es-CO', { maximumFractionDigits: 1 })} meses`,
    target: 'Meta: 2 meses de gastos fijos o más',
    status: months >= 2 ? 'bien' : months >= 1 ? 'atencion' : 'critico',
    meaning: `Cuántos meses de gastos fijos (${cop(MONTHLY_FIXED)} al mes) puede pagar la empresa con el saldo en bancos (${cop(cash)}).`,
    action: months >= 2 ? 'Puedes invertir en inventario o pauta, sin comprometer la liquidez.' : 'Cobra cartera, compra solo lo necesario y pausa la pauta que no sea rentable.',
    route: { module: 'contabilidad', view: 'estados' },
  });

  // 6. Rentabilidad de la pauta.
  const active = s.campaigns.filter((c) => c.active && c.daysRun >= 3);
  const published = s.products.filter((p) => p.webPublished && p.price > 0);
  const cm = published.length ? published.reduce((a, p) => a + (1 - p.cost / p.price - GATEWAY_FEE), 0) / published.length : 0;
  const be = cm > 0 ? 1 / cm : null;
  const worst = active.length ? Math.min(...active.map((c) => (c.spend > 0 ? c.revenue / c.spend : 0))) : null;
  out.push({
    id: 'roas',
    label: 'ROAS de la pauta activa',
    value: worst === null ? 'Sin campañas evaluables' : worst.toLocaleString('es-CO', { maximumFractionDigits: 2 }),
    target: be ? `Equilibrio: ${be.toLocaleString('es-CO', { maximumFractionDigits: 2 })}` : 'Equilibrio: 1 ÷ margen de contribución',
    status: worst === null || be === null ? 'sin-datos' : worst >= be * 1.2 ? 'bien' : worst >= be ? 'atencion' : 'critico',
    meaning: 'Pesos vendidos por cada peso de pauta en la campaña con peor resultado (con al menos 3 días). Por debajo del equilibrio, la pauta pierde dinero.',
    action: 'Factura los pedidos web para medir bien, ajusta el presupuesto o pausa la campaña que no supere el equilibrio.',
    route: { module: 'ecommerce', view: 'campanas' },
  });

  // 7. Abastecimiento.
  const shortage = s.products.filter((p) => p.active && available(p) < 0).length;
  const low = s.products.filter((p) => p.active && p.reorderPoint > 0 && available(p) <= p.reorderPoint).length;
  const noPolicy = s.products.filter((p) => p.active && p.reorderPoint === 0).length;
  out.push({
    id: 'abastecimiento',
    label: 'Abastecimiento',
    value: shortage ? `${shortage} con faltante` : low ? `${low} por reponer` : 'Sin faltantes',
    target: 'Meta: 0 productos con faltante',
    status: shortage ? 'critico' : low ? 'atencion' : 'bien',
    meaning: `Productos con pedidos sin inventario o bajo su punto de reorden.${noPolicy ? ` ${noPolicy} productos aún no tienen punto de reorden definido.` : ''}`,
    action: 'Crea órdenes de compra por lo que falta y define el punto de reorden con la demanda diaria y el tiempo de entrega.',
    route: { module: 'inventario' },
  });

  // 8. Servicio al cliente.
  const oldCases = s.cases.filter((c) => c.status !== 'resuelto' && s.day - c.openedDay >= 2).length;
  out.push({
    id: 'casos',
    label: 'Casos con más de 2 días',
    value: String(oldCases),
    target: 'Meta: 0',
    status: oldCases === 0 ? 'bien' : oldCases <= 2 ? 'atencion' : 'critico',
    meaning: 'Solicitudes y reclamos de clientes sin resolver por dos días o más. Afectan la reputación y la recompra.',
    action: 'Resuelve primero los casos de prioridad alta y registra la solución dada al cliente.',
    route: { module: 'crm', view: 'casos' },
  });
  return out;
}

const RANK: Record<IndicatorStatus, number> = { critico: 0, atencion: 1, bien: 2, 'sin-datos': 3 };

/** La recomendación más urgente del día. */
export function topRecommendation(s: ErpState): Indicator | null {
  const list = decisionIndicators(s).filter((i) => i.status === 'critico' || i.status === 'atencion');
  return list.sort((a, b) => RANK[a.status] - RANK[b.status])[0] ?? null;
}
