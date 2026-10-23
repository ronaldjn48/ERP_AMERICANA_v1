import { describe, expect, it } from 'vitest';
import { balanceOf, balanceSheet, incomeStatement, trialBalance } from '../src/erp/accounts';
import { closeDay } from '../src/erp/day';
import {
  adjustStock,
  approvePurchaseOrder,
  confirmSalesOrder,
  createPurchaseOrder,
  createSalesOrder,
  dispatchSalesOrder,
  invoiceSalesOrder,
  manualEntry,
  moveOpportunity,
  orderTotals,
  payPurchaseOrder,
  receivePurchaseOrder,
  registerPayment,
  resolveCase,
  saveCustomer,
  saveRule,
  toggleWebPublish,
  updateSettings,
} from '../src/erp/ops';
import { createWorkspace } from '../src/erp/seed';
import { ErpError, type ErpState } from '../src/erp/types';

const ws = (scenario = 'tech') => createWorkspace({ name: 'Ana Prueba', group: 'G1' }, scenario, 12345);
const last = <T,>(xs: T[]) => xs[xs.length - 1];

function assertBooks(s: ErpState) {
  const tb = trialBalance(s.journal);
  expect(Math.abs(tb.totals.debit - tb.totals.credit)).toBeLessThan(1);
  for (const e of s.journal) {
    const dsum = e.lines.reduce((a, l) => a + l.debit, 0);
    const csum = e.lines.reduce((a, l) => a + l.credit, 0);
    expect(dsum).toBe(csum);
  }
  const bs = balanceSheet(s.journal);
  expect(Math.abs(bs.totalAssets - bs.totalLiabilities - bs.totalEquity)).toBeLessThan(2);
  // El saldo contable del inventario coincide con el kardex valorizado.
  const inv = s.products.reduce((a, p) => a + p.stock * p.cost, 0);
  expect(Math.abs(balanceOf(s.journal, '1435') - inv)).toBeLessThan(s.products.length * 2 + 5);
}

describe('espacio de trabajo', () => {
  it('abre con libros cuadrados en los tres escenarios', () => {
    for (const id of ['tech', 'moda', 'cafe']) assertBooks(ws(id));
  });
});

describe('ciclo de venta', () => {
  it('cotización → confirmado → despachado → facturado → pagado con asientos correctos', () => {
    let s = ws();
    s = createSalesOrder(s, { customerId: 'cli1', lines: [{ productId: 'prd1', qty: 5, price: 89000, discount: 0.05 }] });
    const id = last(s.salesOrders).id;
    s = confirmSalesOrder(s, id);
    expect(s.products[0].reserved).toBe(5);
    const stock0 = s.products[0].stock;
    s = dispatchSalesOrder(s, id);
    expect(s.products[0].stock).toBe(stock0 - 5);
    expect(s.products[0].reserved).toBe(0);
    s = invoiceSalesOrder(s, id);
    const o = s.salesOrders.find((x) => x.id === id)!;
    const { subtotal, iva, total } = orderTotals(o.lines, 0.19);
    expect(iva).toBe(Math.round(subtotal * 0.19));
    expect(balanceOf(s.journal, '1305')).toBe(total);
    expect(balanceOf(s.journal, '4135')).toBe(subtotal);
    s = registerPayment(s, id);
    expect(balanceOf(s.journal, '1305')).toBe(0);
    expect(s.stats.pedido_pagado).toBe(1);
    assertBooks(s);
  });

  it('valida cupo de crédito e inventario', () => {
    let s = ws();
    s = createSalesOrder(s, { customerId: 'cli4', lines: [{ productId: 'prd6', qty: 50, price: 199000, discount: 0 }] });
    expect(() => confirmSalesOrder(s, last(s.salesOrders).id)).toThrow(ErpError);
    s = createSalesOrder(s, { customerId: 'cli5', lines: [{ productId: 'prd6', qty: 30, price: 199000, discount: 0 }] });
    const id = last(s.salesOrders).id;
    s = confirmSalesOrder(s, id);
    expect(() => dispatchSalesOrder(s, id)).toThrow(/inventario suficiente/);
  });

  it('el pedido web se cobra por pasarela con comisión', () => {
    let s = ws();
    s = createSalesOrder(s, { customerId: 'cli5', channel: 'web', lines: [{ productId: 'prd1', qty: 1, price: 89000, discount: 0 }] });
    const id = last(s.salesOrders).id;
    s = invoiceSalesOrder(dispatchSalesOrder(confirmSalesOrder(s, id), id), id);
    expect(s.salesOrders.find((x) => x.id === id)!.status).toBe('pagado');
    expect(balanceOf(s.journal, '5305')).toBeGreaterThan(0);
    assertBooks(s);
  });
});

