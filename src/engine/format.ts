const copFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const intFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const decFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2, minimumFractionDigits: 2 });

export const cop = (n: number): string => copFormatter.format(Math.round(n)).replace(/ /g, ' ');
export const num = (n: number): string => intFormatter.format(Math.round(n));
export const dec = (n: number): string => decFormatter.format(n);
export const pct = (ratio: number, digits = 1): string =>
  `${(ratio * 100).toLocaleString('es-CO', { maximumFractionDigits: digits, minimumFractionDigits: digits })} %`;

/** Millones con un decimal: 12,5 M. Útil en gráficas y tarjetas. */
export const millions = (n: number): string =>
  `${(n / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} M`;

/** Texto de dinero pensado para leerse en voz alta sin símbolos que la voz sintética pronuncie mal. */
export function pesosHabla(n: number): string {
  const sign = n < 0 ? 'menos ' : '';
  const a = Math.abs(n);
  if (a >= 1e6) {
    const m = (a / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 });
    return `${sign}${m} ${m === '1' ? 'millón' : 'millones'} de pesos`;
  }
  if (a >= 1e3) return `${sign}${Math.round(a / 1e3)} mil pesos`;
  return `${sign}${Math.round(a)} pesos`;
}

export const pctHabla = (ratio: number): string =>
  `${(ratio * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 })} por ciento`;

/** Limpia un texto de pantalla para la síntesis de voz: símbolos, abreviaturas y espacios. */
export function toSpeech(text: string): string {
  return text
    .replace(/\$\s?([\d.]+)/g, (_m, digits: string) => pesosHabla(Number(digits.replace(/\./g, ''))))
    .replace(/(\d+(?:,\d+)?)\s?%/g, '$1 por ciento')
    .replace(/\bROAS\b/g, 'ROAS')
    .replace(/\bCAC\b/g, 'C A C')
    .replace(/\bTRM\b/g, 'T R M')
    .replace(/\bCRM\b/g, 'C R M')
    .replace(/\bERP\b/g, 'E R P')
    .replace(/\bCPC\b/g, 'costo por clic')
    .replace(/\bUSD\b/g, 'dólares')
    .replace(/\bCOP\b/g, 'pesos')
    .replace(/[•·]/g, ',')
    .replace(/[*_#>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
