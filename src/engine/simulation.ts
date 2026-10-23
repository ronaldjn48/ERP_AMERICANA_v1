import {
  ADMIN_AUTOMATED_RATE,
  ADMIN_MANUAL_RATE,
  AUTOMATION_COSTS,
  DIFFICULTIES,
  GATEWAY_FEE,
  TAX_RATE,
  sanitizeDecisions,
} from './config';
import { drawEvent } from './events';
import { Rng } from './rng';
import { getScenario } from './scenarios';
import type {
  AutomationId,
  CostBreakdown,
  Decisions,
  Kpis,
  PeriodResult,
  Scenario,
  ScoreBreakdown,
  SimConfig,
  SimState,
} from './types';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round = (v: number) => Math.round(v);

export function initState(config: SimConfig): SimState {
  const scenario = getScenario(config.scenarioId);
  const diff = DIFFICULTIES[config.difficulty];
  return {
    period: 0,
    month: config.startMonth,
    cash: round(scenario.initialCash * diff.cashMultiplier),
    inventory: scenario.initialInventory,
    avgUnitCost: scenario.localCost,
    pipeline: [],
    debt: 0,
    overdraft: 0,
    customers: scenario.initialCustomers,
    satisfaction: 70,
    awareness: 50,
    ux: 50,
    trm: scenario.trm0,
    salaryIndex: 1,
    activated: { autoReorder: false, cartRecovery: false, chatbot: false, eInvoicing: false },
    pendingEvent: null,
    lastEventId: null,
    rng: config.seed,
    history: [],
    finished: false,
    bankrupt: false,
  };
}

/**
 * Pronóstico ingenuo con ajuste estacional: demanda del último mes ÷ índice estacional de ese mes × índice del mes a pronosticar.
 * En el primer mes usa la demanda de referencia del escenario.
 */
export function forecastDemand(state: SimState, scenario: Scenario): number {
  const last = state.history[state.history.length - 1];
  const season = scenario.seasonality[state.month];
  if (!last) return Math.round(scenario.baseDemand * season);
  const base = (last.demandUnits - last.corporateUnits) / scenario.seasonality[last.month];
  return Math.round(base * season);
}

/** Política automática para los módulos que el estudiante no controla: cubre el pronóstico más 20 % de stock de seguridad. */
function applyAutoPolicies(d: Decisions, prev: SimState, scenario: Scenario, config: SimConfig): Decisions {
  const forecast = forecastDemand(prev, scenario);
  const out = { ...d };
  if (!config.modules.erp) {
    const arriving = prev.pipeline.filter((p) => p.arrivesAt <= prev.period + 1).reduce((a, p) => a + p.units, 0);
    out.purchaseLocal = Math.max(0, Math.round(forecast * 1.2 - prev.inventory - arriving));
  }
  if (!config.modules.crm) {
    out.agents = Math.max(1, Math.ceil(forecast / scenario.unitsPerOrder / scenario.ordersPerAgent));
  }
  return out;
}

/** Costo unitario nacionalizado de una importación con la TRM indicada (sin el flete fijo por embarque). */
export function importUnitCost(scenario: Scenario, trm: number): number | null {
  if (scenario.importCostUSD === null) return null;
  return round(scenario.importCostUSD * trm * (1 + scenario.tariff));
}

/** Clics efectivos con rendimientos decrecientes: los primeros pesos rinden más que los últimos. */
export function paidClicks(budget: number, cpc: number, maxClicks: number): number {
  if (budget <= 0) return 0;
  return maxClicks * (1 - Math.exp(-budget / (cpc * maxClicks)));
}

export function priceFactor(price: number, refPrice: number, elasticity: number): number {
  return clamp(Math.pow(refPrice / price, elasticity), 0.05, 3);
}

export function inventoryValue(units: number, unitCost: number): number {
  return round(units * unitCost);
}

/** Equidad contable: activos − pasivos. */
export function equityOf(state: Pick<SimState, 'cash' | 'inventory' | 'avgUnitCost' | 'pipeline' | 'debt' | 'overdraft'>): number {
  const transit = state.pipeline.reduce((acc, p) => acc + p.units * p.unitCost, 0);
  return round(state.cash + state.inventory * state.avgUnitCost + transit - state.debt - state.overdraft);
}

