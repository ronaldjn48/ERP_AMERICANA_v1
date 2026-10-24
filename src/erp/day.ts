// Cierre del día: avanza el reloj de la empresa y genera la actividad del mercado de forma determinista
// (misma semilla y mismas acciones = mismos eventos). Después ejecuta las reglas de automatización activas.

import { cop } from '../engine/format';
import { Rng } from '../engine/rng';
import { getScenario } from '../engine/scenarios';
import { paidClicks, priceFactor } from '../engine/simulation';
import { balanceOf, incomeStatement } from './accounts';
import {
  GATEWAY_FEE,
  addLog,
  approvePurchaseOrder,
  available,
  confirmSalesOrder,
  createPurchaseOrder,
  createSalesOrder,
  dispatchSalesOrder,
  invoiceSalesOrder,
  mutate,
  nextId,
  nextNumber,
  notify,
  orderTotals,
  post,
  purchaseTotals,
  saveCustomer,
  sendReminder,
} from './ops';
import { CITIES, FIRST_NAMES, LAST_NAMES, dateOf } from './seed';
import type { DaySummary, ErpState, OrderLine } from './types';

export const MONTHLY_COSTS = [
  { account: '5105', label: 'Nómina del equipo comercial y de servicio', value: 3200000 },
  { account: '5120', label: 'Arriendo de bodega y oficina', value: 1200000 },
  { account: '5135', label: 'Servicios públicos, internet y plataforma de la tienda', value: 600000 },
];

const CPC = { meta: 750, tiktok: 420 };
const MAX_DAILY_CLICKS = { meta: 900, tiktok: 800 };
const CONV = { meta: 0.022, tiktok: 0.015 };

function poisson(rng: Rng, lambda: number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-Math.min(lambda, 30));
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng.next();
  } while (p > L && k < 60);
  return k - 1;
}

