import { getScenario } from '../engine/scenarios';
import type { AutomationRule, Customer, ErpState, ModuleKey, Product, Profile, SalesOrder, Settings, Supplier } from './types';

interface ProductSeed {
  sku: string;
  name: string;
  category: string;
  unit: string;
  cost: number;
  price: number;
  stock: number;
  share: number;
  supplier: number;
}

export const CATALOG: Record<string, { products: ProductSeed[]; suppliers: Array<[string, string, string, number, number]> }> = {
  tech: {
    products: [
      { sku: 'AUD-001', name: 'Audífonos inalámbricos Pro', category: 'Audio', unit: 'und', cost: 52000, price: 89000, stock: 60, share: 0.3, supplier: 0 },
      { sku: 'AUD-002', name: 'Audífonos deportivos', category: 'Audio', unit: 'und', cost: 38000, price: 65000, stock: 45, share: 0.18, supplier: 0 },
      { sku: 'PAR-001', name: 'Parlante bluetooth portátil', category: 'Audio', unit: 'und', cost: 70000, price: 119000, stock: 25, share: 0.12, supplier: 1 },
      { sku: 'CAR-030', name: 'Cargador rápido 30 W', category: 'Accesorios', unit: 'und', cost: 18000, price: 35000, stock: 80, share: 0.2, supplier: 2 },
      { sku: 'CAB-USC', name: 'Cable USB-C de 2 m', category: 'Accesorios', unit: 'und', cost: 6000, price: 15000, stock: 120, share: 0.12, supplier: 2 },
      { sku: 'REL-100', name: 'Reloj inteligente', category: 'Wearables', unit: 'und', cost: 120000, price: 199000, stock: 12, share: 0.08, supplier: 1 },
    ],
    suppliers: [
      ['Mayorista Tecnológico Nacional S.A.S.', '901245781', 'Bogotá D.C.', 2, 30],
      ['Importadora Pacífico Digital S.A.S.', '900874512', 'Cartagena', 6, 45],
      ['Accesorios Móviles de Colombia S.A.S.', '901587423', 'Medellín', 3, 30],
    ],
  },
  moda: {
    products: [
      { sku: 'CAM-BLA', name: 'Camisa de lino blanca', category: 'Camisería', unit: 'und', cost: 66000, price: 120000, stock: 40, share: 0.26, supplier: 0 },
      { sku: 'CAM-AZU', name: 'Camisa de lino azul', category: 'Camisería', unit: 'und', cost: 58000, price: 105000, stock: 35, share: 0.2, supplier: 0 },
      { sku: 'VES-ALG', name: 'Vestido casual de algodón', category: 'Dama', unit: 'und', cost: 72000, price: 139000, stock: 28, share: 0.18, supplier: 1 },
      { sku: 'PAN-LIN', name: 'Pantalón de lino', category: 'Pantalonería', unit: 'und', cost: 60000, price: 115000, stock: 30, share: 0.16, supplier: 1 },
      { sku: 'SOM-VUE', name: 'Sombrero vueltiao 19 vueltas', category: 'Accesorios', unit: 'und', cost: 85000, price: 160000, stock: 15, share: 0.1, supplier: 2 },
      { sku: 'BOL-TEJ', name: 'Bolso tejido artesanal', category: 'Accesorios', unit: 'und', cost: 95000, price: 180000, stock: 12, share: 0.1, supplier: 2 },
    ],
    suppliers: [
      ['Confecciones Hilo Fino S.A.S.', '901334218', 'Medellín', 4, 30],
      ['Textiles Integrales de Colombia S.A.S.', '900665120', 'Bogotá D.C.', 5, 30],
      ['Artesanías del Sinú S.A.S.', '901098456', 'Montería', 8, 15],
    ],
  },
  cafe: {
    products: [
      { sku: 'CAF-500', name: 'Café especial tostado 500 g', category: 'Café', unit: 'bolsa', cost: 20000, price: 38000, stock: 150, share: 0.34, supplier: 0 },
      { sku: 'CAF-250', name: 'Café especial tostado 250 g', category: 'Café', unit: 'bolsa', cost: 11000, price: 21000, stock: 140, share: 0.24, supplier: 0 },
      { sku: 'CAF-DES', name: 'Café descafeinado 500 g', category: 'Café', unit: 'bolsa', cost: 23000, price: 42000, stock: 40, share: 0.1, supplier: 0 },
      { sku: 'KIT-REG', name: 'Kit de regalo con taza', category: 'Regalos', unit: 'kit', cost: 45000, price: 89000, stock: 25, share: 0.1, supplier: 1 },
      { sku: 'PRE-FRA', name: 'Prensa francesa 350 ml', category: 'Accesorios', unit: 'und', cost: 40000, price: 75000, stock: 20, share: 0.08, supplier: 2 },
      { sku: 'FIL-100', name: 'Filtros de papel x 100', category: 'Accesorios', unit: 'paquete', cost: 5000, price: 12000, stock: 90, share: 0.14, supplier: 2 },
    ],
    suppliers: [
      ['Trilladora Cordillera Central S.A.S.', '900452369', 'Manizales', 3, 30],
      ['Empaques y Regalos Express S.A.S.', '901223654', 'Bogotá D.C.', 4, 30],
      ['Menaje Barista S.A.S.', '901774120', 'Medellín', 5, 45],
    ],
  },
};

