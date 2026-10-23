import { describe, expect, it } from 'vitest';
import { closeDay } from '../src/erp/day';
import { answerQuestion, evaluateMissions, levelOf, MISSIONS, missionStatus, TOTAL_XP } from '../src/erp/missions';
import { confirmSalesOrder, createSalesOrder, dispatchSalesOrder, invoiceSalesOrder, markVisited, registerPayment, updateSettings } from '../src/erp/ops';
import { createWorkspace } from '../src/erp/seed';

const ctx = { simGrade: null };
const ws = () => createWorkspace({ name: 'Ana', group: '' }, 'tech', 99);

describe('misiones', () => {
  it('todas las misiones tienen objetivos y prerrequisitos válidos', () => {
    const ids = new Set(MISSIONS.map((m) => m.id));
    expect(ids.size).toBe(MISSIONS.length);
    for (const m of MISSIONS) {
      expect(m.objectives.length).toBeGreaterThan(0);
      for (const r of m.requires) expect(ids.has(r)).toBe(true);
    }
    expect(TOTAL_XP).toBeGreaterThan(3000);
  });

  it('la primera misión se completa con datos de empresa, visitas y cierre de día', () => {
    let s = ws();
    expect(missionStatus(s, MISSIONS[1])).toBe('bloqueada');
    s = updateSettings(s, { nit: '901234567-8', address: 'Calle 72 # 45-10' });
    for (const m of ['crm', 'ventas', 'inventario', 'contabilidad']) s = markVisited(s, m);
    s = closeDay(s);
    const { state, events } = evaluateMissions(s, ctx);
    expect(events.completed.map((m) => m.id)).toContain('m01');
    expect(state.gamification.xp).toBe(100);
    expect(state.gamification.badges).toContain('b-bienvenida');
    expect(missionStatus(state, MISSIONS[1])).toBe('disponible');
    expect(state.gamification.activeMission).not.toBe('m01');
  });

  it('las preguntas validan la respuesta y dan bono al primer intento', () => {
    let s = ws();
    s = createSalesOrder(s, { customerId: 'cli1', lines: [{ productId: 'prd1', qty: 2, price: 89000, discount: 0 }] });
    const id = s.salesOrders[0].id;
    s = registerPayment(invoiceSalesOrder(dispatchSalesOrder(confirmSalesOrder(s, id), id), id), id);
    const wrong = answerQuestion(s, 'm05', 'o5', 1);
    expect(wrong.correct).toBe(false);
    expect(wrong.expected).toBe(Math.round(178000 * 0.19));
    const right = answerQuestion(wrong.state, 'm05', 'o5', 33820);
    expect(right.correct).toBe(true);
    expect(right.state.gamification.xp).toBe(0);
    const first = answerQuestion(s, 'm05', 'o5', 33820);
    expect(first.state.gamification.xp).toBe(20);
  });

  it('calcula el nivel por experiencia', () => {
    expect(levelOf(0).name).toBe('Practicante');
    expect(levelOf(850).name).toBe('Analista de operaciones');
    expect(levelOf(99999).progress).toBe(1);
  });
});