export interface RunOutput {
  state: SimState;
  result: PeriodResult;
}

/**
 * Simula un mes completo. Función pura: no modifica el estado recibido.
 * Orden: llegadas de importación → compras → demanda → ventas → costos → caja → clientes → evento del mes siguiente.
 */
export function runPeriod(prev: SimState, rawDecisions: Decisions, config: SimConfig): RunOutput {
  if (prev.finished) throw new Error('La simulación ya terminó.');
  const scenario = getScenario(config.scenarioId);
  const diff = DIFFICULTIES[config.difficulty];
  const d = applyAutoPolicies(sanitizeDecisions(rawDecisions, scenario, config, prev.debt), prev, scenario, config);
  const rng = new Rng(prev.rng);
  const event = prev.pendingEvent;
  const ev = (id: string) => event?.id === id;
  const evFactor = (id: string) => (event?.id === id ? (event.data?.factor ?? 1) : 1);
  const period = prev.period + 1;
  const month = prev.month;
  const season = scenario.seasonality[month];

  // Ajuste anual del salario mínimo cada enero (excepto si la simulación arranca en enero).
  const salaryIndex = month === 0 && prev.period > 0 ? prev.salaryIndex * 1.09 : prev.salaryIndex;

  // TRM: caminata aleatoria suave más el choque del evento.
  const trm = round(prev.trm * evFactor('trm_alza'));

  // 1. Llegada de importaciones.
  let inventory = prev.inventory;
  let invValue = prev.inventory * prev.avgUnitCost;
  let arrivedUnits = 0;
  let delayedUnits = 0;
  const pipeline: SimState['pipeline'] = [];
  for (const item of prev.pipeline) {
    if (item.arrivesAt <= period) {
      if (ev('proveedor_retraso')) {
        delayedUnits += item.units;
        pipeline.push({ ...item, arrivesAt: period + 1 });
      } else {
        arrivedUnits += item.units;
        inventory += item.units;
        invValue += item.units * item.unitCost;
      }
    } else {
      pipeline.push(item);
    }
  }

  // 2. Fondos disponibles para compras: caja + préstamo nuevo − abono + cupo de sobregiro libre.
  //    Los proveedores no despachan lo que no se puede pagar.
  let funds = Math.max(0, prev.cash + d.loanDraw - d.loanRepay + Math.max(0, diff.overdraftLimit - prev.overdraft));
  let rejectedUnits = 0;
  const affordable = (units: number, unitCost: number, fixed = 0): number => {
    if (units <= 0) return 0;
    const max = Math.max(0, Math.floor((funds - fixed) / unitCost));
    const ok = Math.min(units, max);
    rejectedUnits += units - ok;
    if (ok > 0) funds -= ok * unitCost + fixed;
    return ok;
  };

  // 3. Compras locales (inmediatas) y reposición automática.
  let autoReorderUnits = 0;
  if (d.automation.autoReorder && d.automation.reorderQty > 0) {
    const position = inventory + d.purchaseLocal;
    if (position < d.automation.reorderPoint) autoReorderUnits = d.automation.reorderQty;
  }
  const localUnits = affordable(d.purchaseLocal + autoReorderUnits, scenario.localCost);
  autoReorderUnits = Math.min(autoReorderUnits, Math.max(0, localUnits - d.purchaseLocal));
  const localSpend = localUnits * scenario.localCost;
  inventory += localUnits;
  invValue += localSpend;

  // 4. Importación (llega el mes siguiente). Paga un flete y agenciamiento fijo por embarque.
  const importCost = importUnitCost(scenario, trm);
  const importUnits = importCost === null ? 0 : affordable(d.purchaseImport, importCost, scenario.importFixedCost);
  const importSpend = importCost === null ? 0 : importUnits * importCost;
  const importLogistics = importUnits > 0 ? scenario.importFixedCost : 0;
  if (importUnits > 0 && importCost !== null) {
    pipeline.push({ units: importUnits, unitCost: importCost, arrivesAt: period + 1 });
  }
  const avgUnitCost = inventory > 0 ? invValue / inventory : prev.avgUnitCost;

  // 5. Tráfico.
  const cpcFactor = evFactor('cpc_alza');
  const metaClicks = paidClicks(d.metaBudget, scenario.cpc.meta * cpcFactor, scenario.maxClicks.meta);
  const tiktokClicks = paidClicks(d.tiktokBudget, scenario.cpc.tiktok * cpcFactor, scenario.maxClicks.tiktok);
  const organicVisits = scenario.organicVisits * (0.4 + (1.2 * prev.awareness) / 100) * season * evFactor('viral');

  // 6. Conversión.
  const refPrice = scenario.refPrice * evFactor('competidor_promo');
  const pf = priceFactor(d.price, refPrice, scenario.elasticity);
  const satisfactionFactor = 0.6 + (0.8 * prev.satisfaction) / 100;
  const uxFactor = 0.7 + (0.6 * prev.ux) / 100;
  const conversion =
    scenario.baseConversion *
    pf *
    satisfactionFactor *
    uxFactor *
    (d.freeShipping ? 1.18 : 1) *
    (d.automation.cartRecovery ? 1.12 : 1) *
    evFactor('falla_pasarela') *
    evFactor('dia_sin_iva');
  const noise = Math.max(0.3, 1 + rng.normal() * diff.noise);

  const organicOrders = organicVisits * conversion;
  const metaOrders = metaClicks * conversion * scenario.channelConversion.meta;
  const tiktokOrders = tiktokClicks * conversion * scenario.channelConversion.tiktok;
  const newOrders = (organicOrders + metaOrders + tiktokOrders) * noise;

  // 7. Recompra de la base de clientes (CRM).
  const repeatOrders =
    prev.customers *
    scenario.repurchaseRate *
    (0.5 + prev.satisfaction / 100) *
    (1 + 2 * d.loyaltyDiscount) *
    Math.sqrt(pf) *
    (0.85 + 0.15 * season) *
    (1 + rng.normal() * diff.noise * 0.5);

  const corporateUnits =
    ev('cliente_corporativo') && d.eventChoice === 'aceptar' ? (event?.data?.units ?? 0) : 0;

  // 8. Ventas limitadas por inventario: primero clientes habituales y nuevos, luego el pedido corporativo.
  const retailDemand = Math.max(0, (newOrders + Math.max(0, repeatOrders)) * scenario.unitsPerOrder);
  const demandUnits = round(retailDemand + corporateUnits);
  const retailSold = Math.min(inventory, round(retailDemand));
  const corporateSold = Math.min(inventory - retailSold, corporateUnits);
  const unitsSold = retailSold + corporateSold;
  const lostUnits = demandUnits - unitsSold;
  const retailFill = retailDemand > 0 ? retailSold / retailDemand : 1;
  const fillRate = demandUnits > 0 ? unitsSold / demandUnits : 1;
  const corporateFailed = corporateUnits > 0 && corporateSold < corporateUnits;

  const ordersFulfilled = (newOrders + Math.max(0, repeatOrders)) * retailFill;
  const repeatShare = newOrders + repeatOrders > 0 ? Math.max(0, repeatOrders) / (newOrders + Math.max(0, repeatOrders)) : 0;
  const paidShare = newOrders > 0 ? ((metaOrders + tiktokOrders) * noise) / (newOrders + Math.max(0, repeatOrders)) : 0;

  const retailRevenue = retailSold * d.price * (1 - repeatShare * d.loyaltyDiscount);
  const corporateRevenue = corporateSold * d.price * (1 - (event?.data?.discount ?? 0));
  const revenue = round(retailRevenue + corporateRevenue);
  const metaRevenue = retailRevenue * (newOrders > 0 ? (metaOrders * noise) / (newOrders + Math.max(0, repeatOrders)) : 0);
  const tiktokRevenue = retailRevenue * (newOrders > 0 ? (tiktokOrders * noise) / (newOrders + Math.max(0, repeatOrders)) : 0);
  const paidRevenue = round(retailRevenue * paidShare);

  // 9. Inventario final y costo de ventas (promedio ponderado).
  const endInventory = inventory - unitsSold;
  const cogs = round(unitsSold * avgUnitCost);
  const endInvValue = round(endInventory * avgUnitCost);

  // Obsolescencia: el inventario que excede 45 días de venta pierde valor (moda que pasa, café que envejece).
  const coverageDays = unitsSold > 0 ? (endInventory / unitsSold) * 30 : endInventory > 0 ? 180 : 0;
  const obsolescence = clamp((coverageDays - 45) / 45, 0, 3);

  // 10. Servicio al cliente.
  const serviceCapacity = d.agents * scenario.ordersPerAgent + (d.automation.chatbot ? scenario.chatbotCapacity : 0);
  const serviceRatio = ordersFulfilled > 0 ? serviceCapacity / ordersFulfilled : 2;

  // 11. Automatizaciones: costo de implementación la primera vez y mensualidad.
  const activated = { ...prev.activated };
  let automationCost = 0;
  (Object.keys(AUTOMATION_COSTS) as AutomationId[]).forEach((id) => {
    if (d.automation[id]) {
      if (!activated[id]) {
        automationCost += AUTOMATION_COSTS[id].setup;
        activated[id] = true;
      }
      automationCost += AUTOMATION_COSTS[id].monthly;
    }
  });

  const costs: CostBreakdown = {
    cogs,
    marketing: d.metaBudget + d.tiktokBudget,
    salaries: round(d.agents * scenario.agentSalary * salaryIndex),
    fixed: round(scenario.fixedCosts * (1 + (salaryIndex - 1) * 0.5)),
    shipping: d.freeShipping ? round(ordersFulfilled * scenario.shippingCost) : 0,
    gatewayFees: round(retailRevenue * GATEWAY_FEE),
    admin: round(revenue * (d.automation.eInvoicing ? ADMIN_AUTOMATED_RATE : ADMIN_MANUAL_RATE)),
    holding: round(endInvValue * scenario.holdingRate * (1 + obsolescence)),
    automation: automationCost,
    ux: d.uxInvestment,
    importLogistics,
    interest: round(prev.debt * diff.loanRate + prev.overdraft * diff.overdraftRate),
  };
  const totalCosts = Object.values(costs).reduce((a, b) => a + b, 0);
  const grossProfit = revenue - cogs;
  const ebt = revenue - totalCosts;
  const tax = ebt > 0 ? round(ebt * TAX_RATE) : 0;
  const netIncome = ebt - tax;

  // 12. Caja. Las compras salen de caja; el costo de ventas no (ya se pagó al comprar).
  const opexCash = totalCosts - cogs;
  const purchasesCash = localSpend + importSpend;
  let cash = prev.cash + revenue - purchasesCash - opexCash - tax + d.loanDraw - d.loanRepay;
  const debt = prev.debt + d.loanDraw - d.loanRepay;
  let overdraft = prev.overdraft;
  if (cash < 0) {
    overdraft += -cash;
    cash = 0;
  } else if (overdraft > 0) {
    const pay = Math.min(cash, overdraft);
    overdraft -= pay;
    cash -= pay;
  }
  cash = round(cash);
  overdraft = round(overdraft);

  // 13. Satisfacción, clientes, marca y experiencia de la tienda.
  let target = 72;
  target -= 35 * (1 - retailFill);
  target -= Math.min(30, 35 * Math.max(0, 1 - serviceRatio));
  target += d.freeShipping ? 5 : 0;
  target += d.automation.chatbot ? 2 : 0;
  target += d.loyaltyDiscount * 30;
  target += (prev.ux - 50) / 8;
  const premium = d.price / refPrice - 1.15;
  if (premium > 0) target -= premium * 40;
  if (ev('reclamo_redes')) target -= serviceRatio >= 1 ? 3 : 12;
  if (ev('falla_pasarela')) target -= 5;
  if (corporateFailed) target -= 10;
  const satisfaction = clamp(prev.satisfaction + 0.5 * (clamp(target, 0, 100) - prev.satisfaction), 0, 100);

  const newCustomers = round(newOrders * retailFill * 0.9);
  const churnRate = clamp(0.16 - (0.11 * satisfaction) / 100, 0.03, 0.2);
  const churnedCustomers = round(prev.customers * churnRate);
  const customers = Math.max(0, prev.customers - churnedCustomers + newCustomers);

  const paidReach = (metaClicks + tiktokClicks) / 1000;
  const awareness = clamp(prev.awareness * 0.9 + 5 + paidReach * 0.9 + (ev('viral') ? 12 : 0), 0, 100);
  const ux = clamp(prev.ux * 0.97 + d.uxInvestment / scenario.uxCostPerPoint, 0, 100);

  // 14. Siguiente estado y evento del mes siguiente.
  const nextMonth = (month + 1) % 12;
  const preliminaryEquity = equityOf({ cash, inventory: endInventory, avgUnitCost, pipeline, debt, overdraft });
  const bankrupt = preliminaryEquity < 0;
  const finished = period >= config.periods || bankrupt;
  const pendingEvent = finished ? null : drawEvent(rng, scenario, config, diff.eventProbability, event?.id ?? prev.lastEventId);
  const nextTrm = round(clamp(trm * (1 + rng.normal() * 0.02), scenario.trm0 * 0.75, scenario.trm0 * 1.4));

  const inTransitValue = round(pipeline.reduce((acc, p) => acc + p.units * p.unitCost, 0));
  const nextState: SimState = {
    period,
    month: nextMonth,
    cash,
    inventory: endInventory,
    avgUnitCost,
    pipeline,
    debt,
    overdraft,
    customers,
    satisfaction,
    awareness,
    ux,
    trm: nextTrm,
    salaryIndex,
    activated,
    pendingEvent,
    lastEventId: event?.id ?? null,
    rng: rng.state,
    history: [],
    finished,
    bankrupt,
  };
  const equity = preliminaryEquity;

  // 15. Indicadores.
  const variableRate = revenue > 0 ? (cogs + costs.gatewayFees + costs.shipping + costs.admin) / revenue : null;
  const contributionMargin = variableRate === null ? null : 1 - variableRate;
  const kpis: Kpis = {
    grossMargin: revenue > 0 ? grossProfit / revenue : 0,
    netMargin: revenue > 0 ? netIncome / revenue : 0,
    roasMeta: d.metaBudget > 0 ? metaRevenue / d.metaBudget : null,
    roasTiktok: d.tiktokBudget > 0 ? tiktokRevenue / d.tiktokBudget : null,
    breakEvenRoas: contributionMargin && contributionMargin > 0 ? 1 / contributionMargin : null,
    cac:
      costs.marketing > 0 && newCustomers > 0 && newOrders > 0
        ? costs.marketing / Math.max(1, newCustomers * ((metaOrders + tiktokOrders) * noise) / newOrders)
        : null,
    inventoryDays: unitsSold > 0 ? (endInventory / unitsSold) * 30 : null,
    contributionPerUnit: unitsSold > 0 ? (revenue - cogs - costs.gatewayFees - costs.shipping - costs.admin) / unitsSold : 0,
  };

  const totalAds = costs.marketing;
  const score = scorePeriod({
    netIncome,
    profitBenchmark: scenario.baseDemand * season * scenario.refPrice * 0.12,
    cash,
    overdraft,
    monthlyFixed: costs.fixed + costs.salaries,
    satisfaction,
    customerGrowth: prev.customers > 0 ? (customers - prev.customers) / prev.customers : 0,
    fillRate,
    serviceRatio,
    inventoryDays: kpis.inventoryDays,
    blendedRoas: totalAds > 0 ? (metaRevenue + tiktokRevenue) / totalAds : null,
    breakEvenRoas: kpis.breakEvenRoas,
  });

  const result: PeriodResult = {
    period,
    month,
    event,
    eventChoice: event?.choices ? d.eventChoice ?? 'rechazar' : null,
    decisions: d,
    organicVisits: round(organicVisits),
    metaClicks: round(metaClicks),
    tiktokClicks: round(tiktokClicks),
    conversionRate: conversion * noise,
    newOrders: round(newOrders),
    repeatOrders: round(Math.max(0, repeatOrders)),
    corporateUnits,
    demandUnits,
    unitsSold,
    lostUnits,
    fillRate,
    autoReorderUnits,
    rejectedUnits,
    unitsPurchasedLocal: localUnits,
    unitsPurchasedImport: importUnits,
    arrivedUnits,
    delayedUnits,
    endInventory,
    inventoryValue: endInvValue,
    inTransitValue,
    serviceCapacity,
    serviceRatio,
    revenue,
    paidRevenue,
    costs,
    grossProfit,
    ebt,
    tax,
    netIncome,
    purchasesCash,
    cashStart: prev.cash,
    cashEnd: cash,
    debt,
    overdraft,
    equity,
    bankrupt,
    customers,
    newCustomers,
    churnedCustomers,
    satisfaction,
    awareness,
    ux,
    trm,
    kpis,
    score,
  };
  nextState.history = [...prev.history, result];
  return { state: nextState, result };
}

