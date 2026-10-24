import { Rng } from './rng';
import type { EventId, Scenario, SimConfig, SimEvent } from './types';

interface EventTemplate {
  id: EventId;
  weight: number;
  applies: (s: Scenario, config: SimConfig) => boolean;
  build: (s: Scenario, rng: Rng) => SimEvent;
}

const TEMPLATES: EventTemplate[] = [
  {
    id: 'trm_alza',
    weight: 1,
    applies: (s, c) => s.importCostUSD !== null && c.modules.erp,
    build: () => ({
      id: 'trm_alza',
      module: 'erp',
      title: 'El dólar sube 10 %',
      description:
        'La TRM sube 10 % este mes por la volatilidad internacional. Toda importación que pagues este mes costará 10 % más en pesos.',
      lesson:
        'El riesgo cambiario afecta el costo de las importaciones. Compara el costo nacionalizado (precio en USD × TRM × (1 + arancel) + flete) contra el proveedor local antes de comprar.',
      data: { factor: 1.1 },
    }),
  },
  {
    id: 'proveedor_retraso',
    weight: 1,
    applies: (s, c) => s.importCostUSD !== null && c.modules.erp,
    build: () => ({
      id: 'proveedor_retraso',
      module: 'erp',
      title: 'Retraso en puerto',
      description:
        'Una congestión en los puertos del país retrasa un mes la mercancía importada que debía llegar este mes.',
      lesson:
        'El tiempo de entrega (lead time) es incierto. El stock de seguridad protege el nivel de servicio cuando el proveedor falla.',
    }),
  },
  {
    id: 'competidor_promo',
    weight: 1.2,
    applies: () => true,
    build: () => ({
      id: 'competidor_promo',
      module: 'erp',
      title: 'El competidor lanza una promoción',
      description:
        'Tu principal competidor baja su precio 12 % durante este mes. Los clientes compararán tu precio con esa nueva referencia.',
      lesson:
        'Con demanda elástica, la diferencia de precio frente a la competencia reduce la conversión. Igualar el precio no siempre conviene: calcula si el volumen extra compensa el margen perdido.',
      data: { factor: 0.88 },
    }),
  },
  {
    id: 'viral',
    weight: 1,
    applies: () => true,
    build: () => ({
      id: 'viral',
      module: 'ecommerce',
      title: 'Un video de un cliente se vuelve viral',
      description:
        'Una reseña positiva de tu producto en redes sociales se hace viral. El tráfico orgánico de este mes subirá cerca de 40 %.',
      lesson:
        'El tráfico extra solo se convierte en ventas si hay inventario y capacidad de atención. Prepara la operación antes de que llegue la demanda.',
      data: { factor: 1.4 },
    }),
  },
  {
    id: 'cpc_alza',
    weight: 1,
    applies: (_s, c) => c.modules.ecommerce,
    build: () => ({
      id: 'cpc_alza',
      module: 'ecommerce',
      title: 'Sube el costo por clic',
      description:
        'Más anunciantes compiten en la subasta de Meta y TikTok. El costo por clic sube 30 % este mes.',
      lesson:
        'Cuando el CPC sube, el ROAS cae con el mismo presupuesto. Compara el ROAS esperado con el ROAS de equilibrio (1 ÷ margen de contribución) antes de mantener la pauta.',
      data: { factor: 1.3 },
    }),
  },
  {
    id: 'falla_pasarela',
    weight: 0.8,
    applies: () => true,
    build: () => ({
      id: 'falla_pasarela',
      module: 'ecommerce',
      title: 'Falla en la pasarela de pagos',
      description:
        'La pasarela de pagos presenta caídas intermitentes. La conversión de la tienda bajará 20 % y algunos clientes se quejarán.',
      lesson:
        'La continuidad del servicio digital es un riesgo operativo. Los clientes que abandonan el pago se pueden recuperar con mensajes automáticos de carrito abandonado.',
      data: { factor: 0.8 },
    }),
  },
  {
    id: 'reclamo_redes',
    weight: 0.8,
    applies: () => true,
    build: () => ({
      id: 'reclamo_redes',
      module: 'crm',
      title: 'Reclamo público en redes',
      description:
        'Un cliente publica una queja por demora en la respuesta. Si este mes tu capacidad de servicio no alcanza, la satisfacción caerá más.',
      lesson:
        'En el CRM, el tiempo de respuesta afecta la reputación. Dimensiona la capacidad de servicio con base en los pedidos esperados, no en los del mes pasado.',
    }),
  },
  {
    id: 'cliente_corporativo',
    weight: 1,
    applies: () => true,
    build: (s, rng) => {
      const units = Math.round((s.organicVisits * s.baseConversion * s.unitsPerOrder * (0.35 + rng.next() * 0.25)) / 10) * 10;
      return {
        id: 'cliente_corporativo',
        module: 'crm',
        title: 'Pedido de un cliente corporativo',
        description: `Una empresa de la ciudad quiere comprar ${units} ${s.unitName} este mes con 20 % de descuento sobre tu precio de venta y pago contra entrega. Decide si aceptas. Si aceptas y no tienes inventario suficiente, incumples y pierdes reputación.`,
        lesson:
          'Un pedido grande con descuento conviene si el precio con descuento supera el costo unitario y tienes inventario y caja para atenderlo sin desatender a tus clientes habituales.',
        choices: [
          { id: 'aceptar', label: 'Aceptar el pedido' },
          { id: 'rechazar', label: 'Rechazar el pedido' },
        ],
        data: { units, discount: 0.2 },
      };
    },
  },
  {
    id: 'dia_sin_iva',
    weight: 0.9,
    applies: () => true,
    build: () => ({
      id: 'dia_sin_iva',
      module: 'ecommerce',
      title: 'Jornada de día sin IVA',
      description:
        'El Gobierno anuncia una jornada de día sin IVA este mes. Los compradores estarán más activos: la conversión subirá cerca de 30 %.',
      lesson:
        'Los picos de demanda por eventos externos se planean con anticipación: inventario, capacidad de atención y presupuesto de pauta deben crecer juntos.',
      data: { factor: 1.3 },
    }),
  },
];

/** Sortea el evento del siguiente mes. Se anuncia antes de decidir para que el estudiante pueda reaccionar. */
export function drawEvent(
  rng: Rng,
  scenario: Scenario,
  config: SimConfig,
  probability: number,
  lastEventId: EventId | null,
): SimEvent | null {
  if (rng.next() >= probability) return null;
  const pool = TEMPLATES.filter((t) => t.id !== lastEventId && t.applies(scenario, config));
  if (pool.length === 0) return null;
  const total = pool.reduce((acc, t) => acc + t.weight, 0);
  let r = rng.next() * total;
  for (const t of pool) {
    r -= t.weight;
    if (r <= 0) return t.build(scenario, rng);
  }
  return pool[pool.length - 1].build(scenario, rng);
}

export const EVENT_IDS = TEMPLATES.map((t) => t.id);

/** Catálogo completo de eventos de un escenario (vista del docente). Indica si el evento puede salir con todos los módulos activos. */
export function eventCatalog(scenario: Scenario, config: SimConfig): Array<SimEvent & { applies: boolean }> {
  return TEMPLATES.map((t) => ({ ...t.build(scenario, new Rng(7)), applies: t.applies(scenario, config) }));
}
