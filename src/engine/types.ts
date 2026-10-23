// Tipos del modelo de simulación. El motor es puro: recibe estado + decisiones y devuelve el nuevo estado.

export type ModuleId = 'erp' | 'crm' | 'ecommerce' | 'automatizacion' | 'finanzas';
export type Difficulty = 'basico' | 'intermedio' | 'avanzado';

export interface SimConfig {
  version: 1;
  scenarioId: string;
  difficulty: Difficulty;
  /** Número de meses a simular. */
  periods: number;
  /** Semilla del mercado: misma semilla = mismas condiciones para todo el grupo. */
  seed: number;
  /** Mes calendario de inicio (0 = enero). */
  startMonth: number;
  /** Módulos que el estudiante controla. Los demás quedan con la política por defecto del escenario. */
  modules: Record<ModuleId, boolean>;
  /** Modo guiado: muestra pronósticos y recomendaciones antes de decidir. */
  guided: boolean;
}

export interface StudentProfile {
  name: string;
  group: string;
}

export interface AutomationDecisions {
  autoReorder: boolean;
  reorderPoint: number;
  reorderQty: number;
  cartRecovery: boolean;
  chatbot: boolean;
  eInvoicing: boolean;
}

export interface Decisions {
  price: number;
  purchaseLocal: number;
  purchaseImport: number;
  metaBudget: number;
  tiktokBudget: number;
  agents: number;
  /** Descuento para clientes recurrentes (0 a 0,2). */
  loyaltyDiscount: number;
  freeShipping: boolean;
  uxInvestment: number;
  automation: AutomationDecisions;
  loanDraw: number;
  loanRepay: number;
  /** Respuesta a un evento con opciones (por ejemplo, aceptar un pedido corporativo). */
  eventChoice: string | null;
}

export type AutomationId = 'autoReorder' | 'cartRecovery' | 'chatbot' | 'eInvoicing';

export interface Scenario {
  id: string;
  company: string;
  sector: string;
  product: string;
  unitName: string;
  description: string;
  challenge: string;
  refPrice: number;
  elasticity: number;
  /** Demanda mensual de referencia (unidades) con estacionalidad 1,0 y precio de referencia. */
  baseDemand: number;
  localCost: number;
  /** null = el producto no se puede importar en este escenario. */
  importCostUSD: number | null;
  tariff: number;
  importFixedCost: number;
  trm0: number;
  organicVisits: number;
  baseConversion: number;
  unitsPerOrder: number;
  repurchaseRate: number;
  seasonality: number[];
  seasonNotes: Record<number, string>;
  holdingRate: number;
  fixedCosts: number;
  agentSalary: number;
  ordersPerAgent: number;
  chatbotCapacity: number;
  shippingCost: number;
  cpc: { meta: number; tiktok: number };
  maxClicks: { meta: number; tiktok: number };
  channelConversion: { meta: number; tiktok: number };
  uxCostPerPoint: number;
  initialCash: number;
  initialInventory: number;
  initialCustomers: number;
  defaults: Decisions;
}

export interface PipelineItem {
  units: number;
  unitCost: number;
  arrivesAt: number;
}

export type EventId =
  | 'trm_alza'
  | 'proveedor_retraso'
  | 'competidor_promo'
  | 'viral'
  | 'cpc_alza'
  | 'falla_pasarela'
  | 'reclamo_redes'
  | 'cliente_corporativo'
  | 'dia_sin_iva';

export interface EventChoice {
  id: string;
  label: string;
}

export interface SimEvent {
  id: EventId;
  title: string;
  description: string;
  lesson: string;
  module: ModuleId;
  choices?: EventChoice[];
  /** Parámetros concretos del evento (unidades, porcentajes). */
  data?: Record<string, number>;
}

export interface CostBreakdown {
  cogs: number;
  marketing: number;
  salaries: number;
  fixed: number;
  shipping: number;
  gatewayFees: number;
  admin: number;
  holding: number;
  automation: number;
  ux: number;
  importLogistics: number;
  interest: number;
}

export interface PeriodResult {
  period: number;
  month: number;
  event: SimEvent | null;
  eventChoice: string | null;
  decisions: Decisions;
  // Mercado
  organicVisits: number;
  metaClicks: number;
  tiktokClicks: number;
  conversionRate: number;
  newOrders: number;
  repeatOrders: number;
  corporateUnits: number;
  demandUnits: number;
  unitsSold: number;
  lostUnits: number;
  fillRate: number;
  // Operación
  autoReorderUnits: number;
  /** Unidades que el proveedor no despachó por falta de fondos. */
  rejectedUnits: number;
  unitsPurchasedLocal: number;
  unitsPurchasedImport: number;
  arrivedUnits: number;
  delayedUnits: number;
  endInventory: number;
  inventoryValue: number;
  inTransitValue: number;
  serviceCapacity: number;
  serviceRatio: number;
  // Finanzas
  revenue: number;
  paidRevenue: number;
  costs: CostBreakdown;
  grossProfit: number;
  ebt: number;
  tax: number;
  netIncome: number;
  purchasesCash: number;
  cashStart: number;
  cashEnd: number;
  debt: number;
  overdraft: number;
  equity: number;
  bankrupt: boolean;
  // Clientes y marca
  customers: number;
  newCustomers: number;
  churnedCustomers: number;
  satisfaction: number;
  awareness: number;
  ux: number;
  trm: number;
  // Indicadores
  kpis: Kpis;
  score: ScoreBreakdown;
}

export interface Kpis {
  grossMargin: number;
  netMargin: number;
  roasMeta: number | null;
  roasTiktok: number | null;
  breakEvenRoas: number | null;
  cac: number | null;
  inventoryDays: number | null;
  contributionPerUnit: number;
}

export interface ScoreBreakdown {
  financial: number;
  customer: number;
  process: number;
  total: number;
}

export interface SimState {
  period: number;
  month: number;
  cash: number;
  inventory: number;
  avgUnitCost: number;
  pipeline: PipelineItem[];
  debt: number;
  overdraft: number;
  customers: number;
  satisfaction: number;
  awareness: number;
  ux: number;
  trm: number;
  salaryIndex: number;
  activated: Record<AutomationId, boolean>;
  pendingEvent: SimEvent | null;
  lastEventId: EventId | null;
  rng: number;
  history: PeriodResult[];
  finished: boolean;
  /** Patrimonio negativo: la empresa entra en liquidación y la simulación termina. */
  bankrupt: boolean;
}

export type FeedbackLevel = 'logro' | 'alerta' | 'critico' | 'info';

export interface Feedback {
  id: string;
  level: FeedbackLevel;
  module: ModuleId;
  title: string;
  message: string;
  concept?: string;
}
