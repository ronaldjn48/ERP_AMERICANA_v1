// Contenido completo del ERP y del simulador para la vista del docente: misiones con respuestas, empresas,
// indicadores, reglas, eventos y preguntas. Sin React, para usarlo también en el documento generado.
import { GLOSSARY, LEARNING_OUTCOMES, QUIZ, REFLECTION_PROMPTS } from '../content/pedagogy';
import { DIFFICULTIES, MODULE_INFO, MODULE_ORDER, defaultConfig } from '../engine/config';
import { eventCatalog } from '../engine/events';
import { cop, pct } from '../engine/format';
import { SCENARIOS } from '../engine/scenarios';
import type { Scenario, SimConfig } from '../engine/types';
import { MONTHLY_COSTS } from './day';
import { decisionIndicators } from './insights';
import { GUIDES, MODULE_LABEL, RULE_INFO } from './meta';
import { BADGES, LEVELS, MISSIONS, TOTAL_XP, type Mission } from './missions';
import { JOURNAL_PROMPTS } from './report';
import { CATALOG, CUSTOMERS, DEFAULT_RULES, createWorkspace } from './seed';
import type { ModuleKey } from './types';

export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const TEACHER_KEY = 'AMERICANA-DOCENTE';

export const SESSIONS = [
  { name: '1. Navegación y CRM', missions: '1 a 4', days: '1 a 5', focus: 'Datos maestros, embudo comercial y servicio al cliente' },
  { name: '2. Ventas e inventario', missions: '5 a 8', days: '5 a 10', focus: 'Descuentos con margen, kardex y punto de reorden' },
  { name: '3. Compras y comercio electrónico', missions: '9 a 13', days: '10 a 20', focus: 'Proveedores, precio y rentabilidad de la pauta' },
  { name: '4. Contabilidad, automatización y cierre', missions: '14 a 20', days: '20 a 33', focus: 'Cartera, flujos automáticos, cierre del mes y simulador' },
];

export const DURATION =
  'Las 20 misiones exigen como mínimo 30 días simulados, porque la misión 18 pide cerrar el primer mes. Un día simulado avanza con el botón Cerrar día y toma de 1 a 4 minutos. El tiempo real estimado es de 6 a 8 horas, incluido el simulador gerencial (unos 40 minutos). Se recomiendan cuatro sesiones de 90 a 120 minutos.';

export const GRADE_SCALE = [
  { from: '4,5', label: 'Desempeño excelente' },
  { from: '4,0', label: 'Desempeño sobresaliente' },
  { from: '3,0', label: 'Desempeño aprobatorio' },
  { from: '0,0', label: 'Desempeño por mejorar' },
];

export const missionNumber = (m: Mission) => Number(m.id.slice(1));
export const missionTitle = (id: string) => MISSIONS.find((m) => m.id === id)?.title ?? id;

/** Configuración con todos los módulos activos, para saber qué eventos pueden aparecer en cada empresa. */
export function fullConfig(scenarioId: string): SimConfig {
  const c = defaultConfig();
  return { ...c, scenarioId, modules: Object.fromEntries(MODULE_ORDER.map((m) => [m, true])) as SimConfig['modules'] };
}

export const scenarioEvents = (s: Scenario) => eventCatalog(s, fullConfig(s.id));

/** Indicadores con sus metas y explicaciones, calculados sobre una empresa recién creada. */
export const indicatorCatalog = () => decisionIndicators(createWorkspace({ name: 'Docente', group: '' }, 'tech', 1));

export function catalogOf(scenarioId: string) {
  const cat = CATALOG[scenarioId] ?? CATALOG.tech;
  return {
    products: cat.products,
    suppliers: cat.suppliers.map(([name, nit, city, leadTimeDays, paymentTermDays]) => ({ name, nit, city, leadTimeDays, paymentTermDays })),
  };
}

