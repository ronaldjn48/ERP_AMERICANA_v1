// Gamificación: misiones por módulo con objetivos verificables en los datos del ERP,
// preguntas de aplicación, puntos de experiencia (XP), niveles e insignias.

import { balanceOf, incomeStatement } from './accounts';
import { orderTotals } from './ops';
import type { ErpState, ModuleKey } from './types';

export interface CheckObjective {
  id: string;
  kind: 'check';
  text: string;
  check: (s: ErpState, ctx: MissionContext) => boolean;
  /** Pantalla donde se cumple el objetivo (para el botón "Ir"). */
  go?: { module: ModuleKey; view?: string };
}

export interface QuestionObjective {
  id: string;
  kind: 'question';
  text: string;
  question: string;
  answer: (s: ErpState) => number;
  tolerance: (expected: number) => number;
  unit: 'pesos' | 'unidades' | 'clientes' | 'veces';
  hint: string;
  /** Explicación de la respuesta para la vista del docente. */
  solution: string;
  go?: { module: ModuleKey; view?: string };
}

export type Objective = CheckObjective | QuestionObjective;

export interface Mission {
  id: string;
  module: ModuleKey;
  title: string;
  concept: string;
  briefing: string;
  objectives: Objective[];
  xp: number;
  requires: string[];
  /** Regla de decisión que el estudiante se lleva al completar la misión. */
  takeaway: string;
}

export interface MissionContext {
  simGrade: number | null;
}

const st = (s: ErpState, k: string) => s.stats[k] ?? 0;
const exact = () => 0;
const pesos = (v: number) => Math.max(1, Math.abs(v) * 0.001);

function lastUserInvoiceIva(s: ErpState): number {
  const invoiced = s.salesOrders.filter((o) => o.invoiceNumber && o.origin !== 'sistema');
  const all = invoiced.length ? invoiced : s.salesOrders.filter((o) => o.invoiceNumber);
  const last = all.sort((a, b) => (a.invoiceNumber! < b.invoiceNumber! ? 1 : -1))[0];
  return last ? orderTotals(last.lines, s.settings.ivaRate).iva : 0;
}