export const CUSTOMERS: Array<Omit<Customer, 'id' | 'code' | 'origin' | 'createdDay' | 'active'>> = [
  { name: 'Distribuidora Red Nacional S.A.S.', docType: 'NIT', docNumber: '901456123', city: 'Bogotá D.C.', segment: 'Mayorista', email: 'compras@rednacional.com.co', phone: '6013456789', creditLimit: 15000000, paymentTerm: 30 },
  { name: 'Hotel Plaza Central S.A.S.', docType: 'NIT', docNumber: '900789654', city: 'Medellín', segment: 'Corporativo', email: 'suministros@hotelplazacentral.co', phone: '6043214567', creditLimit: 10000000, paymentTerm: 30 },
  { name: 'Comercializadora Punto Alto S.A.S.', docType: 'NIT', docNumber: '901112233', city: 'Cali', segment: 'Mayorista', email: 'gerencia@puntoalto.co', phone: '6023987456', creditLimit: 12000000, paymentTerm: 45 },
  { name: 'Clínica Vida Integral S.A.S.', docType: 'NIT', docNumber: '900334455', city: 'Bucaramanga', segment: 'Corporativo', email: 'bienestar@vidaintegral.co', phone: '6077741258', creditLimit: 8000000, paymentTerm: 30 },
  { name: 'María Fernanda Rojas', docType: 'CC', docNumber: '1045678912', city: 'Pereira', segment: 'Minorista', email: 'mfrojas@correo.co', phone: '3004567812', creditLimit: 0, paymentTerm: 0 },
  { name: 'Carlos Andrés Mejía', docType: 'CC', docNumber: '72345678', city: 'Barranquilla', segment: 'Minorista', email: 'camejia@correo.co', phone: '3157894561', creditLimit: 0, paymentTerm: 0 },
];

export const FIRST_NAMES = ['Valentina', 'Santiago', 'Daniela', 'Andrés', 'Camila', 'Juan Pablo', 'Laura', 'Sebastián', 'Mariana', 'Luis Carlos', 'Isabella', 'Jorge', 'Natalia', 'Kevin', 'Paola', 'Jesús', 'Yuliana', 'Óscar'];
export const LAST_NAMES = ['Pérez', 'Gutiérrez', 'Gómez', 'Martínez', 'López', 'García', 'Mendoza', 'Rodríguez', 'Hernández', 'Ramírez', 'Castro', 'Sarmiento', 'Orozco', 'Vargas', 'Navarro', 'Torres'];
/** Ciudades de clientes y prospectos: cobertura nacional, sin una región protagonista. */
export const CITIES = ['Bogotá D.C.', 'Medellín', 'Cali', 'Barranquilla', 'Bucaramanga', 'Cartagena', 'Pereira', 'Manizales', 'Ibagué', 'Villavicencio', 'Cúcuta', 'Montería', 'Pasto', 'Neiva', 'Tunja'];

export const DEFAULT_RULES: Array<Omit<AutomationRule, 'id' | 'runs' | 'lastRunDay'>> = [
  { type: 'reorden', name: 'Reabastecimiento automático', active: false, params: { aprobarHasta: 3000000 } },
  { type: 'despacho_auto', name: 'Despacho automático de pedidos con stock', active: false, params: { soloWeb: 1 } },
  { type: 'factura_web', name: 'Facturación electrónica de pedidos web', active: false, params: {} },
  { type: 'recordatorio_cobro', name: 'Recordatorio de cobro por WhatsApp', active: false, params: { diasVencida: 1 } },
  { type: 'escalar_casos', name: 'Escalamiento de casos sin respuesta', active: false, params: { diasAbierto: 2 } },
  { type: 'correo_confirmacion', name: 'Correo de confirmación de pedido', active: false, params: {} },
  { type: 'pausar_campana', name: 'Pausa de campañas con ROAS bajo', active: false, params: { roasMinimo: 2, diasMinimos: 3 } },
];

