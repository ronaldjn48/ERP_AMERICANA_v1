// Modelo de datos del ERP educativo. Todo el estado vive en un objeto serializable (ErpState)
// que se guarda en el navegador. Las operaciones son funciones puras que devuelven un estado nuevo.

export type ModuleKey =
  | 'inicio'
  | 'crm'
  | 'ventas'
  | 'ecommerce'
  | 'inventario'
  | 'compras'
  | 'contabilidad'
  | 'automatizacion'
  | 'misiones'
  | 'simulador'
  | 'aprendizaje'
  | 'configuracion';

export type Origin = 'usuario' | 'sistema' | 'automatizacion';

export interface Settings {
  companyName: string;
  nit: string;
  city: string;
  address: string;
  ivaRate: number;
  defaultPaymentTerm: number;
  allowNegativeStock: boolean;
  /** Las órdenes de compra por encima de este valor quedan en borrador hasta aprobarlas. */
  poApprovalLimit: number;
  /** Intensidad de los eventos diarios del mercado (0,5 tranquilo a 1,5 exigente). */
  marketIntensity: number;
  enabledModules: Record<ModuleKey, boolean>;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  cost: number;
  price: number;
  refPrice: number;
  stock: number;
  reserved: number;
  reorderPoint: number;
  reorderQty: number;
  supplierId: string;
  webPublished: boolean;
  active: boolean;
  /** Peso de la demanda diaria de este producto dentro del portafolio. */
  demandShare: number;
}

export type CustomerSegment = 'Minorista' | 'Mayorista' | 'Corporativo';

export interface Customer {
  id: string;
  code: string;
  name: string;
  docType: 'NIT' | 'CC';
  docNumber: string;
  city: string;
  segment: CustomerSegment;
  email: string;
  phone: string;
  creditLimit: number;
  paymentTerm: number;
  origin: Origin;
  createdDay: number;
  active: boolean;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  nit: string;
  city: string;
  email: string;
  leadTimeDays: number;
  paymentTermDays: number;
  origin: Origin;
  active: boolean;
}

export interface OrderLine {
  productId: string;
  qty: number;
  price: number;
  discount: number;
}

export type SalesStatus = 'cotizacion' | 'confirmado' | 'despachado' | 'facturado' | 'pagado' | 'anulado';
export type SalesChannel = 'directo' | 'web' | 'crm';

export interface SalesOrder {
  id: string;
  number: string;
  customerId: string;
  channel: SalesChannel;
  day: number;
  lines: OrderLine[];
  status: SalesStatus;
  origin: Origin;
  invoiceNumber: string | null;
  invoiceDay: number | null;
  dueDay: number | null;
  paidDay: number | null;
  dispatchDay: number | null;
  costOfSales: number;
  campaignId: string | null;
  opportunityId: string | null;
  reminders: number;
  notes: string;
}

export type PurchaseStatus = 'borrador' | 'aprobada' | 'recibida' | 'pagada' | 'anulada';

export interface PurchaseLine {
  productId: string;
  qty: number;
  cost: number;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  supplierId: string;
  day: number;
  expectedDay: number;
  lines: PurchaseLine[];
  status: PurchaseStatus;
  origin: Origin;
  receivedDay: number | null;
  dueDay: number | null;
  paidDay: number | null;
  notes: string;
}

export type OpportunityStage = 'prospecto' | 'calificado' | 'propuesta' | 'negociacion' | 'ganada' | 'perdida';

export interface Opportunity {
  id: string;
  name: string;
  customerId: string | null;
  contactName: string;
  value: number;
  stage: OpportunityStage;
  source: 'web' | 'referido' | 'feria' | 'redes' | 'llamada';
  createdDay: number;
  closedDay: number | null;
  salesOrderId: string | null;
  origin: Origin;
  notes: string;
}

export type CaseStatus = 'abierto' | 'en_proceso' | 'resuelto';
export type Priority = 'baja' | 'media' | 'alta';

export interface ServiceCase {
  id: string;
  number: string;
  customerId: string;
  subject: string;
  priority: Priority;
  status: CaseStatus;
  channel: 'correo' | 'whatsapp' | 'telefono' | 'web';
  openedDay: number;
  resolvedDay: number | null;
  resolution: string;
  origin: Origin;
}

export type MoveType = 'entrada' | 'salida' | 'ajuste';

export interface StockMove {
  id: string;
  day: number;
  productId: string;
  type: MoveType;
  qty: number;
  unitCost: number;
  balance: number;
  ref: string;
  note: string;
}

export interface JournalLine {
  account: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  number: string;
  day: number;
  description: string;
  ref: string;
  lines: JournalLine[];
  manual: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  channel: 'meta' | 'tiktok';
  dailyBudget: number;
  active: boolean;
  startDay: number;
  daysRun: number;
  spend: number;
  clicks: number;
  orders: number;
  revenue: number;
}

export type RuleType =
  | 'reorden'
  | 'despacho_auto'
  | 'factura_web'
  | 'recordatorio_cobro'
  | 'escalar_casos'
  | 'correo_confirmacion'
  | 'pausar_campana';

export interface AutomationRule {
  id: string;
  type: RuleType;
  name: string;
  active: boolean;
  params: Record<string, number>;
  runs: number;
  lastRunDay: number | null;
}

export type LogKind = 'info' | 'exito' | 'alerta' | 'error';

export interface LogEntry {
  id: string;
  day: number;
  module: ModuleKey;
  kind: LogKind;
  text: string;
  ref?: string;
}

export interface Notification {
  id: string;
  day: number;
  module: ModuleKey;
  kind: LogKind;
  text: string;
  read: boolean;
  target?: { module: ModuleKey; view?: string; id?: string };
}

export interface Gamification {
  xp: number;
  completed: Record<string, number>;
  answered: Record<string, boolean>;
  attempts: Record<string, number>;
  badges: string[];
  activeMission: string | null;
}

export interface Profile {
  name: string;
  group: string;
}

export interface ErpState {
  version: 1;
  scenarioId: string;
  seed: number;
  rng: number;
  day: number;
  startDate: string;
  profile: Profile;
  settings: Settings;
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  salesOrders: SalesOrder[];
  purchaseOrders: PurchaseOrder[];
  opportunities: Opportunity[];
  cases: ServiceCase[];
  moves: StockMove[];
  journal: JournalEntry[];
  campaigns: Campaign[];
  rules: AutomationRule[];
  log: LogEntry[];
  notifications: Notification[];
  counters: Record<string, number>;
  /** Acciones realizadas por el estudiante (las misiones las cuentan). */
  stats: Record<string, number>;
  /** Vistas visitadas (módulo/vista). */
  visited: Record<string, boolean>;
  gamification: Gamification;
  /** Bitácora de aprendizaje del estudiante (respuestas de reflexión). */
  reflections?: string[];
  /** Datos de la jornada anterior para el resumen del día. */
  lastDay: DaySummary | null;
}

export interface DaySummary {
  day: number;
  webOrders: number;
  quotes: number;
  leads: number;
  cases: number;
  payments: number;
  paymentsValue: number;
  readyPOs: number;
  ruleRuns: number;
  stockouts: number;
  monthlyClose: boolean;
}

export class ErpError extends Error {}