interface ScoreInput {
  netIncome: number;
  /** Utilidad neta de referencia del mes: 12 % de las ventas esperadas a precio de referencia. */
  profitBenchmark: number;
  cash: number;
  overdraft: number;
  monthlyFixed: number;
  satisfaction: number;
  customerGrowth: number;
  fillRate: number;
  serviceRatio: number;
  inventoryDays: number | null;
  blendedRoas: number | null;
  breakEvenRoas: number | null;
}

/**
 * Cuadro de mando integral simplificado (100 puntos):
 * finanzas 40 (utilidad 25 + liquidez 15), clientes 30 (satisfacción 20 + crecimiento 10),
 * procesos 30 (nivel de servicio 12 + capacidad de atención 10 + días de inventario 4 + eficiencia de pauta 4).
 */
export function scorePeriod(i: ScoreInput): ScoreBreakdown {
  const profit = clamp((i.netIncome / Math.max(1, i.profitBenchmark) + 0.5) / 1.5, 0, 1) * 25;
  const liquidity = i.overdraft > 0 ? 0 : clamp(i.cash / Math.max(1, i.monthlyFixed), 0, 1) * 15;
  const financial = profit + liquidity;
  const customer = clamp((i.satisfaction - 35) / 45, 0, 1) * 20 + clamp((i.customerGrowth + 0.05) / 0.1, 0, 1) * 10;
  let invScore = 0;
  if (i.inventoryDays !== null) {
    if (i.inventoryDays >= 8 && i.inventoryDays <= 45) invScore = 4;
    else if (i.inventoryDays < 8) invScore = (i.inventoryDays / 8) * 4;
    else invScore = clamp(1 - (i.inventoryDays - 45) / 60, 0, 1) * 4;
  }
  const adScore =
    i.blendedRoas === null || i.breakEvenRoas === null ? 4 : clamp(i.blendedRoas / i.breakEvenRoas, 0, 1) * 4;
  const process =
    clamp((i.fillRate - 0.7) / 0.25, 0, 1) * 12 + clamp(i.serviceRatio, 0, 1) * 10 + invScore + adScore;
  const total = financial + customer + process;
  const r1 = (v: number) => Math.round(v * 10) / 10;
  return { financial: r1(financial), customer: r1(customer), process: r1(process), total: r1(total) };
}

/** Nota final en escala 0,0 a 5,0. */
export function finalGrade(history: PeriodResult[]): number {
  if (history.length === 0) return 0;
  const avg = history.reduce((acc, r) => acc + r.score.total, 0) / history.length;
  return Math.round((avg / 20) * 10) / 10;
}

/** Decisiones de partida para el mes siguiente: repite las del mes anterior y reinicia las decisiones de una sola vez. */
export function nextDecisionsFrom(state: SimState, config: SimConfig): Decisions {
  const scenario = getScenario(config.scenarioId);
  const last = state.history[state.history.length - 1];
  const base = last ? last.decisions : scenario.defaults;
  return {
    ...base,
    automation: { ...base.automation },
    loanDraw: 0,
    loanRepay: 0,
    uxInvestment: 0,
    eventChoice: null,
  };
}