export const MISSIONS: Mission[] = [
  {
    id: 'm01',
    takeaway: 'Antes de operar, verifica que los datos maestros estén completos: un NIT o una dirección errados se repiten en cada factura y en cada informe.',
    module: 'inicio',
    title: 'Primer día en la empresa',
    concept: 'Datos maestros y navegación del ERP',
    briefing:
      'Bienvenido a tu primer día como analista. Un ERP integra todas las áreas de la empresa en una sola base de datos. Antes de operar, registra los datos legales de la empresa (NIT, ciudad de la sede y dirección; elige la ciudad donde estudias o trabajas), recorre los módulos principales y cierra tu primer día de operación con el botón Cerrar día de la barra superior.',
    xp: 100,
    requires: [],
    objectives: [
      { id: 'o1', kind: 'check', text: 'Registra el NIT, la ciudad y la dirección de la empresa en Configuración', check: (s) => Boolean(s.settings.nit && s.settings.city.trim().length >= 3 && s.settings.address.trim().length >= 5), go: { module: 'configuracion' } },
      { id: 'o2', kind: 'check', text: 'Visita los módulos CRM, Ventas, Inventario y Contabilidad', check: (s) => ['crm', 'ventas', 'inventario', 'contabilidad'].every((m) => s.visited[m]), go: { module: 'crm' } },
      { id: 'o3', kind: 'check', text: 'Cierra tu primer día de operación', check: (s) => st(s, 'dias_cerrados') >= 1 },
    ],
  },
  {
    id: 'm02',
    takeaway: 'Asigna cupo de crédito según la capacidad de pago del cliente: un cupo alto vende más, pero aumenta el riesgo de cartera.',
    module: 'crm',
    title: 'Registra un cliente corporativo',
    concept: 'Maestro de clientes en el CRM',
    briefing:
      'En el CRM cada cliente necesita datos completos: documento, correo, segmento, cupo de crédito y plazo de pago. Con esos datos el ERP decide si puede venderle a crédito. Crea un cliente corporativo y luego responde cuántos clientes activos tiene la empresa.',
    xp: 120,
    requires: ['m01'],
    objectives: [
      { id: 'o1', kind: 'check', text: 'Crea un cliente corporativo con NIT, correo y cupo de crédito', check: (s) => st(s, 'cliente_corporativo_completo') >= 1, go: { module: 'crm', view: 'clientes' } },
      { id: 'o2', kind: 'question', text: 'Responde la pregunta de verificación', question: '¿Cuántos clientes activos tiene la empresa en este momento?', answer: (s) => s.customers.filter((c) => c.active).length, tolerance: exact, unit: 'clientes', hint: 'Mira el contador de la lista de clientes en el CRM.', solution: 'Clientes con estado activo en el CRM. La empresa abre con 6; cada cliente creado suma 1 y cada cliente inactivado resta 1. Se exige el valor exacto.', go: { module: 'crm', view: 'clientes' } },
    ],
  },
  {
    id: 'm03',
    takeaway: 'Mide el embudo por etapas: el pronóstico ponderado (valor × probabilidad) es más realista que sumar todas las oportunidades.',
    module: 'crm',
    title: 'Gestiona el embudo comercial',
    concept: 'Etapas del embudo y conversión a venta',
    briefing:
      'Las oportunidades avanzan por etapas: prospecto, calificado, propuesta, negociación y cierre. Mueve una oportunidad hasta propuesta, gana otra y conviértela en una cotización. Así el CRM alimenta directamente el módulo de ventas.',
    xp: 150,
    requires: ['m02'],
    objectives: [
      { id: 'o1', kind: 'check', text: 'Mueve una oportunidad a la etapa Propuesta', check: (s) => st(s, 'oportunidad_propuesta') >= 1, go: { module: 'crm', view: 'oportunidades' } },
      { id: 'o2', kind: 'check', text: 'Marca una oportunidad como Ganada', check: (s) => st(s, 'oportunidad_ganada') >= 1, go: { module: 'crm', view: 'oportunidades' } },
      { id: 'o3', kind: 'check', text: 'Crea la cotización desde la oportunidad ganada', check: (s) => s.salesOrders.some((o) => o.opportunityId && o.origin === 'usuario'), go: { module: 'crm', view: 'oportunidades' } },
    ],
  },
  {
    id: 'm04',
    takeaway: 'Atiende primero los casos de prioridad alta y responde en menos de dos días: la demora convierte una duda en un reclamo.',
    module: 'crm',
    title: 'Servicio al cliente',
    concept: 'Gestión de casos y tiempos de respuesta',
    briefing:
      'Los casos de servicio registran reclamos y solicitudes. Un caso sin respuesta afecta la reputación de la marca. Toma un caso, resuelve tres y atiende al menos uno de prioridad alta. Registra la solución con claridad: queda en el historial del cliente.',
    xp: 150,
    requires: ['m02'],
    objectives: [
      { id: 'o1', kind: 'check', text: 'Pon un caso en proceso', check: (s) => st(s, 'caso_en_proceso') >= 1, go: { module: 'crm', view: 'casos' } },
      { id: 'o2', kind: 'check', text: 'Resuelve 3 casos', check: (s) => st(s, 'caso_resuelto') >= 3, go: { module: 'crm', view: 'casos' } },
      { id: 'o3', kind: 'check', text: 'Resuelve un caso de prioridad alta', check: (s) => st(s, 'caso_alta_resuelto') >= 1, go: { module: 'crm', view: 'casos' } },
    ],
  },
  {
    id: 'm05',
    takeaway: 'Una venta solo termina cuando se cobra: vigila el ciclo completo, no solo el pedido.',
    module: 'ventas',
    title: 'Ciclo completo de venta',
    concept: 'Del pedido al recaudo (order to cash)',
    briefing:
      'El ciclo de venta tiene cuatro pasos: confirmar el pedido, despachar la mercancía, emitir la factura electrónica y registrar el pago. Cada paso genera un registro: la reserva de inventario, la salida en el kardex, la cuenta por cobrar con el IVA y el ingreso a bancos.',
    xp: 200,
    requires: ['m01'],
    objectives: [
      { id: 'o1', kind: 'check', text: 'Confirma una cotización', check: (s) => st(s, 'pedido_confirmado') >= 1, go: { module: 'ventas' } },
      { id: 'o2', kind: 'check', text: 'Despacha un pedido', check: (s) => st(s, 'pedido_despachado') >= 1, go: { module: 'ventas' } },
      { id: 'o3', kind: 'check', text: 'Emite una factura electrónica', check: (s) => st(s, 'pedido_facturado') >= 1, go: { module: 'ventas' } },
      { id: 'o4', kind: 'check', text: 'Registra el pago de un pedido', check: (s) => st(s, 'pedido_pagado') >= 1, go: { module: 'ventas' } },
      { id: 'o5', kind: 'question', text: 'Responde la pregunta de verificación', question: '¿Cuánto IVA se causó en la última factura que emitiste?', answer: lastUserInvoiceIva, tolerance: pesos, unit: 'pesos', hint: 'Abre el pedido facturado y mira el resumen: subtotal × tarifa de IVA.', solution: 'IVA de la última factura que emitió el estudiante: subtotal después de descuentos × 19 %. Se lee en el resumen del pedido. Tolerancia de 0,1 %.', go: { module: 'ventas' } },
    ],
  },
  {
    id: 'm06',
    takeaway: 'Antes de dar un descuento, calcula el margen que queda: un descuento de 10 % puede consumir la cuarta parte de la utilidad bruta.',
    module: 'ventas',
    title: 'Descuento sin perder margen',
    concept: 'Margen bruto y política de descuentos',
    briefing:
      'Un descuento ayuda a cerrar ventas, pero reduce el margen. La política de la empresa permite hasta 10 % de descuento siempre que el margen bruto del pedido sea de al menos 25 %. Crea y confirma un pedido que cumpla las dos condiciones. El formulario del pedido muestra el margen en tiempo real.',
    xp: 120,
    requires: ['m05'],
    objectives: [
      { id: 'o1', kind: 'check', text: 'Confirma un pedido con descuento de 1 % a 10 % y margen bruto ≥ 25 %', check: (s) => st(s, 'venta_descuento_sano') >= 1, go: { module: 'ventas' } },
    ],
  },
  {
    id: 'm07',
    takeaway: 'Concilia el inventario físico con el sistema con frecuencia: cada faltante es un gasto y una venta que ya no podrás hacer.',
    module: 'inventario',
    title: 'Kardex y conteo físico',
    concept: 'Kardex valorizado a costo promedio',
    briefing:
      'El kardex registra cada entrada, salida y ajuste con su costo. Cuando el conteo físico no coincide con el sistema se hace un ajuste: un faltante se lleva al gasto y un sobrante a recuperaciones. Haz un ajuste, revisa el kardex y verifica el valor contable del inventario.',
    xp: 150,
    requires: ['m01'],
    objectives: [
      { id: 'o1', kind: 'check', text: 'Registra un ajuste de inventario por conteo físico', check: (s) => st(s, 'ajuste_inventario') >= 1, go: { module: 'inventario' } },
      { id: 'o2', kind: 'check', text: 'Abre el kardex de un producto', check: (s) => Boolean(s.visited['inventario:kardex']), go: { module: 'inventario' } },
      { id: 'o3', kind: 'question', text: 'Responde la pregunta de verificación', question: '¿Cuál es el saldo de la cuenta 1435 Mercancías en la contabilidad?', answer: (s) => balanceOf(s.journal, '1435'), tolerance: pesos, unit: 'pesos', hint: 'Contabilidad → Balance de prueba, cuenta 1435.', solution: 'Saldo débito de la cuenta 1435 en el balance de prueba: valor del inventario a costo promedio en el momento de responder. Tolerancia de 0,1 %.', go: { module: 'contabilidad', view: 'balance' } },
    ],
  },
  {
    id: 'm08',
    takeaway: 'Pide a tiempo: punto de reorden = demanda diaria × días de entrega + stock de seguridad.',
    module: 'inventario',
    title: 'Punto de reorden',
    concept: 'Punto de reorden = demanda diaria × tiempo de entrega + stock de seguridad',
    briefing:
      'El punto de reorden indica cuándo pedir. Se calcula multiplicando la demanda diaria por el tiempo de entrega del proveedor y sumando un stock de seguridad. Configura el punto de reorden y la cantidad a reponer en tres productos, y resuelve el cálculo de verificación.',
    xp: 150,
    requires: ['m07'],
    objectives: [
      { id: 'o1', kind: 'check', text: 'Configura punto de reorden y cantidad de reposición en 3 productos', check: (s) => s.products.filter((p) => p.reorderPoint > 0 && p.reorderQty > 0).length >= 3, go: { module: 'inventario' } },
      { id: 'o2', kind: 'question', text: 'Resuelve el cálculo', question: 'Un producto vende 4 unidades al día, el proveedor tarda 3 días y quieres 6 unidades de stock de seguridad. ¿Cuál es el punto de reorden?', answer: () => 18, tolerance: exact, unit: 'unidades', hint: 'Demanda diaria × días de entrega + stock de seguridad.', solution: '4 unidades × 3 días + 6 de seguridad = 18 unidades. Se exige el valor exacto.' },
    ],
  },
  {
    id: 'm09',
    takeaway: 'Elige proveedores por costo, tiempo de entrega y plazo de pago, no solo por precio.',
    module: 'compras',
    title: 'Registra un proveedor',
    concept: 'Maestro de proveedores',
    briefing:
      'Un proveedor bien registrado tiene NIT, tiempo de entrega y plazo de pago. El ERP usa el tiempo de entrega para calcular cuándo llega la mercancía y el plazo para programar el pago. Registra un proveedor nuevo.',
    xp: 80,
    requires: ['m01'],
    objectives: [{ id: 'o1', kind: 'check', text: 'Registra un proveedor con NIT, tiempo de entrega y plazo de pago', check: (s) => st(s, 'proveedor_creado') >= 1, go: { module: 'compras', view: 'proveedores' } }],
  },
  {
    id: 'm10',
    takeaway: 'Paga a los proveedores dentro del plazo pactado, pero no antes de cobrar tu cartera: así cuidas la caja sin dañar la relación.',
    module: 'compras',
    title: 'Ciclo completo de compra',
    concept: 'De la orden al pago (procure to pay)',
    briefing:
      'El ciclo de compra tiene cuatro pasos: crear la orden, aprobarla, recibir la mercancía cuando llega y pagar al proveedor. La recepción actualiza el costo promedio y crea la cuenta por pagar con el IVA descontable. Cierra días hasta que llegue la mercancía.',
    xp: 200,
    requires: ['m01'],
    objectives: [
      { id: 'o1', kind: 'check', text: 'Crea una orden de compra', check: (s) => st(s, 'oc_creada') >= 1, go: { module: 'compras' } },
      { id: 'o2', kind: 'check', text: 'Aprueba la orden', check: (s) => st(s, 'oc_aprobada') >= 1, go: { module: 'compras' } },
      { id: 'o3', kind: 'check', text: 'Recibe la mercancía cuando llegue', check: (s) => st(s, 'oc_recibida') >= 1, go: { module: 'compras' } },
      { id: 'o4', kind: 'check', text: 'Paga al proveedor', check: (s) => st(s, 'oc_pagada') >= 1, go: { module: 'compras' } },
      { id: 'o5', kind: 'question', text: 'Responde la pregunta de verificación', question: '¿Cuál es el saldo actual de la cuenta 2205 Proveedores?', answer: (s) => balanceOf(s.journal, '2205'), tolerance: pesos, unit: 'pesos', hint: 'Contabilidad → Balance de prueba, cuenta 2205. Si pagaste todo, es 0.', solution: 'Saldo crédito de la cuenta 2205: compras recibidas y aún no pagadas, con IVA. Si el estudiante pagó todas las órdenes, es 0. Tolerancia de 0,1 %.', go: { module: 'contabilidad', view: 'balance' } },
    ],
  },
  {
    id: 'm11',
    takeaway: 'Publica solo productos con margen y stock: un producto agotado en la tienda genera reclamos, no ventas.',
    module: 'ecommerce',
    title: 'Publica tu catálogo',
    concept: 'Catálogo digital y precio mínimo de venta',
    briefing:
      'La tienda virtual vende los productos publicados en el catálogo. Antes de publicar verifica que el precio cubra el costo, la comisión de la pasarela y el margen. Publica al menos cuatro productos con un precio de al menos 1,3 veces su costo.',
    xp: 100,
    requires: ['m01'],
    objectives: [
      { id: 'o1', kind: 'check', text: 'Publica al menos 4 productos en la tienda', check: (s) => s.products.filter((p) => p.webPublished).length >= 4, go: { module: 'ecommerce' } },
      { id: 'o2', kind: 'check', text: 'Todos los productos publicados tienen precio ≥ 1,3 × costo', check: (s) => s.products.some((p) => p.webPublished) && s.products.filter((p) => p.webPublished).every((p) => p.price >= p.cost * 1.3), go: { module: 'ecommerce' } },
    ],
  },
  {
    id: 'm12',
    takeaway: 'En el comercio electrónico la velocidad es parte del producto: despacha y factura el mismo día.',
    module: 'ecommerce',
    title: 'Atiende los pedidos web',
    concept: 'Cumplimiento de pedidos en línea',
    briefing:
      'Los pedidos de la tienda llegan confirmados y pagados por la pasarela. Tu trabajo es despacharlos y facturarlos rápido: un pedido que espera más de dos días genera reclamos. Despacha y factura cinco pedidos web.',
    xp: 150,
    requires: ['m11'],
    objectives: [{ id: 'o1', kind: 'check', text: 'Factura 5 pedidos web', check: (s) => st(s, 'pedido_web_facturado') >= 5, go: { module: 'ventas', view: 'web' } }],
  },
  {
    id: 'm13',
    takeaway: 'Mantén una campaña solo si su ROAS supera el de equilibrio (1 ÷ margen de contribución); si no, ajusta o pausa.',
    module: 'ecommerce',
    title: 'Campaña rentable',
    concept: 'ROAS y ROAS de equilibrio',
    briefing:
      'La pauta digital trae tráfico a la tienda. Una campaña es rentable cuando cada peso invertido trae suficientes ventas para cubrir el costo de la mercancía. Crea una campaña, mantenla cinco días y busca un ROAS de 2 o más. Recuerda facturar los pedidos web: el ROAS se mide sobre ventas facturadas.',
    xp: 250,
    requires: ['m11'],
    objectives: [
      { id: 'o1', kind: 'check', text: 'Crea una campaña en Meta Ads o TikTok Ads', check: (s) => st(s, 'campana_creada') >= 1, go: { module: 'ecommerce', view: 'campanas' } },
      { id: 'o2', kind: 'check', text: 'Mantén una campaña activa durante 5 días', check: (s) => s.campaigns.some((c) => c.daysRun >= 5), go: { module: 'ecommerce', view: 'campanas' } },
      { id: 'o3', kind: 'check', text: 'Logra un ROAS de 2 o más en una campaña', check: (s) => s.campaigns.some((c) => c.spend > 0 && c.revenue / c.spend >= 2), go: { module: 'ecommerce', view: 'campanas' } },
      { id: 'o4', kind: 'question', text: 'Resuelve el cálculo', question: 'Si el margen de contribución es 40 %, ¿cuál es el ROAS de equilibrio?', answer: () => 2.5, tolerance: () => 0.05, unit: 'veces', hint: 'ROAS de equilibrio = 1 ÷ margen de contribución.', solution: '1 ÷ 0,40 = 2,5. Se aceptan valores entre 2,45 y 2,55.' },
    ],
  },
  {
    id: 'm14',
    takeaway: 'Todo hecho económico tiene dos caras: si los débitos no igualan a los créditos, hay un error que corregir antes de decidir.',
    module: 'contabilidad',
    title: 'Partida doble',
    concept: 'Libro diario y balance de prueba',
    briefing:
      'Cada operación del ERP genera un asiento contable donde los débitos son iguales a los créditos. Abre el balance de prueba para verificarlo, registra un asiento manual cuadrado, por ejemplo el pago de un servicio, y consulta el saldo de bancos.',
    xp: 150,
    requires: ['m05'],
    objectives: [
      { id: 'o1', kind: 'check', text: 'Abre el balance de prueba', check: (s) => Boolean(s.visited['contabilidad:balance']), go: { module: 'contabilidad', view: 'balance' } },
      { id: 'o2', kind: 'check', text: 'Registra un asiento manual cuadrado', check: (s) => st(s, 'asiento_manual') >= 1, go: { module: 'contabilidad', view: 'diario' } },
      { id: 'o3', kind: 'question', text: 'Responde la pregunta de verificación', question: '¿Cuál es el saldo de la cuenta 1110 Bancos en este momento?', answer: (s) => balanceOf(s.journal, '1110'), tolerance: pesos, unit: 'pesos', hint: 'Balance de prueba, cuenta 1110.', solution: 'Saldo de la cuenta 1110 Bancos en el balance de prueba en el momento de responder. Tolerancia de 0,1 %.', go: { module: 'contabilidad', view: 'balance' } },
    ],
  },
  {
    id: 'm15',
    takeaway: 'La cartera vencida es caja que no tienes: haz seguimiento desde el primer día de vencimiento.',
    module: 'contabilidad',
    title: 'Cartera al día',
    concept: 'Gestión de cuentas por cobrar',
    briefing:
      'Vender a crédito exige cobrar. La cartera vencida inmoviliza la caja de la empresa. La empresa heredó facturas a crédito que vencen en los primeros días. Cuando una factura vence, envía recordatorios al cliente y logra su pago. Un recordatorio oportuno aumenta la probabilidad de que el cliente pague.',
    xp: 150,
    requires: ['m05'],
    objectives: [
      { id: 'o1', kind: 'check', text: 'Envía 2 recordatorios de cobro', check: (s) => st(s, 'recordatorio_enviado') >= 2, go: { module: 'contabilidad', view: 'cartera' } },
      { id: 'o2', kind: 'check', text: 'Logra el pago de una factura vencida: regístralo cuando el cliente pague o espera su pago después del recordatorio', check: (s) => st(s, 'cartera_vencida_cobrada') >= 1, go: { module: 'contabilidad', view: 'cartera' } },
    ],
  },
  {
    id: 'm16',
    takeaway: 'Automatiza las tareas repetitivas y de bajo riesgo; reserva tu tiempo para las decisiones que requieren criterio.',
    module: 'automatizacion',
    title: 'Tu primer flujo automático',
    concept: 'Automatización de procesos repetitivos',
    briefing:
      'Despachar y facturar pedidos web uno por uno consume tiempo. Las reglas de automatización ejecutan esas tareas al cierre de cada día. Activa el despacho automático y la facturación de pedidos web, y comprueba en el registro que las reglas hicieron al menos cinco acciones.',
    xp: 200,
    requires: ['m05'],
    objectives: [
      { id: 'o1', kind: 'check', text: 'Activa la regla de despacho automático', check: (s) => s.rules.some((r) => r.type === 'despacho_auto' && r.active), go: { module: 'automatizacion' } },
      { id: 'o2', kind: 'check', text: 'Activa la facturación de pedidos web', check: (s) => s.rules.some((r) => r.type === 'factura_web' && r.active), go: { module: 'automatizacion' } },
      { id: 'o3', kind: 'check', text: 'Las reglas ejecutan al menos 5 acciones', check: (s) => st(s, 'reglas_ejecutadas') >= 5, go: { module: 'automatizacion' } },
    ],
  },
  {
    id: 'm17',
    takeaway: 'Automatiza el abastecimiento con límites: aprueba solo hasta un monto y revisa las órdenes grandes.',
    module: 'automatizacion',
    title: 'Reabastecimiento inteligente',
    concept: 'Integración inventario–compras',
    briefing:
      'La regla de reabastecimiento revisa cada noche el inventario disponible. Cuando un producto cae por debajo de su punto de reorden, crea la orden de compra al proveedor y la aprueba si no supera el monto que definas. Configura el monto, activa la regla y deja que genere una orden.',
    xp: 200,
    requires: ['m08', 'm16'],
    objectives: [
      { id: 'o1', kind: 'check', text: 'Configura el monto de aprobación y activa la regla de reabastecimiento', check: (s) => st(s, 'regla_configurada') >= 1 && s.rules.some((r) => r.type === 'reorden' && r.active), go: { module: 'automatizacion' } },
      { id: 'o2', kind: 'check', text: 'La regla genera al menos una orden de compra', check: (s) => st(s, 'auto_oc_creada') >= 1, go: { module: 'compras' } },
    ],
  },
  {
    id: 'm18',
    takeaway: 'Lee el estado de resultados cada mes: si los gastos fijos superan la utilidad bruta, debes vender más, subir el margen o reducir gastos.',
    module: 'contabilidad',
    title: 'Cierre del primer mes',
    concept: 'Estado de resultados',
    briefing:
      'Cada 30 días la empresa paga nómina, arriendo y servicios. El estado de resultados muestra si las ventas cubrieron el costo de la mercancía y esos gastos. Opera 30 días, termina un mes con utilidad operacional y responde cuál es la utilidad acumulada.',
    xp: 300,
    requires: ['m05'],
    objectives: [
      { id: 'o1', kind: 'check', text: 'Completa 30 días de operación', check: (s) => st(s, 'dias_cerrados') >= 30 },
      { id: 'o2', kind: 'check', text: 'Termina un mes con utilidad operacional positiva', check: (s) => st(s, 'mes_con_utilidad') >= 1, go: { module: 'contabilidad', view: 'estados' } },
      { id: 'o3', kind: 'question', text: 'Responde la pregunta de verificación', question: '¿Cuál es la utilidad operacional acumulada en el estado de resultados?', answer: (s) => incomeStatement(s.journal).operatingProfit, tolerance: pesos, unit: 'pesos', hint: 'Contabilidad → Estados financieros.', solution: 'Utilidad operacional acumulada desde la apertura: ingresos − costo de ventas − gastos operacionales. Se lee en Estados financieros. Tolerancia de 0,1 %.', go: { module: 'contabilidad', view: 'estados' } },
    ],
  },
  {
    id: 'm19',
    takeaway: 'La disciplina diaria (despachar, resolver y reponer a tiempo) sostiene la satisfacción del cliente.',
    module: 'inicio',
    title: 'Racha operativa',
    concept: 'Disciplina operativa y nivel de servicio',
    briefing:
      'Una operación sana no deja pedidos sin inventario ni casos de servicio atrasados. Logra cinco días seguidos sin quiebres de inventario y sin casos abiertos por más de dos días. Consejo: antes de confirmar una cotización revisa el aviso de inventario y compra primero lo que falta; define puntos de reorden para los productos de la tienda y resuelve los casos cada día.',
    xp: 200,
    requires: ['m04', 'm05'],
    objectives: [{ id: 'o1', kind: 'check', text: 'Logra una racha de 5 días sin quiebres ni casos atrasados', check: (s) => st(s, 'mejor_racha') >= 5 }],
  },
  {
    id: 'm20',
    takeaway: 'Las decisiones de un área afectan a todas: precio, inventario, servicio, pauta y caja se deciden juntos.',
    module: 'simulador',
    title: 'Reto gerencial',
    concept: 'Decisiones estratégicas integradas',
    briefing:
      'El simulador gerencial resume la empresa en decisiones mensuales de precio, compras, servicio, pauta, automatización y crédito. Completa una partida y obtén una nota de 3,5 o más.',
    xp: 300,
    requires: ['m01'],
    objectives: [{ id: 'o1', kind: 'check', text: 'Completa el simulador gerencial con nota de 3,5 o más', check: (_s, ctx) => (ctx.simGrade ?? 0) >= 3.5, go: { module: 'simulador' } }],
  },
];