export const ALL_MODULES: ModuleKey[] = [
  'inicio',
  'misiones',
  'crm',
  'ventas',
  'ecommerce',
  'inventario',
  'compras',
  'contabilidad',
  'automatizacion',
  'simulador',
  'aprendizaje',
  'configuracion',
];

export function defaultSettings(scenarioId: string): Settings {
  const s = getScenario(scenarioId);
  return {
    companyName: s.company,
    nit: '',
    city: '',
    address: '',
    ivaRate: 0.19,
    defaultPaymentTerm: 30,
    allowNegativeStock: false,
    poApprovalLimit: 5000000,
    marketIntensity: 1,
    enabledModules: Object.fromEntries(ALL_MODULES.map((m) => [m, true])) as Record<ModuleKey, boolean>,
  };
}

const pad = (n: number) => String(n).padStart(4, '0');

/** Crea el espacio de trabajo inicial: empresa, maestros, saldos de apertura y datos de ejemplo. */
export function createWorkspace(profile: Profile, scenarioId: string, seed: number, settings?: Partial<Settings>): ErpState {
  const scenario = getScenario(scenarioId);
  const cat = CATALOG[scenario.id] ?? CATALOG.tech;
  const suppliers: Supplier[] = cat.suppliers.map(([name, nit, city, lead, term], i) => ({
    id: `sup${i + 1}`,
    code: `PR-${pad(i + 1)}`,
    name,
    nit,
    city,
    email: `ventas@${name.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}.co`,
    leadTimeDays: lead,
    paymentTermDays: term,
    origin: 'sistema',
    active: true,
  }));
  const products: Product[] = cat.products.map((p, i) => ({
    id: `prd${i + 1}`,
    sku: p.sku,
    name: p.name,
    category: p.category,
    unit: p.unit,
    cost: p.cost,
    price: p.price,
    refPrice: p.price,
    stock: p.stock,
    reserved: 0,
    reorderPoint: 0,
    reorderQty: 0,
    supplierId: suppliers[p.supplier].id,
    webPublished: i < 2,
    active: true,
    demandShare: p.share,
  }));
  const customers: Customer[] = CUSTOMERS.map((c, i) => ({
    ...c,
    id: `cli${i + 1}`,
    code: `CL-${pad(i + 1)}`,
    origin: 'sistema',
    createdDay: 0,
    active: true,
  }));
  const inventoryValue = products.reduce((a, p) => a + p.stock * p.cost, 0);
  const cash = 40000000;
  // Cartera heredada: dos facturas a crédito emitidas antes de la apertura que vencen en los primeros días.
  const legacy: SalesOrder[] = [
    { customer: 'cli1', invoiceDay: -27, dueDay: 3, lines: [{ productId: products[0].id, qty: 12, price: products[0].price, discount: 0.05 }] },
    { customer: 'cli3', invoiceDay: -40, dueDay: 5, lines: [{ productId: products[3].id, qty: 25, price: products[3].price, discount: 0.05 }, { productId: products[1].id, qty: 8, price: products[1].price, discount: 0.05 }] },
  ].map((x, i) => ({
    id: `so${i + 1}`,
    number: `PV-${pad(i + 1)}`,
    customerId: x.customer,
    channel: 'directo',
    day: x.invoiceDay,
    lines: x.lines,
    status: 'facturado',
    origin: 'sistema',
    invoiceNumber: `FE-${pad(i + 1)}`,
    invoiceDay: x.invoiceDay,
    dueDay: x.dueDay,
    paidDay: null,
    dispatchDay: x.invoiceDay,
    costOfSales: x.lines.reduce((a, l) => a + l.qty * (products.find((p) => p.id === l.productId)?.cost ?? 0), 0),
    campaignId: null,
    opportunityId: null,
    reminders: 0,
    notes: 'Factura emitida antes de la apertura del sistema (cartera heredada).',
  }));
  const receivables = legacy.reduce((a, o) => {
    const sub = Math.round(o.lines.reduce((x, l) => x + l.qty * l.price * (1 - l.discount), 0));
    return a + sub + Math.round(sub * 0.19);
  }, 0);
  const state: ErpState = {
    version: 1,
    scenarioId: scenario.id,
    seed,
    rng: seed,
    day: 1,
    startDate: '2026-07-01',
    profile,
    settings: { ...defaultSettings(scenario.id), ...settings },
    products,
    customers,
    suppliers,
    salesOrders: legacy,
    purchaseOrders: [],
    opportunities: [
      { id: 'opo1', name: 'Dotación de fin de año', customerId: 'cli2', contactName: 'Gerencia de bienestar', value: 6500000, stage: 'calificado', source: 'referido', createdDay: 0, closedDay: null, salesOrderId: null, origin: 'sistema', notes: 'Requiere entrega antes del 15 de diciembre.' },
      { id: 'opo2', name: 'Surtido para punto de venta', customerId: 'cli3', contactName: 'Jefe de compras', value: 9800000, stage: 'propuesta', source: 'feria', createdDay: 0, closedDay: null, salesOrderId: null, origin: 'sistema', notes: 'Pide 5 % de descuento por volumen.' },
      { id: 'opo3', name: 'Regalos corporativos', customerId: null, contactName: 'Andrea Charris · Constructora Mar Azul', value: 4200000, stage: 'prospecto', source: 'web', createdDay: 0, closedDay: null, salesOrderId: null, origin: 'sistema', notes: 'Llenó el formulario de la tienda virtual.' },
    ],
    cases: [
      { id: 'cas1', number: 'CS-0001', customerId: 'cli5', subject: 'Solicita factura electrónica de su compra anterior', priority: 'media', status: 'abierto', channel: 'correo', openedDay: 1, resolvedDay: null, resolution: '', origin: 'sistema' },
      { id: 'cas2', number: 'CS-0002', customerId: 'cli1', subject: 'Pregunta por el estado de su cupo de crédito', priority: 'baja', status: 'abierto', channel: 'telefono', openedDay: 1, resolvedDay: null, resolution: '', origin: 'sistema' },
    ],
    moves: products.map((p, i) => ({
      id: `mov${i + 1}`,
      day: 0,
      productId: p.id,
      type: 'entrada',
      qty: p.stock,
      unitCost: p.cost,
      balance: p.stock,
      ref: 'Saldo inicial',
      note: 'Inventario de apertura',
    })),
    journal: [
      {
        id: 'asi1',
        number: 'AS-0001',
        day: 0,
        description: 'Asiento de apertura',
        ref: 'Apertura',
        manual: false,
        lines: [
          { account: '1110', debit: cash, credit: 0 },
          { account: '1305', debit: receivables, credit: 0 },
          { account: '1435', debit: inventoryValue, credit: 0 },
          { account: '3105', debit: 0, credit: cash + inventoryValue + receivables },
        ],
      },
    ],
    campaigns: [],
    rules: DEFAULT_RULES.map((r, i) => ({ ...r, id: `rule${i + 1}`, runs: 0, lastRunDay: null })),
    log: [{ id: 'log1', day: 1, module: 'inicio', kind: 'info', text: `Se creó el espacio de trabajo de ${scenario.company}.` }],
    notifications: [
      {
        id: 'not1',
        day: 1,
        module: 'misiones',
        kind: 'info',
        text: 'Bienvenido. Abre el Centro de misiones para empezar tu primera práctica.',
        read: false,
        target: { module: 'misiones' },
      },
    ],
    counters: {
      CL: customers.length,
      cli: customers.length,
      PR: suppliers.length,
      PV: legacy.length,
      so: legacy.length,
      FE: legacy.length,
      sup: suppliers.length,
      prd: products.length,
      CS: 2,
      cas: 2,
      AS: 1,
      asi: 1,
      mov: products.length,
      log: 1,
      not: 1,
      opo: 3,
      rule: DEFAULT_RULES.length,
    },
    stats: {},
    visited: {},
    gamification: { xp: 0, completed: {}, answered: {}, attempts: {}, badges: [], activeMission: 'm01' },
    lastDay: null,
  };
  return state;
}

/** Fecha del día de operación (el día 1 es el 1 de julio de 2026). */
export function dateOf(state: Pick<ErpState, 'startDate'>, day: number): Date {
  const d = new Date(`${state.startDate}T12:00:00`);
  d.setDate(d.getDate() + day - 1);
  return d;
}

export function formatDay(state: Pick<ErpState, 'startDate'>, day: number): string {
  return dateOf(state, day).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}
