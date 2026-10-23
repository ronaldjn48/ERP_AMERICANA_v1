import type { ErpState, JournalEntry, JournalLine } from './types';

export type AccountClass = 'activo' | 'pasivo' | 'patrimonio' | 'ingreso' | 'gasto' | 'costo';

export interface Account {
  code: string;
  name: string;
  cls: AccountClass;
  /** Naturaleza: débito o crédito. */
  nature: 'D' | 'C';
}

/** Plan de cuentas simplificado basado en el PUC colombiano (Decreto 2650 de 1993). */
export const ACCOUNTS: Account[] = [
  { code: '1110', name: 'Bancos', cls: 'activo', nature: 'D' },
  { code: '1305', name: 'Clientes', cls: 'activo', nature: 'D' },
  { code: '1435', name: 'Mercancías no fabricadas por la empresa', cls: 'activo', nature: 'D' },
  { code: '2205', name: 'Proveedores nacionales', cls: 'pasivo', nature: 'C' },
  { code: '2408', name: 'Impuesto sobre las ventas por pagar (IVA)', cls: 'pasivo', nature: 'C' },
  { code: '3105', name: 'Capital suscrito y pagado', cls: 'patrimonio', nature: 'C' },
  { code: '4135', name: 'Comercio al por mayor y al por menor', cls: 'ingreso', nature: 'C' },
  { code: '4250', name: 'Recuperaciones', cls: 'ingreso', nature: 'C' },
  { code: '5105', name: 'Gastos de personal', cls: 'gasto', nature: 'D' },
  { code: '5120', name: 'Arrendamientos', cls: 'gasto', nature: 'D' },
  { code: '5135', name: 'Servicios', cls: 'gasto', nature: 'D' },
  { code: '5235', name: 'Publicidad y pauta digital', cls: 'gasto', nature: 'D' },
  { code: '5305', name: 'Gastos financieros (comisiones de pasarela)', cls: 'gasto', nature: 'D' },
  { code: '5195', name: 'Diversos (faltantes de inventario)', cls: 'gasto', nature: 'D' },
  { code: '6135', name: 'Costo de ventas: comercio al por mayor y al por menor', cls: 'costo', nature: 'D' },
];

export const accountName = (code: string): string => ACCOUNTS.find((a) => a.code === code)?.name ?? code;

export function isBalanced(lines: JournalLine[]): boolean {
  const d = lines.reduce((a, l) => a + l.debit, 0);
  const c = lines.reduce((a, l) => a + l.credit, 0);
  return Math.abs(d - c) < 1 && d > 0;
}

/** Saldo de una cuenta según su naturaleza (positivo = saldo normal). */
export function balanceOf(journal: JournalEntry[], code: string, uptoDay = Infinity, fromDay = -Infinity): number {
  const acc = ACCOUNTS.find((a) => a.code === code);
  let d = 0;
  let c = 0;
  for (const e of journal) {
    if (e.day > uptoDay || e.day < fromDay) continue;
    for (const l of e.lines) {
      if (l.account !== code) continue;
      d += l.debit;
      c += l.credit;
    }
  }
  return Math.round(acc?.nature === 'C' ? c - d : d - c);
}

export interface TrialRow {
  code: string;
  name: string;
  debit: number;
  credit: number;
  balanceD: number;
  balanceC: number;
}

export function trialBalance(journal: JournalEntry[]): { rows: TrialRow[]; totals: { debit: number; credit: number } } {
  const rows: TrialRow[] = [];
  for (const a of ACCOUNTS) {
    let debit = 0;
    let credit = 0;
    for (const e of journal) for (const l of e.lines) if (l.account === a.code) {
      debit += l.debit;
      credit += l.credit;
    }
    if (debit === 0 && credit === 0) continue;
    const net = debit - credit;
    rows.push({ code: a.code, name: a.name, debit, credit, balanceD: net > 0 ? net : 0, balanceC: net < 0 ? -net : 0 });
  }
  return {
    rows,
    totals: { debit: rows.reduce((s, r) => s + r.debit, 0), credit: rows.reduce((s, r) => s + r.credit, 0) },
  };
}

export interface IncomeStatement {
  revenue: number;
  otherIncome: number;
  cogs: number;
  grossProfit: number;
  expenses: Array<{ code: string; name: string; value: number }>;
  totalExpenses: number;
  operatingProfit: number;
}

export function incomeStatement(journal: JournalEntry[], fromDay = -Infinity, toDay = Infinity): IncomeStatement {
  const bal = (code: string) => balanceOf(journal, code, toDay, fromDay);
  const revenue = bal('4135');
  const otherIncome = bal('4250');
  const cogs = bal('6135');
  const expenses = ACCOUNTS.filter((a) => a.cls === 'gasto')
    .map((a) => ({ code: a.code, name: a.name, value: bal(a.code) }))
    .filter((x) => x.value !== 0);
  const totalExpenses = expenses.reduce((s, x) => s + x.value, 0);
  const grossProfit = revenue - cogs;
  return { revenue, otherIncome, cogs, grossProfit, expenses, totalExpenses, operatingProfit: grossProfit + otherIncome - totalExpenses };
}

export interface BalanceSheet {
  assets: Array<{ code: string; name: string; value: number }>;
  liabilities: Array<{ code: string; name: string; value: number }>;
  equity: Array<{ code: string; name: string; value: number }>;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

export function balanceSheet(journal: JournalEntry[]): BalanceSheet {
  const pick = (cls: string) =>
    ACCOUNTS.filter((a) => a.cls === cls)
      .map((a) => ({ code: a.code, name: a.name, value: balanceOf(journal, a.code) }))
      .filter((x) => x.value !== 0);
  const assets = pick('activo');
  const liabilities = pick('pasivo');
  const equity = pick('patrimonio');
  const result = incomeStatement(journal).operatingProfit;
  equity.push({ code: '3605', name: 'Utilidad del ejercicio', value: result });
  const sum = (xs: Array<{ value: number }>) => xs.reduce((s, x) => s + x.value, 0);
  return {
    assets,
    liabilities,
    equity,
    totalAssets: sum(assets),
    totalLiabilities: sum(liabilities),
    totalEquity: sum(equity),
  };
}

export const cashOf = (s: ErpState): number => balanceOf(s.journal, '1110');
