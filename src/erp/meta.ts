import type { ModuleKey, RuleType } from './types';

export const MODULE_LABEL: Record<ModuleKey, string> = {
  inicio: 'Inicio',
  misiones: 'Centro de misiones',
  crm: 'CRM',
  ventas: 'Ventas',
  ecommerce: 'Comercio electrónico',
  inventario: 'Inventario',
  compras: 'Compras',
  contabilidad: 'Contabilidad',
  automatizacion: 'Automatización',
  simulador: 'Simulador gerencial',
  aprendizaje: 'Aprendizaje',
  configuracion: 'Configuración',
};

export const NAV: Array<{ group: string; items: ModuleKey[] }> = [
  { group: 'General', items: ['inicio', 'misiones'] },
  { group: 'Comercial', items: ['crm', 'ventas', 'ecommerce'] },
  { group: 'Operaciones', items: ['inventario', 'compras'] },
  { group: 'Finanzas', items: ['contabilidad'] },
  { group: 'Plataforma', items: ['automatizacion', 'configuracion'] },
  { group: 'Formación', items: ['simulador', 'aprendizaje'] },
];

/** Módulos que siempre deben estar disponibles. */
export const CORE_MODULES: ModuleKey[] = ['inicio', 'misiones', 'configuracion'];

export const GUIDES: Partial<Record<ModuleKey, { title: string; text: string; steps: string[] }>> = {
  crm: {
    title: 'Cómo funciona el CRM',
    text: 'El CRM concentra la relación con los clientes: sus datos, las oportunidades de venta y los casos de servicio. Todo lo que registres aquí lo usan Ventas y Contabilidad.',
    steps: [
      'Crea o edita clientes con documento, correo, segmento, cupo de crédito y plazo de pago.',
      'Mueve las oportunidades por las etapas del embudo. Una oportunidad ganada se convierte en cotización.',
      'Atiende los casos de servicio: ponlos en proceso y registra la solución dada al cliente.',
    ],
  },
  ventas: {
    title: 'Cómo funciona el ciclo de venta',
    text: 'Cada pedido pasa por cinco estados: cotización, confirmado, despachado, facturado y pagado. Cada paso genera registros automáticos en inventario y contabilidad.',
    steps: [
      'Crea una cotización con el cliente, los productos, las cantidades y el descuento.',
      'Confirma el pedido: el ERP verifica el cupo de crédito y reserva el inventario.',
      'Despacha: sale la mercancía del kardex y se registra el costo de ventas.',
      'Factura: se crea la cuenta por cobrar con el IVA. Los pedidos web se pagan al instante por la pasarela.',
      'Registra el pago cuando el cliente pague la factura a crédito.',
    ],
  },
  ecommerce: {
    title: 'Cómo funciona la tienda virtual',
    text: 'La tienda vende los productos publicados. Cada noche, al cerrar el día, llegan pedidos según el precio, la temporada y la pauta digital activa.',
    steps: [
      'Publica productos con un precio que cubra el costo, la comisión de la pasarela y el margen.',
      'Crea campañas en Meta Ads o TikTok Ads con un presupuesto diario.',
      'Despacha y factura los pedidos web en Ventas y mide el ROAS de cada campaña.',
    ],
  },
  inventario: {
    title: 'Cómo funciona el inventario',
    text: 'El inventario se valoriza a costo promedio ponderado. El disponible es el stock menos lo reservado por pedidos confirmados.',
    steps: [
      'Revisa el disponible de cada producto y el valor del inventario.',
      'Configura el punto de reorden y la cantidad de reposición de cada producto.',
      'Consulta el kardex para ver entradas, salidas y ajustes con su costo.',
      'Registra ajustes cuando el conteo físico no coincida con el sistema.',
    ],
  },
  compras: {
    title: 'Cómo funciona el ciclo de compra',
    text: 'Una orden de compra pasa por borrador, aprobada, recibida y pagada. La mercancía llega según el tiempo de entrega del proveedor.',
    steps: [
      'Crea la orden con el proveedor, los productos y el costo pactado.',
      'Apruébala: el ERP calcula el día de llegada.',
      'Cierra días hasta que llegue y registra la recepción: sube el inventario y nace la cuenta por pagar.',
      'Paga al proveedor desde bancos antes del vencimiento.',
    ],
  },
  contabilidad: {
    title: 'Cómo funciona la contabilidad',
    text: 'Cada operación genera su asiento de partida doble con cuentas del PUC colombiano. Los informes se actualizan en tiempo real.',
    steps: [
      'Consulta el libro diario para ver los asientos de cada operación.',
      'Verifica en el balance de prueba que los débitos sean iguales a los créditos.',
      'Revisa el estado de resultados y el balance general.',
      'Gestiona la cartera de clientes y las cuentas por pagar a proveedores.',
    ],
  },
  automatizacion: {
    title: 'Cómo funcionan las automatizaciones',
    text: 'Las reglas siguen la lógica cuando–entonces y se ejecutan al cerrar cada día. Liberan tiempo en tareas repetitivas, pero tú defines sus parámetros.',
    steps: [
      'Lee qué hace cada regla y qué parámetros usa.',
      'Activa la regla y ajusta sus parámetros.',
      'Cierra días y revisa en el registro de ejecución lo que hizo cada regla.',
    ],
  },
};

