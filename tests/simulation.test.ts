import { describe, expect, it } from 'vitest';
import { decodeConfig, defaultConfig, encodeConfig, sanitizeConfig, sanitizeDecisions } from '../src/engine/config';
import { analyzePeriod, buildHints } from '../src/engine/feedback';
import { Rng } from '../src/engine/rng';
import { SCENARIOS, getScenario } from '../src/engine/scenarios';
import {
  equityOf,
  finalGrade,
  initState,
  nextDecisionsFrom,
  paidClicks,
  runPeriod,
} from '../src/engine/simulation';
import type { Decisions, SimConfig, SimState } from '../src/engine/types';

function play(config: SimConfig, tweak?: (d: Decisions, s: SimState) => Decisions): SimState {
  let s = initState(config);
  while (!s.finished) {
    let d = nextDecisionsFrom(s, config);
    if (tweak) d = tweak(d, s);
    s = runPeriod(s, d, config).state;
  }
  return s;
}

const cfg = (patch: Partial<SimConfig> = {}): SimConfig => ({ ...defaultConfig(), seed: 4242, ...patch });

describe('generador aleatorio', () => {
  it('es determinista con la misma semilla', () => {
    const a = new Rng(99);
    const b = new Rng(99);
    for (let i = 0; i < 50; i++) expect(a.next()).toBe(b.next());
  });
  it('produce valores en [0, 1)', () => {
    const r = new Rng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('motor de simulación', () => {
  it('misma semilla y mismas decisiones dan el mismo resultado', () => {
    const a = play(cfg({ difficulty: 'avanzado' }));
    const b = play(cfg({ difficulty: 'avanzado' }));
    expect(a.history.map((h) => h.netIncome)).toEqual(b.history.map((h) => h.netIncome));
    expect(a.history.map((h) => h.event?.id ?? null)).toEqual(b.history.map((h) => h.event?.id ?? null));
  });

  it('no modifica el estado recibido (función pura)', () => {
    const config = cfg();
    const s0 = initState(config);
    const copy = JSON.stringify(s0);
    runPeriod(s0, nextDecisionsFrom(s0, config), config);
    expect(JSON.stringify(s0)).toBe(copy);
  });

  for (const scenario of SCENARIOS) {
    for (const difficulty of ['basico', 'intermedio', 'avanzado'] as const) {
      it(`cumple la ecuación contable en ${scenario.id}/${difficulty}`, () => {
        const config = cfg({ scenarioId: scenario.id, difficulty, periods: 12 });
        let s = initState(config);
        let equity = equityOf(s);
        while (!s.finished) {
          const d = nextDecisionsFrom(s, config);
          const out = runPeriod(s, { ...d, purchaseImport: scenario.importCostUSD ? 300 : 0 }, config);
          const r = out.result;
          // Variación del patrimonio = utilidad neta (sin dividendos ni aportes).
          expect(Math.abs(r.equity - equity - r.netIncome)).toBeLessThanOrEqual(5);
          // Inventario nunca negativo y ventas nunca mayores a la demanda.
          expect(r.endInventory).toBeGreaterThanOrEqual(0);
          expect(r.unitsSold).toBeLessThanOrEqual(r.demandUnits);
          expect(r.cashEnd).toBeGreaterThanOrEqual(0);
          expect(r.fillRate).toBeGreaterThanOrEqual(0);
          expect(r.fillRate).toBeLessThanOrEqual(1);
          expect(r.satisfaction).toBeGreaterThanOrEqual(0);
          expect(r.satisfaction).toBeLessThanOrEqual(100);
          expect(Number.isFinite(r.score.total)).toBe(true);
          expect(r.score.total).toBeGreaterThanOrEqual(0);
          expect(r.score.total).toBeLessThanOrEqual(100);
          equity = r.equity;
          s = out.state;
        }
        expect(s.history.length).toBeGreaterThan(0);
      });
    }
  }

  it('termina exactamente en el número de periodos configurado', () => {
    const s = play(cfg({ periods: 6 }));
    expect(s.history).toHaveLength(6);
    expect(s.finished).toBe(true);
    expect(() => runPeriod(s, nextDecisionsFrom(s, cfg()), cfg())).toThrow();
  });

  it('una gestión informada supera a una gestión descuidada', () => {
    const config = cfg({ difficulty: 'intermedio', periods: 12 });
    const sc = getScenario(config.scenarioId);
    const good = play(config, (d, s) => {
      const last = s.history[s.history.length - 1];
      const forecast = last ? (last.demandUnits / sc.seasonality[last.month]) * sc.seasonality[s.month] : sc.baseDemand;
      return {
        ...d,
        purchaseLocal: Math.max(0, Math.round(forecast * 1.2 - s.inventory)),
        agents: Math.ceil(forecast / sc.unitsPerOrder / sc.ordersPerAgent),
      };
    });
    const bad = play(config, (d) => ({ ...d, price: sc.refPrice * 1.5, purchaseLocal: 2500, metaBudget: 15e6, agents: 0 }));
    expect(finalGrade(good.history)).toBeGreaterThan(finalGrade(bad.history) + 0.5);
  });

  it('la reposición automática compra cuando el inventario cae bajo el punto de reorden', () => {
    const config = cfg();
    const s0 = initState(config);
    const d = nextDecisionsFrom(s0, config);
    const out = runPeriod(
      s0,
      { ...d, purchaseLocal: 0, automation: { ...d.automation, autoReorder: true, reorderPoint: 5000, reorderQty: 700 } },
      config,
    );
    expect(out.result.autoReorderUnits).toBe(700);
    expect(out.result.costs.automation).toBeGreaterThan(0);
  });

  it('la importación llega el mes siguiente y paga flete fijo', () => {
    const config = cfg({ scenarioId: 'tech' });
    const s0 = initState(config);
    const d = nextDecisionsFrom(s0, config);
    const m1 = runPeriod(s0, { ...d, purchaseImport: 800 }, config);
    expect(m1.result.unitsPurchasedImport).toBe(800);
    expect(m1.result.costs.importLogistics).toBe(getScenario('tech').importFixedCost);
    expect(m1.state.pipeline[0].units).toBe(800);
    const m2 = runPeriod(m1.state, nextDecisionsFrom(m1.state, config), config);
    const delayed = m1.state.pendingEvent?.id === 'proveedor_retraso';
    expect(m2.result.arrivedUnits).toBe(delayed ? 0 : 800);
  });

  it('el proveedor no despacha compras que no se pueden pagar', () => {
    const config = cfg({ difficulty: 'avanzado' });
    const s0 = initState(config);
    const out = runPeriod(s0, { ...nextDecisionsFrom(s0, config), purchaseLocal: 20000 }, config);
    expect(out.result.rejectedUnits).toBeGreaterThan(0);
  });

  it('los módulos desactivados usan la política automática del escenario', () => {
    const config = cfg({ modules: { erp: false, crm: false, ecommerce: true, automatizacion: true, finanzas: true } });
    const s0 = initState(config);
    const out = runPeriod(s0, { ...nextDecisionsFrom(s0, config), price: 1, agents: 0 }, config);
    expect(out.result.decisions.price).toBe(getScenario(config.scenarioId).refPrice);
    expect(out.result.decisions.agents).toBeGreaterThan(0);
  });

  it('los clics pagados tienen rendimientos decrecientes', () => {
    const c1 = paidClicks(1e6, 700, 14000);
    const c2 = paidClicks(2e6, 700, 14000);
    expect(c2).toBeGreaterThan(c1);
    expect(c2).toBeLessThan(2 * c1);
    expect(paidClicks(0, 700, 14000)).toBe(0);
  });

  it('declara la quiebra cuando el patrimonio es negativo', () => {
    const config = cfg({ difficulty: 'avanzado', periods: 24 });
    const s = play(config, (d) => ({ ...d, price: 30000, metaBudget: 40e6, tiktokBudget: 40e6, agents: 15 }));
    expect(s.bankrupt).toBe(true);
    expect(s.history.length).toBeLessThan(24);
  });
});

describe('configuración', () => {
  it('el código compartido conserva la configuración', () => {
    const c: SimConfig = {
      ...defaultConfig(),
      scenarioId: 'moda',
      difficulty: 'avanzado',
      periods: 18,
      startMonth: 1,
      seed: 777123,
      modules: { erp: true, crm: false, ecommerce: true, automatizacion: false, finanzas: true },
      guided: false,
    };
    const code = encodeConfig(c);
    expect(code).toMatch(/^MODA-A-18-2-777123-EWF-L$/);
    expect(decodeConfig(code)).toEqual(c);
    expect(decodeConfig(code.toLowerCase())).toEqual(c);
  });

  it('rechaza códigos inválidos', () => {
    expect(decodeConfig('hola')).toBeNull();
    expect(decodeConfig('XXX-B-12-1-1-E-G')).toBeNull();
    expect(decodeConfig('TECH-Z-12-1-1-E-G')).toBeNull();
  });

  it('normaliza configuraciones fuera de rango', () => {
    const c = sanitizeConfig({ periods: 500, startMonth: -3, scenarioId: 'nada', modules: { erp: false, crm: false, ecommerce: false, automatizacion: false, finanzas: false } });
    expect(c.periods).toBe(24);
    expect(c.startMonth).toBe(0);
    expect(c.scenarioId).toBe('tech');
    expect(c.modules.erp).toBe(true);
  });

  it('limita las decisiones a rangos válidos', () => {
    const config = cfg();
    const sc = getScenario(config.scenarioId);
    const d = sanitizeDecisions(
      { ...sc.defaults, price: -5, purchaseLocal: NaN, agents: 99, loyaltyDiscount: 0.9, loanDraw: 1e12, loanRepay: 50 },
      sc,
      config,
      0,
    );
    expect(d.price).toBeGreaterThan(0);
    expect(d.purchaseLocal).toBe(0);
    expect(d.agents).toBe(15);
    expect(d.loyaltyDiscount).toBe(0.2);
    expect(d.loanDraw).toBeLessThanOrEqual(80000000);
    expect(d.loanRepay).toBe(0);
  });
});

describe('retroalimentación pedagógica', () => {
  it('detecta quiebres de inventario y explica el concepto', () => {
    const config = cfg({ startMonth: 11 });
    const sc = getScenario(config.scenarioId);
    const s0 = initState(config);
    const m1 = runPeriod(s0, { ...nextDecisionsFrom(s0, config), purchaseLocal: 0 }, config);
    const out = runPeriod(m1.state, { ...nextDecisionsFrom(m1.state, config), purchaseLocal: 0 }, config);
    const fb = analyzePeriod(out.result, sc, config, m1.result);
    expect(fb.some((f) => f.id === 'quiebre')).toBe(true);
    expect(fb[0].level === 'critico' || fb[0].level === 'alerta').toBe(true);
  });

  it('el modo guiado entrega pronóstico y compra sugerida', () => {
    const config = cfg();
    const s0 = initState(config);
    const hints = buildHints(s0, nextDecisionsFrom(s0, config), getScenario(config.scenarioId), config);
    expect(hints.map((h) => h.id)).toEqual(expect.arrayContaining(['pronostico', 'compra', 'asesores', 'roas', 'caja']));
  });
});