export const LEVELS = [
  { xp: 0, name: 'Practicante' },
  { xp: 300, name: 'Auxiliar administrativo' },
  { xp: 800, name: 'Analista de operaciones' },
  { xp: 1500, name: 'Coordinador(a) de área' },
  { xp: 2300, name: 'Jefe(a) de operaciones' },
  { xp: 3200, name: 'Gerente general' },
];

export function levelOf(xp: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1] ?? null;
  return { index: i, name: cur.name, xp: cur.xp, next, progress: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1 };
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  earned: (s: ErpState) => boolean;
}

const done = (s: ErpState, ids: string[]) => ids.every((id) => s.gamification.completed[id] !== undefined);

export const BADGES: Badge[] = [
  { id: 'b-bienvenida', name: 'Bienvenida', description: 'Completaste tu primer día en la empresa.', earned: (s) => done(s, ['m01']) },
  { id: 'b-crm', name: 'Relación con el cliente', description: 'Completaste todas las misiones del CRM.', earned: (s) => done(s, ['m02', 'm03', 'm04']) },
  { id: 'b-ventas', name: 'Ciclo comercial', description: 'Completaste las misiones de ventas.', earned: (s) => done(s, ['m05', 'm06']) },
  { id: 'b-inventario', name: 'Guardián del inventario', description: 'Dominas el kardex y el punto de reorden.', earned: (s) => done(s, ['m07', 'm08']) },
  { id: 'b-compras', name: 'Abastecimiento', description: 'Completaste el ciclo de compras.', earned: (s) => done(s, ['m09', 'm10']) },
  { id: 'b-ecommerce', name: 'Comercio digital', description: 'Catálogo, pedidos web y pauta rentable.', earned: (s) => done(s, ['m11', 'm12', 'm13']) },
  { id: 'b-contable', name: 'Partida doble', description: 'Contabilidad, cartera y cierre de mes.', earned: (s) => done(s, ['m14', 'm15', 'm18']) },
  { id: 'b-auto', name: 'Automatizador', description: 'Tus reglas trabajan por ti.', earned: (s) => done(s, ['m16', 'm17']) },
  { id: 'b-racha', name: 'Operación impecable', description: 'Cinco días seguidos sin quiebres ni casos atrasados.', earned: (s) => (s.stats.mejor_racha ?? 0) >= 5 },
  { id: 'b-gerente', name: 'Visión gerencial', description: 'Superaste el reto del simulador gerencial.', earned: (s) => done(s, ['m20']) },
];

