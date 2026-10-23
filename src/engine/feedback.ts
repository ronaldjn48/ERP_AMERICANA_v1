import { ADMIN_AUTOMATED_RATE, ADMIN_MANUAL_RATE, AUTOMATION_COSTS, GATEWAY_FEE } from './config';
import { cop, num, pct, pesosHabla, pctHabla, dec } from './format';
import { MONTHS } from './scenarios';
import { forecastDemand, importUnitCost } from './simulation';
import type { Decisions, Feedback, FeedbackLevel, PeriodResult, Scenario, SimConfig, SimState } from './types';

const LEVEL_ORDER: Record<FeedbackLevel, number> = { critico: 0, alerta: 1, logro: 2, info: 3 };

/** Analiza el mes simulado y explica qué pasó, por qué y qué concepto aplicar. */
export function analyzePeriod(r: PeriodResult, scenario: Scenario, config: SimConfig, prev?: PeriodResult): Feedback[] {
  const out: Feedback[] = [];
  const d = r.decisions;
  const m = config.modules;

  if (r.bankrupt) {
    out.push({
      id: 'quiebra',
      level: 'critico',
      module: 'finanzas',
      title: 'La empresa entró en liquidación',
      message: `El patrimonio quedó en ${cop(r.equity)}: las deudas superan los activos. Una empresa puede vender y aun así quebrar si consume la caja en inventario, pauta o gastos fijos que no recupera.`,
      concept: 'Patrimonio = activos − pasivos',
    });
  }

  if (r.lostUnits > 0 && r.fillRate < 0.97) {
    const lostRevenue = r.lostUnits * d.price;
    out.push({
      id: 'quiebre',
      level: r.fillRate < 0.85 ? 'critico' : 'alerta',
      module: 'erp',
      title: `Quiebre de inventario: faltaron ${num(r.lostUnits)} ${scenario.unitName}`,
      message: `Atendiste el ${pct(r.fillRate)} de la demanda. Dejaste de vender cerca de ${cop(Math.max(0, lostRevenue))} y los clientes insatisfechos bajan la recompra. Planea el inventario con el pronóstico del próximo mes más un stock de seguridad de 15 % a 25 %.`,
      concept: 'Nivel de servicio y stock de seguridad',
    });
  }

  if (r.rejectedUnits > 0) {
    out.push({
      id: 'fondos',
      level: 'critico',
      module: 'finanzas',
      title: `El proveedor no despachó ${num(r.rejectedUnits)} ${scenario.unitName}`,
      message: 'No tenías caja ni cupo de sobregiro para pagar toda la compra. Revisa el flujo de caja antes de comprar y, si la compra es rentable, solicita un préstamo a tiempo: es más barato que el sobregiro.',
      concept: 'Flujo de caja y capital de trabajo',
    });
  }

  if (r.overdraft > 0 && !r.bankrupt) {
    out.push({
      id: 'sobregiro',
      level: 'critico',
      module: 'finanzas',
      title: `Usaste sobregiro por ${cop(r.overdraft)}`,
      message: 'La caja no alcanzó para cubrir compras y gastos. El sobregiro cobra la tasa más alta del sistema y baja tu calificación de liquidez. Reduce compras innecesarias, aplaza gastos o toma un préstamo planeado.',
      concept: 'Liquidez',
    });
  }

  if (r.kpis.inventoryDays !== null && r.kpis.inventoryDays > 60) {
    out.push({
      id: 'exceso',
      level: r.kpis.inventoryDays > 120 ? 'critico' : 'alerta',
      module: 'erp',
      title: `Inventario para ${num(r.kpis.inventoryDays)} días`,
      message: `Tienes ${num(r.endInventory)} ${scenario.unitName} (${cop(r.inventoryValue)}) para una venta mensual de ${num(r.unitsSold)}. El costo de almacenar y la obsolescencia sumaron ${cop(r.costs.holding)} este mes y esa plata quedó inmovilizada.`,
      concept: 'Rotación de inventario',
    });
  }

  if (r.serviceRatio < 1) {
    const needed = Math.ceil((r.newOrders + r.repeatOrders) / scenario.ordersPerAgent);
    out.push({
      id: 'servicio',
      level: r.serviceRatio < 0.8 ? 'critico' : 'alerta',
      module: 'crm',
      title: 'La capacidad de atención no alcanzó',
      message: `Tu equipo atiende hasta ${num(r.serviceCapacity)} pedidos y llegaron ${num(r.newOrders + r.repeatOrders)}. Sin chatbot necesitas cerca de ${needed} asesores. Las demoras bajan la satisfacción y aumentan la fuga de clientes.`,
      concept: 'Capacidad de servicio en el CRM',
    });
  } else if (r.serviceRatio > 1.8 && d.agents > 1 && m.crm) {
    out.push({
      id: 'ocioso',
      level: 'info',
      module: 'crm',
      title: 'Capacidad de atención ociosa',
      message: `Tu equipo puede atender ${num(r.serviceCapacity)} pedidos y solo llegaron ${num(r.newOrders + r.repeatOrders)}. Cada asesor cuesta ${cop(scenario.agentSalary)} al mes: ajusta el equipo a la demanda pronosticada.`,
      concept: 'Productividad',
    });
  }

  const be = r.kpis.breakEvenRoas;
  if (be !== null && m.ecommerce) {
    const channels: Array<['Meta Ads' | 'TikTok Ads', number | null, number]> = [
      ['Meta Ads', r.kpis.roasMeta, d.metaBudget],
      ['TikTok Ads', r.kpis.roasTiktok, d.tiktokBudget],
    ];
    for (const [name, roas, budget] of channels) {
      if (roas === null || budget <= 0) continue;
      if (roas < be * 0.9) {
        out.push({
          id: `roas-${name}`,
          level: roas < be * 0.6 ? 'critico' : 'alerta',
          module: 'ecommerce',
          title: `${name}: ROAS de ${dec(roas)} por debajo del equilibrio (${dec(be)})`,
          message: `Con tu margen de contribución, cada peso en pauta debe traer al menos ${dec(be)} pesos en ventas. ${name} trajo ${dec(roas)}. Los primeros pesos rinden más que los últimos: reduce el presupuesto, revisa el precio o mejora la conversión de la tienda.`,
          concept: 'ROAS de equilibrio = 1 ÷ margen de contribución',
        });
      } else if (roas >= be * 1.3) {
        out.push({
          id: `roas-${name}`,
          level: 'logro',
          module: 'ecommerce',
          title: `${name} es rentable: ROAS ${dec(roas)}`,
          message: `Superas el ROAS de equilibrio (${dec(be)}). Puedes probar un aumento gradual del presupuesto y vigilar que el ROAS no caiga por rendimientos decrecientes.`,
          concept: 'Retorno de la inversión publicitaria',
        });
      }
    }
  }

  const refPrice = scenario.refPrice * (r.event?.id === 'competidor_promo' ? (r.event.data?.factor ?? 1) : 1);
  if (m.erp && d.price > refPrice * 1.15) {
    out.push({
      id: 'precio-alto',
      level: 'alerta',
      module: 'erp',
      title: `Precio ${pct(d.price / refPrice - 1, 0)} por encima del mercado`,
      message: `La demanda de ${scenario.product} es elástica (elasticidad ${dec(scenario.elasticity)}): un precio alto reduce la conversión y la satisfacción. Compara la utilidad total, no solo el margen por unidad.`,
      concept: 'Elasticidad precio de la demanda',
    });
  } else if (m.erp && d.price < refPrice * 0.85) {
    out.push({
      id: 'precio-bajo',
      level: 'alerta',
      module: 'erp',
      title: `Precio ${pct(1 - d.price / refPrice, 0)} por debajo del mercado`,
      message: `Ganas ${cop(r.kpis.contributionPerUnit)} de contribución por unidad. Vender más con un margen mínimo exige más inventario, más asesores y más caja. Verifica que el volumen extra compense el margen perdido.`,
      concept: 'Margen de contribución',
    });
  }

  if (r.netIncome < 0 && !r.bankrupt) {
    const drivers = Object.entries(r.costs)
      .filter(([k]) => k !== 'cogs')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${COST_LABELS[k as keyof typeof COST_LABELS]} (${cop(v)})`)
      .join(', ');
    out.push({
      id: 'perdida',
      level: 'critico',
      module: 'finanzas',
      title: `Pérdida neta de ${cop(-r.netIncome)}`,
      message: `Los gastos operativos más altos fueron: ${drivers}. Revisa cuáles generan ventas y cuáles se pueden ajustar.`,
      concept: 'Estado de resultados',
    });
  }

  if (prev && r.satisfaction < prev.satisfaction - 4) {
    out.push({
      id: 'satisfaccion',
      level: 'alerta',
      module: 'crm',
      title: `La satisfacción bajó a ${num(r.satisfaction)} de 100`,
      message: `Perdiste ${num(r.churnedCustomers)} clientes este mes. Las causas típicas son quiebres de inventario, demoras en la atención y precios por encima del mercado.`,
      concept: 'Retención de clientes',
    });
  } else if (r.satisfaction >= 75) {
    out.push({
      id: 'satisfaccion',
      level: 'logro',
      module: 'crm',
      title: `Clientes satisfechos: ${num(r.satisfaction)} de 100`,
      message: `La base activa llegó a ${num(r.customers)} clientes. Una satisfacción alta reduce la fuga y aumenta la recompra.`,
      concept: 'Valor del cliente en el tiempo',
    });
  }

  if (m.automatizacion) {
    const manualAdmin = r.revenue * ADMIN_MANUAL_RATE;
    const automatedAdmin = r.revenue * ADMIN_AUTOMATED_RATE + AUTOMATION_COSTS.eInvoicing.monthly;
    if (!d.automation.eInvoicing && manualAdmin - automatedAdmin > 300000) {
      out.push({
        id: 'auto-factura',
        level: 'info',
        module: 'automatizacion',
        title: 'La facturación integrada ya se pagaría sola',
        message: `Los procesos manuales de facturación y conciliación te costaron ${cop(manualAdmin)}. Integrados al ERP costarían cerca de ${cop(automatedAdmin)} al mes, más una implementación única de ${cop(AUTOMATION_COSTS.eInvoicing.setup)}.`,
        concept: 'Automatización de procesos',
      });
    }
    if (!d.automation.autoReorder && r.lostUnits > 0 && r.fillRate < 0.9) {
      out.push({
        id: 'auto-reorden',
        level: 'info',
        module: 'automatizacion',
        title: 'Considera la reposición automática',
        message: 'El ERP puede comprar solo cuando el inventario cae por debajo del punto de reorden. Define el punto de reorden con la demanda pronosticada y el stock de seguridad.',
        concept: 'Punto de reorden',
      });
    }
  }

  if (m.erp && scenario.importCostUSD !== null && d.purchaseImport === 0) {
    const imp = importUnitCost(scenario, r.trm);
    if (imp !== null) {
      const volume = Math.max(r.unitsSold, 1);
      const landed = imp + scenario.importFixedCost / volume;
      if (landed < scenario.localCost * 0.93) {
        out.push({
          id: 'importar',
          level: 'info',
          module: 'erp',
          title: 'Importar podría bajar tu costo',
          message: `Con la TRM de ${num(r.trm)}, un pedido de ${num(volume)} ${scenario.unitName} costaría ${cop(landed)} por unidad nacionalizada contra ${cop(scenario.localCost)} del proveedor local. Recuerda que llega al mes siguiente y que la TRM puede cambiar.`,
          concept: 'Costo nacionalizado',
        });
      }
    }
  }

  if (r.event?.id === 'cliente_corporativo' && r.eventChoice === 'aceptar' && r.corporateUnits > 0) {
    const failed = r.unitsSold < r.demandUnits;
    out.push({
      id: 'corporativo',
      level: failed ? 'alerta' : 'logro',
      module: 'crm',
      title: failed ? 'No cumpliste completo el pedido corporativo' : 'Cumpliste el pedido corporativo',
      message: failed
        ? 'Aceptaste el pedido sin inventario suficiente. Incumplir a un cliente corporativo afecta la reputación de la marca.'
        : `Vendiste ${num(r.corporateUnits)} ${scenario.unitName} adicionales con descuento sin pagar comisión de pasarela.`,
      concept: 'Ventas B2B',
    });
  }

  if (r.event) {
    out.push({
      id: 'evento',
      level: 'info',
      module: r.event.module,
      title: `Lección del evento: ${r.event.title}`,
      message: r.event.lesson,
    });
  }

  if (r.score.total >= 85) {
    out.push({
      id: 'excelente',
      level: 'logro',
      module: 'finanzas',
      title: `Mes sobresaliente: ${(r.score.total / 20).toFixed(1).replace('.', ',')} sobre 5`,
      message: 'Equilibraste rentabilidad, liquidez, clientes y procesos. Mantén la disciplina de pronosticar antes de decidir.',
    });
  }

  return out.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]).slice(0, 8);
}

export const COST_LABELS = {
  cogs: 'Costo de ventas',
  marketing: 'Pauta digital',
  salaries: 'Asesores de servicio',
  fixed: 'Gastos fijos',
  shipping: 'Envíos gratis',
  gatewayFees: 'Comisión de pasarela',
  admin: 'Procesos administrativos',
  holding: 'Almacenamiento y obsolescencia',
  automation: 'Automatizaciones',
  ux: 'Mejoras de la tienda',
  importLogistics: 'Flete y agenciamiento',
  interest: 'Intereses',
} as const;

/** Resumen hablado del mes. Oraciones cortas para que la voz sintética suene natural. */
export function periodSpeech(r: PeriodResult, scenario: Scenario, feedback: Feedback[]): string {
  const parts = [
    `Resultados de ${MONTHS[r.month]}.`,
    `Vendiste ${num(r.unitsSold)} ${scenario.unitName} y facturaste ${pesosHabla(r.revenue)}.`,
    r.netIncome >= 0
      ? `La utilidad neta fue de ${pesosHabla(r.netIncome)}.`
      : `Tuviste una pérdida de ${pesosHabla(-r.netIncome)}.`,
    `Atendiste el ${pctHabla(r.fillRate)} de la demanda.`,
    `La caja cerró en ${pesosHabla(r.cashEnd)}.`,
    `Tu puntaje del mes fue ${Math.round(r.score.total)} de 100.`,
  ];
  const important = feedback.filter((f) => f.level === 'critico' || f.level === 'alerta').slice(0, 2);
  if (important.length > 0) {
    parts.push('Puntos a revisar.');
    important.forEach((f) => parts.push(`${f.title}.`));
  } else {
    parts.push('No hay alertas críticas este mes.');
  }
  return parts.join(' ');
}

export interface Hint {
  id: string;
  module: Feedback['module'];
  title: string;
  value: string;
  explanation: string;
}

/** Ayudas del modo guiado: pronóstico y cálculos de referencia antes de decidir. */
export function buildHints(state: SimState, d: Decisions, scenario: Scenario, config: SimConfig): Hint[] {
  const hints: Hint[] = [];
  const forecast = forecastDemand(state, scenario);
  const arriving = state.pipeline.filter((p) => p.arrivesAt <= state.period + 1).reduce((a, p) => a + p.units, 0);
  const note = scenario.seasonNotes[state.month];
  hints.push({
    id: 'pronostico',
    module: 'erp',
    title: `Pronóstico de demanda para ${MONTHS[state.month]}`,
    value: `${num(forecast)} ${scenario.unitName}`,
    explanation:
      (state.history.length > 0
        ? 'Demanda del último mes ajustada por el índice estacional.'
        : 'Demanda de referencia del mercado ajustada por el índice estacional.') +
      (note ? ` ${note}` : '') +
      ' Un cambio de precio o de pauta mueve este número.',
  });
  if (config.modules.erp) {
    const suggested = Math.max(0, Math.round(forecast * 1.2 - state.inventory - arriving));
    hints.push({
      id: 'compra',
      module: 'erp',
      title: 'Compra sugerida para cubrir el mes',
      value: `${num(suggested)} ${scenario.unitName}`,
      explanation: `Pronóstico × 1,2 (stock de seguridad) − inventario actual (${num(state.inventory)})${arriving > 0 ? ` − importación que llega (${num(arriving)})` : ''}.`,
    });
    const imp = importUnitCost(scenario, state.trm);
    if (imp !== null) {
      hints.push({
        id: 'importacion',
        module: 'erp',
        title: 'Costo unitario importado con la TRM actual',
        value: cop(imp),
        explanation: `USD ${scenario.importCostUSD} × TRM ${num(state.trm)} × (1 + ${pct(scenario.tariff, 0)} de arancel y logística), más ${cop(scenario.importFixedCost)} fijos por embarque. Proveedor local: ${cop(scenario.localCost)}. Llega el mes siguiente.`,
      });
    }
  }
  if (config.modules.crm) {
    const agents = Math.ceil(forecast / scenario.unitsPerOrder / scenario.ordersPerAgent);
    hints.push({
      id: 'asesores',
      module: 'crm',
      title: 'Asesores necesarios',
      value: `${agents}`,
      explanation: `Pedidos esperados (${num(forecast / scenario.unitsPerOrder)}) ÷ ${scenario.ordersPerAgent} pedidos por asesor al mes. El chatbot suma ${scenario.chatbotCapacity} pedidos de capacidad.`,
    });
  }
  if (config.modules.ecommerce) {
    const variable = state.avgUnitCost + d.price * (GATEWAY_FEE + ADMIN_MANUAL_RATE) + (d.freeShipping ? scenario.shippingCost / scenario.unitsPerOrder : 0);
    const cm = 1 - variable / d.price;
    hints.push({
      id: 'roas',
      module: 'ecommerce',
      title: 'ROAS de equilibrio con tu precio actual',
      value: cm > 0 ? dec(1 / cm) : 'No hay margen',
      explanation:
        cm > 0
          ? `Margen de contribución estimado: ${pct(cm)}. Cada peso en pauta debe traer al menos ${dec(1 / cm)} pesos en ventas para no perder dinero.`
          : 'Con este precio no cubres el costo variable: cualquier venta genera pérdida.',
    });
  }
  const fixedOut = scenario.fixedCosts + d.agents * scenario.agentSalary * state.salaryIndex + d.metaBudget + d.tiktokBudget;
  const importCost = importUnitCost(scenario, state.trm);
  const purchases =
    d.purchaseLocal * scenario.localCost +
    (importCost !== null && d.purchaseImport > 0 ? d.purchaseImport * importCost + scenario.importFixedCost : 0);
  hints.push({
    id: 'caja',
    module: 'finanzas',
    title: 'Salidas de caja comprometidas este mes',
    value: cop(fixedOut + purchases),
    explanation: `Compras (${cop(purchases)}) + nómina, gastos fijos y pauta (${cop(fixedOut)}). Caja disponible: ${cop(state.cash)}. Las ventas del mes entran después.`,
  });
  return hints;
}