describe('ciclo de compra', () => {
  it('borrador → aprobada → recibida (costo promedio) → pagada', () => {
    let s = ws();
    const p0 = s.products[0];
    s = createPurchaseOrder(s, { supplierId: p0.supplierId, lines: [{ productId: p0.id, qty: 40, cost: 46000 }] });
    const id = last(s.purchaseOrders).id;
    s = approvePurchaseOrder(s, id);
    expect(() => receivePurchaseOrder(s, id)).toThrow(/en camino/);
    while (s.day < last(s.purchaseOrders).expectedDay) s = closeDay(s);
    s = receivePurchaseOrder(s, id);
    const p = s.products.find((x) => x.id === p0.id)!;
    expect(p.cost).toBeLessThan(p0.cost);
    expect(p.cost).toBeGreaterThan(46000);
    s = payPurchaseOrder(s, id);
    expect(balanceOf(s.journal, '2205')).toBe(0);
    assertBooks(s);
  });
});

describe('contabilidad', () => {
  it('rechaza asientos manuales descuadrados y acepta los cuadrados', () => {
    const s = ws();
    expect(() => manualEntry(s, { description: 'Prueba', lines: [{ account: '5135', debit: 100, credit: 0 }, { account: '1110', debit: 0, credit: 90 }] })).toThrow(/Partida doble/);
    const ok = manualEntry(s, { description: 'Pago de servicios', lines: [{ account: '5135', debit: 100000, credit: 0 }, { account: '1110', debit: 0, credit: 100000 }] });
    expect(ok.stats.asiento_manual).toBe(1);
    assertBooks(ok);
  });

  it('el ajuste de inventario registra faltante en gastos', () => {
    let s = ws();
    s = adjustStock(s, 'prd1', s.products[0].stock - 3, 'Conteo físico de cierre');
    expect(balanceOf(s.journal, '5195')).toBe(3 * s.products[0].cost);
    assertBooks(s);
  });
});

describe('cierre del día y automatización', () => {
  it('es determinista y mantiene los libros cuadrados durante 60 días con reglas activas', () => {
    const run = () => {
      let s = ws('cafe');
      for (const r of s.rules) s = saveRule(s, r.id, { active: true });
      s = toggleWebPublish(s, 'prd3');
      for (const p of s.products) s = { ...s, products: s.products.map((x) => (x.id === p.id ? { ...x, reorderPoint: 20, reorderQty: 60 } : x)) };
      for (let i = 0; i < 60; i++) {
        s = closeDay(s);
        for (const po of s.purchaseOrders.filter((x) => x.status === 'aprobada' && x.expectedDay <= s.day)) s = receivePurchaseOrder(s, po.id);
      }
      return s;
    };
    const a = run();
    const b = run();
    expect(a.salesOrders.length).toBe(b.salesOrders.length);
    expect(a.journal.length).toBe(b.journal.length);
    expect(a.salesOrders.filter((o) => o.channel === 'web').length).toBeGreaterThan(30);
    expect(a.stats.reglas_ejecutadas).toBeGreaterThan(10);
    expect(a.stats.meses_cerrados).toBe(2);
    expect(a.products.every((p) => p.stock >= 0)).toBe(true);
    assertBooks(a);
    expect(incomeStatement(a.journal).revenue).toBeGreaterThan(0);
  });

  it('las acciones automáticas no cuentan como acciones del estudiante', () => {
    let s = ws();
    for (const r of s.rules) s = saveRule(s, r.id, { active: true });
    for (let i = 0; i < 10; i++) s = closeDay(s);
    expect(s.stats.pedido_despachado ?? 0).toBe(0);
    expect(s.stats.auto_pedido_despachado ?? 0).toBeGreaterThan(0);
  });
});

describe('validaciones de maestros', () => {
  it('rechaza datos inválidos con mensajes claros', () => {
    const s = ws();
    expect(() => saveCustomer(s, { name: 'X', docType: 'NIT', docNumber: '1', city: '', segment: 'Minorista', email: '', phone: '', creditLimit: 0, paymentTerm: 0 })).toThrow(/al menos 3/);
    expect(() => saveCustomer(s, { name: 'Empresa Nueva', docType: 'NIT', docNumber: '901456123', city: '', segment: 'Mayorista', email: '', phone: '', creditLimit: 0, paymentTerm: 0 })).toThrow(/Ya existe/);
    expect(() => updateSettings(s, { nit: '123' })).toThrow(/NIT/);
    expect(() => moveOpportunity(s, 'opo3', 'ganada')).toThrow(/cliente registrado/);
    expect(() => resolveCase(s, 'cas1', 'ok')).toThrow(/mínimo 10/);
    const ok = saveCustomer(s, { name: 'Empresa Nueva S.A.S.', docType: 'NIT', docNumber: '901999888', city: 'Barranquilla', segment: 'Corporativo', email: 'compras@nueva.co', phone: '', creditLimit: 5000000, paymentTerm: 30 });
    expect(last(ok.customers).code).toBe('CL-0007');
    expect(new Set(ok.customers.map((c) => c.id)).size).toBe(ok.customers.length);
  });
});