export type MissionStatus = 'bloqueada' | 'disponible' | 'completada';

export function missionStatus(s: ErpState, m: Mission): MissionStatus {
  if (s.gamification.completed[m.id] !== undefined) return 'completada';
  return m.requires.every((r) => s.gamification.completed[r] !== undefined) ? 'disponible' : 'bloqueada';
}

export function objectiveDone(s: ErpState, m: Mission, o: Objective, ctx: MissionContext): boolean {
  if (s.gamification.completed[m.id] !== undefined) return true;
  if (o.kind === 'question') return Boolean(s.gamification.answered[`${m.id}:${o.id}`]);
  return o.check(s, ctx);
}

export function missionProgress(s: ErpState, m: Mission, ctx: MissionContext) {
  const doneCount = m.objectives.filter((o) => objectiveDone(s, m, o, ctx)).length;
  return { done: doneCount, total: m.objectives.length, ratio: doneCount / m.objectives.length };
}

export interface MissionEvents {
  completed: Mission[];
  badges: Badge[];
  levelUp: string | null;
}

/** Revisa las misiones disponibles, otorga XP e insignias y elige la siguiente misión activa. */
export function evaluateMissions(s: ErpState, ctx: MissionContext): { state: ErpState; events: MissionEvents } {
  const events: MissionEvents = { completed: [], badges: [], levelUp: null };
  let g = s.gamification;
  const before = levelOf(g.xp).index;
  let changed = true;
  // Repite porque completar una misión puede desbloquear otra que ya está cumplida.
  while (changed) {
    changed = false;
    for (const m of MISSIONS) {
      const tmp = { ...s, gamification: g };
      if (missionStatus(tmp, m) !== 'disponible') continue;
      if (m.objectives.every((o) => objectiveDone(tmp, m, o, ctx))) {
        g = { ...g, xp: g.xp + m.xp, completed: { ...g.completed, [m.id]: s.day } };
        events.completed.push(m);
        changed = true;
      }
    }
  }
  const tmp = { ...s, gamification: g };
  for (const b of BADGES) {
    if (!g.badges.includes(b.id) && b.earned(tmp)) {
      g = { ...g, badges: [...g.badges, b.id] };
      events.badges.push(b);
    }
  }
  const after = levelOf(g.xp);
  if (after.index > before) events.levelUp = after.name;
  if (!g.activeMission || g.completed[g.activeMission] !== undefined) {
    const next = MISSIONS.find((m) => missionStatus({ ...s, gamification: g }, m) === 'disponible');
    g = { ...g, activeMission: next?.id ?? null };
  }
  if (g === s.gamification) return { state: s, events };
  return { state: { ...s, gamification: g }, events };
}

export function answerQuestion(s: ErpState, missionId: string, objectiveId: string, value: number): { state: ErpState; correct: boolean; expected: number } {
  const m = MISSIONS.find((x) => x.id === missionId);
  const o = m?.objectives.find((x) => x.id === objectiveId);
  if (!m || !o || o.kind !== 'question') return { state: s, correct: false, expected: 0 };
  const expected = o.answer(s);
  const correct = Number.isFinite(value) && Math.abs(value - expected) <= o.tolerance(expected);
  const key = `${missionId}:${objectiveId}`;
  const attempts = (s.gamification.attempts[key] ?? 0) + 1;
  const bonus = correct && attempts === 1 ? 20 : 0;
  return {
    correct,
    expected,
    state: {
      ...s,
      gamification: {
        ...s.gamification,
        xp: s.gamification.xp + bonus,
        attempts: { ...s.gamification.attempts, [key]: attempts },
        answered: correct ? { ...s.gamification.answered, [key]: true } : s.gamification.answered,
      },
    },
  };
}

export function setActiveMission(s: ErpState, id: string | null): ErpState {
  return { ...s, gamification: { ...s.gamification, activeMission: id } };
}

export const TOTAL_XP = MISSIONS.reduce((a, m) => a + m.xp, 0);