export const CONTENT_COUNTS = () => [
  ['Módulos del ERP', String(Object.keys(MODULE_LABEL).length)],
  ['Misiones', String(MISSIONS.length)],
  ['Preguntas de verificación', String(MISSIONS.reduce((a, m) => a + m.objectives.filter((o) => o.kind === 'question').length, 0))],
  ['Experiencia total', `${TOTAL_XP} XP`],
  ['Niveles', String(LEVELS.length)],
  ['Insignias', String(BADGES.length)],
  ['Indicadores para decidir', String(indicatorCatalog().length)],
  ['Reglas de automatización', String(DEFAULT_RULES.length)],
  ['Empresas', String(SCENARIOS.length)],
  ['Eventos del simulador', String(scenarioEvents(SCENARIOS[0]).length)],
  ['Preguntas de conceptos', String(QUIZ.length)],
  ['Términos del glosario', String(GLOSSARY.length)],
] as Array<[string, string]>;

/** Todo el contenido en texto con formato Markdown, para copiarlo o guardarlo como documento. */
export function teacherContentText(): string {
  const out: string[] = [];
  const h = (level: number, t: string) => out.push('', `${'#'.repeat(level)} ${t}`, '');
  const row = (cells: string[]) => out.push(`| ${cells.map((c) => c.replace(/\|/g, '/')).join(' | ')} |`);
  const table = (head: string[], rows: string[][]) => {
    row(head);
    out.push(`|${head.map(() => '---').join('|')}|`);
    rows.forEach(row);
  };

  out.push('# ERP Americana · Contenido para el docente');
  out.push('', 'Este documento reúne todo el contenido del ERP y del simulador gerencial, con las respuestas de las preguntas. Se genera desde el código del aplicativo, así que coincide con lo que ve el estudiante.');

  h(2, '1. Resumen');
  table(['Elemento', 'Cantidad'], CONTENT_COUNTS());
  h(3, 'Duración');
  out.push(DURATION, '');
  table(['Sesión', 'Misiones', 'Días simulados', 'Enfoque de decisión'], SESSIONS.map((x) => [x.name, x.missions, x.days, x.focus]));
  h(3, 'Resultados de aprendizaje');
  LEARNING_OUTCOMES.forEach((o, i) => out.push(`${i + 1}. ${o}`));
  h(3, 'Niveles');
  table(['Nivel', 'Desde'], LEVELS.map((l) => [l.name, `${l.xp} XP`]));
  h(3, 'Insignias');
  table(['Insignia', 'Cómo se gana'], BADGES.map((b) => [b.name, b.description]));
  h(3, 'Bitácora de aprendizaje');
  out.push('Una sola bitácora para todo el ejercicio, en el Centro de misiones. El informe copiado incluye nivel, XP, misiones con su regla de decisión, los indicadores al cierre y estas respuestas.', '');
  JOURNAL_PROMPTS.forEach((p, i) => out.push(`${i + 1}. ${p}`));

  h(2, '2. Módulos del ERP');
  (Object.keys(GUIDES) as ModuleKey[]).forEach((k) => {
    const g = GUIDES[k]!;
    h(3, `${MODULE_LABEL[k]}: ${g.title}`);
    out.push(g.text, '');
    g.steps.forEach((st, i) => out.push(`${i + 1}. ${st}`));
  });

  h(2, '3. Misiones con respuestas');
  MISSIONS.forEach((m) => {
    h(3, `Misión ${missionNumber(m)}. ${m.title}`);
    out.push(`Módulo: ${MODULE_LABEL[m.module]} · ${m.xp} XP · Concepto: ${m.concept}`);
    out.push(`Requisitos: ${m.requires.length ? m.requires.map(missionTitle).join(', ') : 'ninguno'}`, '');
    out.push(m.briefing, '');
    m.objectives.forEach((o, i) => {
      if (o.kind === 'check') out.push(`${i + 1}. Acción: ${o.text}`);
      else out.push(`${i + 1}. Pregunta: ${o.question}`, `   Pista para el estudiante: ${o.hint}`, `   Respuesta: ${o.solution}`);
    });
    out.push('', `Regla de decisión: ${m.takeaway}`);
  });

  h(2, '4. Indicadores para decidir');
  table(['Indicador', 'Meta', 'Qué significa', 'Qué hacer'], indicatorCatalog().map((i) => [i.label, i.target, i.meaning, i.action]));

  h(2, '5. Empresas');
  SCENARIOS.forEach((sc) => {
    const cat = catalogOf(sc.id);
    h(3, `${sc.company} · ${sc.sector}`);
    out.push(sc.description, '', `Reto: ${sc.challenge}`, '');
    out.push('Temporadas:');
    Object.entries(sc.seasonNotes).forEach(([m, t]) => out.push(`- ${MONTHS[Number(m)]}: ${t}`));
    out.push('');
    table(['SKU', 'Producto', 'Costo', 'Precio', 'Margen', 'Stock inicial', 'Proveedor'], cat.products.map((p) => [p.sku, p.name, cop(p.cost), cop(p.price), pct(1 - p.cost / p.price, 0), `${p.stock} ${p.unit}`, cat.suppliers[p.supplier]?.name ?? '']));
    out.push('');
    table(['Proveedor', 'Ciudad', 'Entrega', 'Plazo de pago'], cat.suppliers.map((x) => [x.name, x.city, `${x.leadTimeDays} días`, `${x.paymentTermDays} días`]));
  });
  h(3, 'Clientes iniciales (iguales en las tres empresas)');
  table(['Cliente', 'Ciudad', 'Segmento', 'Cupo', 'Plazo'], CUSTOMERS.map((c) => [c.name, c.city, c.segment, c.creditLimit ? cop(c.creditLimit) : 'Contado', c.paymentTerm ? `${c.paymentTerm} días` : 'Contado']));
  out.push('', 'La empresa abre con dos facturas a crédito emitidas antes de la apertura (cartera heredada) para practicar el cobro en la misión 15.');
  h(3, 'Gastos fijos mensuales');
  table(['Cuenta', 'Concepto', 'Valor'], MONTHLY_COSTS.map((c) => [c.account, c.label, cop(c.value)]));

  h(2, '6. Reglas de automatización');
  table(['Regla', 'Cuando', 'Entonces'], DEFAULT_RULES.map((r) => [r.name, RULE_INFO[r.type].when, RULE_INFO[r.type].then]));

  h(2, '7. Simulador gerencial');
  out.push('La misión 20 exige completar una partida con nota de 3,5 o más. La nota es el promedio mensual del cuadro de mando (finanzas 40, clientes 30, procesos 30) llevado a escala de 0 a 5.', '');
  table(['Nota desde', 'Resultado'], GRADE_SCALE.map((g) => [g.from, g.label]));
  h(3, 'Niveles de dificultad');
  table(['Nivel', 'Descripción', 'Probabilidad de evento por mes'], Object.values(DIFFICULTIES).map((d) => [d.label, d.description, pct(d.eventProbability, 0)]));
  h(3, 'Áreas de decisión');
  MODULE_ORDER.forEach((m) => out.push(`- ${MODULE_INFO[m].label}: ${MODULE_INFO[m].description}`));
  h(3, 'Eventos del mercado');
  scenarioEvents(SCENARIOS[0]).forEach((e) => {
    const only = SCENARIOS.filter((sc) => !scenarioEvents(sc).find((x) => x.id === e.id)?.applies).map((sc) => sc.company);
    out.push(`- ${e.title}${only.length ? ` (no aplica en ${only.join(', ')})` : ''}: ${e.description} Lección: ${e.lesson}`);
  });
  h(3, 'Preguntas de conceptos con respuesta');
  QUIZ.forEach((q, i) => {
    out.push(`${i + 1}. ${q.context} ${q.question}`);
    q.options.forEach((o, j) => out.push(`   ${String.fromCharCode(97 + j)}) ${o}${j === q.answer ? '  ← correcta' : ''}`));
    out.push(`   Explicación: ${q.explanation}`, '');
  });
  h(3, 'Reflexión del informe final del simulador');
  REFLECTION_PROMPTS.forEach((p, i) => out.push(`${i + 1}. ${p}`));
  h(3, 'Glosario');
  GLOSSARY.forEach((g) => out.push(`- ${g.term}: ${g.definition}${g.formula ? ` Fórmula: ${g.formula}` : ''}`));

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
