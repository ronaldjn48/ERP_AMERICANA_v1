// Bitácora de aprendizaje: preguntas de reflexión e informe de la práctica (lo usan el estudiante y la vista del docente).
import { decisionIndicators } from './insights';
import { MISSIONS, levelOf } from './missions';
import type { ErpState } from './types';

export const JOURNAL_PROMPTS = [
  '¿Qué decisión tomaste en el ERP que más mejoró un indicador? Nombra el indicador y su valor antes y después.',
  '¿Qué error o faltante tuviste y qué hiciste para corregirlo (compra, cobro, ajuste o automatización)?',
  '¿Cómo se conectan las áreas de la empresa? Explica cómo una venta afectó el inventario, la cartera y la contabilidad.',
  '¿Qué regla de decisión aplicarías en una empresa real de tu región y por qué?',
];

export const STATUS_LABEL = { bien: 'en meta', atencion: 'atención', critico: 'crítico', 'sin-datos': 'sin datos' } as const;

export function learningReport(s: ErpState, answers: string[] = s.reflections ?? []): string {
  const lvl = levelOf(s.gamification.xp);
  return [
    `Bitácora de aprendizaje · ERP Americana`,
    `Estudiante: ${s.profile.name}${s.profile.group ? ` · ${s.profile.group}` : ''}`,
    `Empresa: ${s.settings.companyName} · día ${s.day} de operación`,
    `Nivel: ${lvl.name} · ${s.gamification.xp} XP · ${Object.keys(s.gamification.completed).length} de ${MISSIONS.length} misiones · ${s.gamification.badges.length} insignias`,
    '',
    'Misiones completadas y reglas de decisión:',
    ...MISSIONS.filter((x) => s.gamification.completed[x.id] !== undefined).map((x) => `- ${x.title} (día ${s.gamification.completed[x.id]}): ${x.takeaway}`),
    '',
    'Indicadores al cierre:',
    ...decisionIndicators(s).map((i) => `- ${i.label}: ${i.value} (${i.target}) · ${STATUS_LABEL[i.status]}`),
    '',
    'Reflexión:',
    ...JOURNAL_PROMPTS.map((p, i) => `${i + 1}. ${p}\n${(answers[i] ?? '').trim() || '(sin respuesta)'}`),
  ].join('\n');
}

/** Valida un respaldo pegado por el docente. Devuelve el estado o el motivo del rechazo. */
export function parseBackup(text: string): ErpState | string {
  let data: unknown;
  try {
    data = JSON.parse(text.trim());
  } catch {
    return 'El texto no es un respaldo válido. Pide al estudiante que use Configuración → Copiar respaldo y pegue el texto completo.';
  }
  const s = data as Partial<ErpState>;
  if (!s || s.version !== 1 || !s.gamification || !Array.isArray(s.journal) || !Array.isArray(s.salesOrders) || !s.settings || !s.profile) {
    return 'El texto no corresponde a un respaldo de ERP Americana.';
  }
  return s as ErpState;
}