export function closeDay(s: ErpState): ErpState {
  return mutate(s, (d) => {
    const rng = new Rng(d.rng);
    const scenario = getScenario(d.scenarioId);
    const intensity = d.settings.marketIntensity;
    const summary: DaySummary = { day: d.day, webOrders: 0, quotes: 0, leads: 0, cases: 0, payments: 0, paymentsValue: 0, readyPOs: 0, ruleRuns: 0, stockouts: 0, monthlyClose: false };

    // --- 1. Pauta digital del día que termina.
    const campaignClicks: Array<{ id: string; clicks: number; channel: 'meta' | 'tiktok' }> = [];
    for (const c of d.campaigns.filter((x) => x.active)) {
      const clicks = Math.round(paidClicks(c.dailyBudget, CPC[c.channel], MAX_DAILY_CLICKS[c.channel]));
      c.spend += c.dailyBudget;
      c.clicks += clicks;
      c.daysRun += 1;
      campaignClicks.push({ id: c.id, clicks, channel: c.channel });
      post(d, `Pauta digital "${c.name}" del día ${d.day}`, c.name, [
        { account: '5235', debit: c.dailyBudget, credit: 0 },
        { account: '1110', debit: 0, credit: c.dailyBudget },
      ]);
    }

    // --- 2. Avanza el reloj.
    d.day += 1;
    const month = dateOf(d, d.day).getMonth();
    const season = scenario.seasonality[month];

    // --- 3. Pedidos de la tienda virtual.
    const published = d.products.filter((p) => p.webPublished && p.active);
    const paidOrders = campaignClicks.map((c) => ({ ...c, orders: c.clicks * CONV[c.channel] }));
    const expectedPaid = paidOrders.reduce((a, c) => a + c.orders, 0);
    for (const p of published) {
      const share = p.demandShare / Math.max(0.3, published.reduce((a, x) => a + x.demandShare, 0));
      const organic = 2.6 * intensity * season * share * Math.min(1, published.length / 3 + 0.34);
      const paid = expectedPaid * share;
      const pf = priceFactor(p.price, p.refPrice, scenario.elasticity);
      const n = poisson(rng, (organic + paid) * pf);
      for (let i = 0; i < n; i++) {
        const qty = rng.next() < 0.75 ? 1 : 2;
        const lines: OrderLine[] = [{ productId: p.id, qty, price: p.price, discount: 0 }];
        // Venta cruzada: a veces el cliente agrega otro producto publicado.
        const other = published.filter((x) => x.id !== p.id);
        if (other.length && rng.next() < 0.2) lines.push({ productId: rng.pick(other).id, qty: 1, price: 0, discount: 0 });
        lines.forEach((l) => (l.price = d.products.find((x) => x.id === l.productId)!.price));
        let customerId: string;
        const webCustomers = d.customers.filter((c) => c.segment === 'Minorista' && c.active);
        if (webCustomers.length > 4 && rng.next() < 0.3) customerId = rng.pick(webCustomers).id;
        else {
          const name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)} ${rng.pick(LAST_NAMES)}`;
          const doc = String(rng.int(1001000000, 1149999999));
          const next = saveCustomer(
            d,
            {
              name,
              docType: 'CC',
              docNumber: doc,
              city: rng.pick(CITIES),
              segment: 'Minorista',
              email: `${name.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}${rng.int(10, 99)}@correo.co`,
              phone: `3${rng.int(0, 2)}${rng.int(10000000, 99999999)}`,
              creditLimit: 0,
              paymentTerm: 0,
            },
            'sistema',
          );
          Object.assign(d, next);
          customerId = d.customers[d.customers.length - 1].id;
        }
        const totalClicks = campaignClicks.reduce((a, c) => a + c.clicks, 0);
        const fromCampaign = paid > 0 && rng.next() < paid / (organic + paid);
        let campaignId: string | null = null;
        if (fromCampaign && totalClicks > 0) {
          let r = rng.next() * totalClicks;
          for (const c of campaignClicks) {
            r -= c.clicks;
            if (r <= 0) {
              campaignId = c.id;
              break;
            }
          }
          campaignId = campaignId ?? campaignClicks[0].id;
          const camp = d.campaigns.find((x) => x.id === campaignId);
          if (camp) camp.orders += 1;
        }
        Object.assign(d, createSalesOrder(d, { customerId, lines, channel: 'web', campaignId, notes: 'Pedido recibido en la tienda virtual.' }, 'sistema'));
        const order = d.salesOrders[d.salesOrders.length - 1];
        Object.assign(d, confirmSalesOrder(d, order.id, 'sistema'));
        summary.webOrders += 1;
      }
    }

    // --- 4. Solicitudes de cotización de clientes empresariales.
    const b2b = d.customers.filter((c) => c.segment !== 'Minorista' && c.active);
    if (b2b.length && rng.next() < 0.35 * intensity) {
      const c = rng.pick(b2b);
      const products = d.products.filter((p) => p.active);
      const k = Math.min(products.length, rng.int(1, 3));
      const chosen = [...products].sort(() => rng.next() - 0.5).slice(0, k);
      const lines = chosen.map((p) => ({ productId: p.id, qty: rng.int(4, 20), price: p.price, discount: c.segment === 'Mayorista' ? 0.05 : 0 }));
      Object.assign(d, createSalesOrder(d, { customerId: c.id, lines, channel: 'directo', notes: 'Solicitud de cotización recibida por correo.' }, 'sistema'));
      summary.quotes += 1;
      notify(d, 'ventas', 'info', `${c.name} pidió una cotización. Revísala y confírmala.`, { module: 'ventas', id: d.salesOrders[d.salesOrders.length - 1].id });
    }

    // --- 5. Nuevas oportunidades comerciales.
    if (rng.next() < 0.3 * intensity) {
      const sources = ['web', 'referido', 'feria', 'redes', 'llamada'] as const;
      const contact = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
      const companies = ['Colegio Bilingüe Horizonte', 'Constructora Bases Firmes', 'Restaurante Sabor de Casa', 'Gimnasio Energía Fit', 'Agencia de Viajes Rutas de Colombia', 'Droguería Vida Plena'];
      const company = rng.pick(companies);
      d.opportunities.push({
        id: nextId(d, 'opo'),
        name: `Compra corporativa · ${company}`,
        customerId: null,
        contactName: `${contact} · ${company}`,
        value: rng.int(15, 90) * 100000,
        stage: 'prospecto',
        source: rng.pick(sources),
        createdDay: d.day,
        closedDay: null,
        salesOrderId: null,
        origin: 'sistema',
        notes: 'Prospecto generado por el mercado.',
      });
      summary.leads += 1;
    }

    // --- 6. Casos de servicio.
    const backorders = d.salesOrders.filter((o) => o.status === 'confirmado' && d.day - o.day >= 2);
    const caseProb = 0.22 * intensity + (backorders.length > 0 ? 0.25 : 0);
    if (rng.next() < caseProb) {
      const late = backorders.length > 0 && rng.next() < 0.6;
      const o = late ? rng.pick(backorders) : null;
      const customers = d.customers.filter((c) => c.active);
      const customerId = o ? o.customerId : rng.pick(customers).id;
      const subjects = [
        'Pregunta por los tiempos de entrega a otra ciudad',
        'Solicita cambio de talla o referencia',
        'Pide copia de la factura electrónica',
        'Reporta que el producto llegó con el empaque dañado',
        'Consulta por garantía del producto',
      ];
      d.cases.push({
        id: nextId(d, 'cas'),
        number: nextNumber(d, 'CS'),
        customerId,
        subject: o ? `Reclama por el pedido ${o.number}, que no ha sido despachado` : rng.pick(subjects),
        priority: o ? 'alta' : rng.next() < 0.3 ? 'media' : 'baja',
        status: 'abierto',
        channel: rng.pick(['correo', 'whatsapp', 'telefono', 'web'] as const),
        openedDay: d.day,
        resolvedDay: null,
        resolution: '',
        origin: 'sistema',
      });
      summary.cases += 1;
      if (o) notify(d, 'crm', 'alerta', `Reclamo de alta prioridad por el pedido ${o.number} sin despachar.`, { module: 'crm', view: 'casos' });
    }

    // --- 7. Pagos de clientes a crédito.
    for (const o of d.salesOrders.filter((x) => x.status === 'facturado' && x.dueDay !== null)) {
      const overdue = d.day - (o.dueDay ?? d.day);
      // Sin gestión, el cliente con factura vencida paga despacio; cada recordatorio aumenta la probabilidad de pago.
      const p = overdue < 0 ? 0.04 : overdue === 0 ? 0.15 : 0.1 + 0.3 * o.reminders;
      if (rng.next() < Math.min(0.9, p)) {
        const { total } = orderTotals(o.lines, d.settings.ivaRate);
        o.status = 'pagado';
        o.paidDay = d.day;
        post(d, `Pago recibido por transferencia de ${o.invoiceNumber}`, o.invoiceNumber ?? o.number, [
          { account: '1110', debit: total, credit: 0 },
          { account: '1305', debit: 0, credit: total },
        ]);
        summary.payments += 1;
        summary.paymentsValue += total;
        // Un pago de factura vencida que llega después de un recordatorio es un cobro gestionado.
        if (overdue > 0 && o.reminders > 0) d.stats.cartera_vencida_cobrada = (d.stats.cartera_vencida_cobrada ?? 0) + 1;
        addLog(d, 'ventas', 'exito', `El cliente pagó ${o.invoiceNumber} por ${cop(total)}.`, o.id);
      }
    }

    // --- 8. Órdenes de compra que llegan hoy.
    for (const po of d.purchaseOrders.filter((x) => x.status === 'aprobada' && x.expectedDay === d.day)) {
      summary.readyPOs += 1;
      notify(d, 'compras', 'info', `La mercancía de ${po.number} llegó a la bodega. Regístrala con "Recibir".`, { module: 'compras', id: po.id });
    }

    // --- 9. Cierre mensual de gastos fijos (cada 30 días).
    if ((d.day - 1) % 30 === 0) {
      summary.monthlyClose = true;
      for (const m of MONTHLY_COSTS) {
        post(d, `${m.label} (cierre del mes)`, 'Cierre mensual', [
          { account: m.account, debit: m.value, credit: 0 },
          { account: '1110', debit: 0, credit: m.value },
        ]);
      }
      const r = incomeStatement(d.journal, d.day - 30, d.day).operatingProfit;
      notify(d, 'contabilidad', r >= 0 ? 'exito' : 'alerta', `Cierre del mes: utilidad operacional de ${cop(r)}. Revisa el estado de resultados.`, { module: 'contabilidad', view: 'estados' });
      d.stats.meses_cerrados = (d.stats.meses_cerrados ?? 0) + 1;
      if (r > 0) d.stats.mes_con_utilidad = (d.stats.mes_con_utilidad ?? 0) + 1;
    }

    // --- 10. Automatizaciones.
    summary.ruleRuns = runRules(d);

    // --- 11. Indicadores del día.
    summary.stockouts = d.products.filter((p) => p.active && available(p) < 0).length;
    if (summary.stockouts > 0) notify(d, 'inventario', 'alerta', `${summary.stockouts} producto(s) con pedidos confirmados sin inventario suficiente.`, { module: 'inventario' });
    if (balanceOf(d.journal, '1110') < 0) notify(d, 'contabilidad', 'error', 'El saldo en bancos quedó negativo. Cobra cartera o reduce gastos.', { module: 'contabilidad', view: 'estados' });

    d.stats.dias_cerrados = (d.stats.dias_cerrados ?? 0) + 1;
    if (summary.stockouts === 0 && d.cases.every((c) => c.status === 'resuelto' || d.day - c.openedDay <= 2)) {
      d.stats.racha_operativa = (d.stats.racha_operativa ?? 0) + 1;
    } else d.stats.racha_operativa = 0;
    d.stats.mejor_racha = Math.max(d.stats.mejor_racha ?? 0, d.stats.racha_operativa ?? 0);
    d.lastDay = summary;
    const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
    addLog(d, 'inicio', 'info', `Inicio del día ${d.day}: ${n(summary.webOrders, 'pedido web', 'pedidos web')}, ${n(summary.quotes, 'cotización', 'cotizaciones')}, ${n(summary.leads, 'oportunidad', 'oportunidades')}, ${n(summary.cases, 'caso', 'casos')} y ${n(summary.payments, 'pago', 'pagos')}.`);
    d.rng = rng.state;
  });
}

/** Ejecuta las reglas activas y devuelve cuántas acciones realizaron. */
function runRules(d: ErpState): number {
  let runs = 0;
  const apply = (fn: () => ErpState): boolean => {
    try {
      Object.assign(d, fn());
      return true;
    } catch {
      return false;
    }
  };
  for (const rule of d.rules.filter((r) => r.active)) {
    let n = 0;
    switch (rule.type) {
      case 'despacho_auto': {
        for (const o of d.salesOrders.filter((x) => x.status === 'confirmado' && (!rule.params.soloWeb || x.channel === 'web'))) {
          if (apply(() => dispatchSalesOrder(d, o.id, 'automatizacion'))) n++;
        }
        break;
      }
      case 'factura_web': {
        for (const o of d.salesOrders.filter((x) => x.status === 'despachado' && x.channel === 'web')) {
          if (apply(() => invoiceSalesOrder(d, o.id, 'automatizacion'))) n++;
        }
        break;
      }
      case 'reorden': {
        for (const p of d.products.filter((x) => x.active && x.reorderPoint > 0 && x.reorderQty > 0)) {
          const open = d.purchaseOrders.some((po) => (po.status === 'borrador' || po.status === 'aprobada') && po.lines.some((l) => l.productId === p.id));
          if (open || available(p) > p.reorderPoint) continue;
          if (apply(() => createPurchaseOrder(d, { supplierId: p.supplierId, lines: [{ productId: p.id, qty: p.reorderQty, cost: p.cost }], notes: `Generada por la regla de reabastecimiento: disponible ${available(p)} ≤ punto de reorden ${p.reorderPoint}.` }, 'automatizacion'))) {
            n++;
            const po = d.purchaseOrders[d.purchaseOrders.length - 1];
            const { total } = purchaseTotals(po.lines, d.settings.ivaRate);
            if (total <= (rule.params.aprobarHasta ?? 0)) apply(() => approvePurchaseOrder(d, po.id, 'automatizacion'));
            else notify(d, 'compras', 'info', `La regla creó ${po.number} en borrador: supera el monto de aprobación automática.`, { module: 'compras', id: po.id });
          }
        }
        break;
      }
      case 'recordatorio_cobro': {
        for (const o of d.salesOrders.filter((x) => x.status === 'facturado' && x.dueDay !== null && d.day - x.dueDay >= (rule.params.diasVencida ?? 1))) {
          if (o.reminders >= 3) continue;
          if (apply(() => sendReminder(d, o.id, 'automatizacion'))) n++;
        }
        break;
      }
      case 'escalar_casos': {
        for (const c of d.cases.filter((x) => x.status !== 'resuelto' && x.priority !== 'alta' && d.day - x.openedDay >= (rule.params.diasAbierto ?? 2))) {
          c.priority = 'alta';
          notify(d, 'crm', 'alerta', `El caso ${c.number} se escaló a prioridad alta por tiempo sin respuesta.`, { module: 'crm', view: 'casos' });
          n++;
        }
        break;
      }
      case 'pausar_campana': {
        for (const c of d.campaigns.filter((x) => x.active && x.daysRun >= (rule.params.diasMinimos ?? 3))) {
          const roas = c.spend > 0 ? c.revenue / c.spend : 0;
          if (roas < (rule.params.roasMinimo ?? 2)) {
            c.active = false;
            notify(d, 'ecommerce', 'alerta', `La campaña "${c.name}" se pausó: ROAS ${roas.toFixed(2).replace('.', ',')} por debajo del mínimo.`, { module: 'ecommerce', view: 'campanas' });
            n++;
          }
        }
        break;
      }
      case 'correo_confirmacion':
        // Se ejecuta en el momento de confirmar cada pedido.
        break;
    }
    if (n > 0) {
      rule.runs += n;
      rule.lastRunDay = d.day;
      addLog(d, 'automatizacion', 'exito', `Regla "${rule.name}" ejecutó ${n} ${n === 1 ? 'acción' : 'acciones'}.`, rule.id);
      d.stats.reglas_ejecutadas = (d.stats.reglas_ejecutadas ?? 0) + n;
      runs += n;
    }
  }
  return runs;
}

export { GATEWAY_FEE };
