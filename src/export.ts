import { MONTHS } from './engine/scenarios';
import type { PeriodResult, SimConfig, StudentProfile } from './engine/types';
import { encodeConfig } from './engine/config';

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'estudiante';

const COLUMNS: Array<[string, (r: PeriodResult) => string | number]> = [
  ['Mes', (r) => r.period],
  ['Mes calendario', (r) => MONTHS[r.month]],
  ['Evento', (r) => r.event?.title ?? ''],
  ['Precio', (r) => r.decisions.price],
  ['Compra local', (r) => r.unitsPurchasedLocal],
  ['Importación', (r) => r.unitsPurchasedImport],
  ['Meta Ads', (r) => r.decisions.metaBudget],
  ['TikTok Ads', (r) => r.decisions.tiktokBudget],
  ['Asesores', (r) => r.decisions.agents],
  ['Demanda (unid.)', (r) => r.demandUnits],
  ['Ventas (unid.)', (r) => r.unitsSold],
  ['Nivel de servicio', (r) => r.fillRate.toFixed(4)],
  ['Inventario final', (r) => r.endInventory],
  ['Ingresos', (r) => r.revenue],
  ['Costo de ventas', (r) => r.costs.cogs],
  ['Utilidad bruta', (r) => r.grossProfit],
  ['Utilidad antes de impuestos', (r) => r.ebt],
  ['Impuesto', (r) => r.tax],
  ['Utilidad neta', (r) => r.netIncome],
  ['Caja final', (r) => r.cashEnd],
  ['Deuda', (r) => r.debt],
  ['Sobregiro', (r) => r.overdraft],
  ['Patrimonio', (r) => r.equity],
  ['Clientes activos', (r) => r.customers],
  ['Satisfacción', (r) => r.satisfaction.toFixed(1)],
  ['ROAS Meta', (r) => (r.kpis.roasMeta === null ? '' : r.kpis.roasMeta.toFixed(2))],
  ['ROAS TikTok', (r) => (r.kpis.roasTiktok === null ? '' : r.kpis.roasTiktok.toFixed(2))],
  ['ROAS de equilibrio', (r) => (r.kpis.breakEvenRoas === null ? '' : r.kpis.breakEvenRoas.toFixed(2))],
  ['Puntaje finanzas', (r) => r.score.financial],
  ['Puntaje clientes', (r) => r.score.customer],
  ['Puntaje procesos', (r) => r.score.process],
  ['Puntaje total', (r) => r.score.total],
];

/** Versión incrustada (iframe sin descargas ni impresión): se activa al compilar con VITE_EMBED=1. */
export const EMBED = import.meta.env.VITE_EMBED === '1';

/** Copia texto al portapapeles. Devuelve false si el navegador lo impide. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** CSV con separador punto y coma, que Excel en español abre sin configuración adicional. */
export function buildCsv(history: PeriodResult[], profile: StudentProfile, config: SimConfig): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const meta = [`Estudiante;${esc(profile.name)}`, `Grupo;${esc(profile.group)}`, `Código de partida;${encodeConfig(config)}`, ''];
  const header = COLUMNS.map(([h]) => esc(h)).join(';');
  const rows = history.map((r) => COLUMNS.map(([, f]) => esc(f(r))).join(';'));
  return [...meta, header, ...rows].join('\r\n');
}

export function exportCsv(history: PeriodResult[], profile: StudentProfile, config: SimConfig) {
  // El BOM inicial hace que Excel reconozca las tildes (UTF-8).
  download(`erp-americana-${slug(profile.name)}.csv`, '\ufeff' + buildCsv(history, profile, config), 'text/csv;charset=utf-8');
}

export function exportJson(data: unknown, profile: StudentProfile) {
  download(`erp-americana-${slug(profile.name)}.json`, JSON.stringify(data, null, 2), 'application/json');
}