/** Qué hace cada regla de automatización: condición (cuando), acción (entonces) y parámetros editables. */
export const RULE_INFO: Record<RuleType, { when: string; then: string; params: Array<{ key: string; label: string; suffix?: string; step?: number; help?: string }> }> = {
  reorden: {
    when: 'al cerrar el día, el disponible de un producto es menor o igual a su punto de reorden y no tiene una orden abierta',
    then: 'crea una orden de compra al proveedor principal por la cantidad de reposición y la aprueba si no supera el monto definido',
    params: [{ key: 'aprobarHasta', label: 'Aprobar automáticamente hasta', suffix: 'COP', step: 500000, help: 'Las órdenes de mayor valor quedan en borrador para revisión.' }],
  },
  despacho_auto: {
    when: 'al cerrar el día hay pedidos confirmados con inventario suficiente',
    then: 'despacha el pedido: descarga el kardex y registra el costo de ventas',
    params: [{ key: 'soloWeb', label: 'Solo pedidos web (1 = sí, 0 = todos)', step: 1 }],
  },
  factura_web: {
    when: 'un pedido de la tienda virtual quedó despachado',
    then: 'emite la factura electrónica y registra el recaudo de la pasarela de pagos',
    params: [],
  },
  recordatorio_cobro: {
    when: 'una factura a crédito lleva vencida los días indicados',
    then: 'envía un recordatorio de cobro por WhatsApp (máximo 3 por factura)',
    params: [{ key: 'diasVencida', label: 'Días de vencimiento', suffix: 'días', step: 1 }],
  },
  escalar_casos: {
    when: 'un caso de servicio lleva abierto los días indicados',
    then: 'sube su prioridad a alta y avisa al equipo',
    params: [{ key: 'diasAbierto', label: 'Días abierto', suffix: 'días', step: 1 }],
  },
  correo_confirmacion: {
    when: 'se confirma un pedido de un cliente con correo registrado',
    then: 'envía el correo de confirmación con el detalle del pedido',
    params: [],
  },
  pausar_campana: {
    when: 'una campaña activa cumple los días mínimos y su ROAS es menor al mínimo',
    then: 'pausa la campaña para no seguir invirtiendo sin retorno',
    params: [
      { key: 'roasMinimo', label: 'ROAS mínimo', step: 0.1 },
      { key: 'diasMinimos', label: 'Días mínimos de prueba', suffix: 'días', step: 1 },
    ],
  },
};
