import { randomSeed } from './rng';
import { SCENARIOS, getScenario } from './scenarios';
import type { Decisions, Difficulty, ModuleId, Scenario, SimConfig } from './types';

export interface DifficultyParams {
  label: string;
  description: string;
  /** Volatilidad de la demanda (desviación estándar relativa). */
  noise: number;
  /** Probabilidad de que ocurra un evento en un mes. */
  eventProbability: number;
  cashMultiplier: number;
  creditLimit: number;
  loanRate: number;
  overdraftRate: number;
  /** Cupo de sobregiro: las compras que lo superen no se despachan. */
  overdraftLimit: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyParams> = {
  basico: {
    label: 'Básico',
    description: 'Mercado estable, pocos eventos, más capital y cupo de crédito amplio. Ideal para la primera sesión.',
    noise: 0.04,
    eventProbability: 0.25,
    cashMultiplier: 1.3,
    creditLimit: 80000000,
    overdraftLimit: 40000000,
    loanRate: 0.015,
    overdraftRate: 0.024,
  },
  intermedio: {
    label: 'Intermedio',
    description: 'Demanda con variación moderada y eventos frecuentes. Exige planear compras y caja.',
    noise: 0.09,
    eventProbability: 0.45,
    cashMultiplier: 1,
    creditLimit: 50000000,
    overdraftLimit: 25000000,
    loanRate: 0.017,
    overdraftRate: 0.026,
  },
  avanzado: {
    label: 'Avanzado',
    description: 'Mercado volátil, eventos casi cada mes, menos capital y crédito restringido.',
    noise: 0.15,
    eventProbability: 0.6,
    cashMultiplier: 0.8,
    creditLimit: 30000000,
    overdraftLimit: 15000000,
    loanRate: 0.019,
    overdraftRate: 0.028,
  },
};

export const MODULE_INFO: Record<ModuleId, { label: string; short: string; description: string }> = {
  erp: {
    label: 'ERP · Inventario y compras',
    short: 'ERP',
    description: 'Precio de venta, compras al proveedor local o importación, y control de inventario.',
  },
  crm: {
    label: 'CRM · Clientes y servicio',
    short: 'CRM',
    description: 'Asesores de servicio, programa de fidelización y satisfacción del cliente.',
  },
  ecommerce: {
    label: 'E-commerce · Tienda y pauta digital',
    short: 'E-commerce',
    description: 'Inversión en Meta Ads y TikTok Ads, envío gratis y mejoras de la tienda virtual.',
  },
  automatizacion: {
    label: 'Automatización de procesos',
    short: 'Automatización',
    description: 'Reabastecimiento automático, recuperación de carritos, chatbot y facturación electrónica integrada.',
  },
  finanzas: {
    label: 'Finanzas · Caja y crédito',
    short: 'Finanzas',
    description: 'Préstamos, abonos a deuda y control de liquidez.',
  },
};

export const MODULE_ORDER: ModuleId[] = ['erp', 'crm', 'ecommerce', 'automatizacion', 'finanzas'];

export const AUTOMATION_COSTS = {
  autoReorder: { setup: 1500000, monthly: 150000 },
  cartRecovery: { setup: 800000, monthly: 450000 },
  chatbot: { setup: 2500000, monthly: 600000 },
  eInvoicing: { setup: 1200000, monthly: 300000 },
} as const;

export const TAX_RATE = 0.35;
export const GATEWAY_FEE = 0.032;
export const ADMIN_MANUAL_RATE = 0.015;
export const ADMIN_AUTOMATED_RATE = 0.004;
export const MAX_AGENTS = 15;

export function defaultConfig(): SimConfig {
  return {
    version: 1,
    scenarioId: SCENARIOS[0].id,
    difficulty: 'basico',
    periods: 12,
    seed: randomSeed(),
    startMonth: 6,
    modules: { erp: true, crm: true, ecommerce: true, automatizacion: true, finanzas: true },
    guided: true,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function int(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(clamp(n, min, max));
}

/** Valida y normaliza una configuración que viene de un código compartido, la URL o el almacenamiento local. */
export function sanitizeConfig(raw: unknown): SimConfig {
  const base = defaultConfig();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const difficulty = (['basico', 'intermedio', 'avanzado'] as const).includes(r.difficulty as Difficulty)
    ? (r.difficulty as Difficulty)
    : base.difficulty;
  const rawModules = (r.modules && typeof r.modules === 'object' ? r.modules : {}) as Record<string, unknown>;
  const modules = { ...base.modules };
  for (const id of MODULE_ORDER) {
    if (typeof rawModules[id] === 'boolean') modules[id] = rawModules[id] as boolean;
  }
  if (!MODULE_ORDER.some((id) => modules[id])) modules.erp = true;
  return {
    version: 1,
    scenarioId: SCENARIOS.some((s) => s.id === r.scenarioId) ? (r.scenarioId as string) : base.scenarioId,
    difficulty,
    periods: int(r.periods, 3, 24, base.periods),
    seed: int(r.seed, 1, 999999999, base.seed),
    startMonth: int(r.startMonth, 0, 11, base.startMonth),
    modules,
    guided: typeof r.guided === 'boolean' ? r.guided : base.guided,
  };
}

// Código compacto para que el docente comparta la misma configuración con todo el grupo.
const KEYS: Record<ModuleId, string> = { erp: 'e', crm: 'c', ecommerce: 'w', automatizacion: 'a', finanzas: 'f' };

export function encodeConfig(config: SimConfig): string {
  const mods = MODULE_ORDER.filter((m) => config.modules[m])
    .map((m) => KEYS[m])
    .join('');
  const diff = { basico: 'B', intermedio: 'I', avanzado: 'A' }[config.difficulty];
  return [config.scenarioId, diff, config.periods, config.startMonth + 1, config.seed, mods, config.guided ? 'G' : 'L'].join('-').toUpperCase();
}

export function decodeConfig(code: string): SimConfig | null {
  const parts = code.trim().toUpperCase().split('-');
  if (parts.length !== 7) return null;
  const [scenario, diff, periods, month, seed, mods, guided] = parts;
  const difficulty = ({ B: 'basico', I: 'intermedio', A: 'avanzado' } as const)[diff as 'B' | 'I' | 'A'];
  const scenarioId = scenario.toLowerCase();
  if (!difficulty || !SCENARIOS.some((s) => s.id === scenarioId)) return null;
  if (!/^\d+$/.test(periods) || !/^\d+$/.test(month) || !/^\d+$/.test(seed)) return null;
  const modules = Object.fromEntries(
    MODULE_ORDER.map((m) => [m, mods.toLowerCase().includes(KEYS[m])]),
  ) as Record<ModuleId, boolean>;
  return sanitizeConfig({
    scenarioId,
    difficulty,
    periods: Number(periods),
    startMonth: Number(month) - 1,
    seed: Number(seed),
    modules,
    guided: guided === 'G',
  });
}

export function priceBounds(s: Scenario): { min: number; max: number; step: number } {
  const step = s.refPrice >= 80000 ? 1000 : 500;
  return { min: Math.round((s.refPrice * 0.5) / step) * step, max: Math.round((s.refPrice * 1.8) / step) * step, step };
}

/**
 * Aplica límites a las decisiones y reemplaza por la política por defecto las de los módulos que el estudiante no controla.
 * Nunca confía en lo que llega de la interfaz.
 */
export function sanitizeDecisions(d: Decisions, scenario: Scenario, config: SimConfig, debt: number): Decisions {
  const def = scenario.defaults;
  const m = config.modules;
  const pb = priceBounds(scenario);
  const limit = DIFFICULTIES[config.difficulty].creditLimit;
  const out: Decisions = {
    price: m.erp ? Math.round(clamp(d.price, pb.min, pb.max)) : def.price,
    purchaseLocal: m.erp ? Math.round(clamp(d.purchaseLocal, 0, 20000)) : def.purchaseLocal,
    purchaseImport: m.erp && scenario.importCostUSD !== null ? Math.round(clamp(d.purchaseImport, 0, 30000)) : 0,
    metaBudget: m.ecommerce ? Math.round(clamp(d.metaBudget, 0, 40000000)) : def.metaBudget,
    tiktokBudget: m.ecommerce ? Math.round(clamp(d.tiktokBudget, 0, 40000000)) : def.tiktokBudget,
    freeShipping: m.ecommerce ? Boolean(d.freeShipping) : def.freeShipping,
    uxInvestment: m.ecommerce ? Math.round(clamp(d.uxInvestment, 0, 30000000)) : 0,
    agents: m.crm ? Math.round(clamp(d.agents, 0, MAX_AGENTS)) : def.agents,
    loyaltyDiscount: m.crm ? clamp(Math.round(d.loyaltyDiscount * 100) / 100, 0, 0.2) : def.loyaltyDiscount,
    automation: m.automatizacion
      ? {
          autoReorder: Boolean(d.automation.autoReorder),
          reorderPoint: Math.round(clamp(d.automation.reorderPoint, 0, 20000)),
          reorderQty: Math.round(clamp(d.automation.reorderQty, 0, 20000)),
          cartRecovery: Boolean(d.automation.cartRecovery),
          chatbot: Boolean(d.automation.chatbot),
          eInvoicing: Boolean(d.automation.eInvoicing),
        }
      : { ...def.automation },
    loanDraw: m.finanzas ? Math.round(clamp(d.loanDraw, 0, Math.max(0, limit - debt))) : 0,
    loanRepay: m.finanzas ? Math.round(clamp(d.loanRepay, 0, debt)) : 0,
    eventChoice: d.eventChoice ?? null,
  };
  return out;
}

export { getScenario };
