// Operaciones del ERP. Cada función recibe el estado, valida las reglas de negocio y devuelve un estado
// nuevo con los movimientos de inventario y los asientos contables que el proceso genera.
// Si una regla no se cumple lanza ErpError con un mensaje que explica cómo corregirlo.

import { cop } from '../engine/format';
import { ACCOUNTS, balanceOf, isBalanced } from './accounts';
import {
  ErpError,
  type AutomationRule,
  type Campaign,
  type Customer,
  type ErpState,
  type JournalLine,
  type LogKind,
  type ModuleKey,
  type Notification,
  type Opportunity,
  type OpportunityStage,
  type OrderLine,
  type Origin,
  type Product,
  type PurchaseLine,
  type SalesOrder,
  type ServiceCase,
  type Settings,
  type Supplier,
} from './types';

export const GATEWAY_FEE = 0.032;

const pad = (n: number) => String(n).padStart(4, '0');
const round = (n: number) => Math.round(n);

/** Copia profunda del estado para aplicar cambios sin tocar el original. */
export function mutate(s: ErpState, fn: (d: ErpState) => void): ErpState {
  const d = structuredClone(s);
  fn(d);
  return d;
}

export function nextNumber(d: ErpState, prefix: string): string {
  d.counters[prefix] = (d.counters[prefix] ?? 0) + 1;
  return `${prefix}-${pad(d.counters[prefix])}`;
}

export function nextId(d: ErpState, prefix: string): string {
  d.counters[prefix] = (d.counters[prefix] ?? 0) + 1;
  return `${prefix}${d.counters[prefix]}`;
}

export function addLog(d: ErpState, module: ModuleKey, kind: LogKind, text: string, ref?: string) {
  d.log.push({ id: nextId(d, 'log'), day: d.day, module, kind, text, ref });
  if (d.log.length > 600) d.log = d.log.slice(-500);
}

export function notify(d: ErpState, module: ModuleKey, kind: LogKind, text: string, target?: Notification['target']) {
  d.notifications.unshift({ id: nextId(d, 'not'), day: d.day, module, kind, text, read: false, target });
  if (d.notifications.length > 80) d.notifications = d.notifications.slice(0, 60);
}

/** Cuenta las acciones del estudiante (las de sistema y automatizaciones no suman a las misiones). */
export function stat(d: ErpState, key: string, origin: Origin, n = 1) {
  if (origin === 'usuario') d.stats[key] = (d.stats[key] ?? 0) + n;
  if (origin === 'automatizacion') d.stats[`auto_${key}`] = (d.stats[`auto_${key}`] ?? 0) + n;
}

export function post(d: ErpState, description: string, ref: string, lines: JournalLine[], manual = false) {
  const clean = lines.filter((l) => l.debit !== 0 || l.credit !== 0).map((l) => ({ ...l, debit: round(l.debit), credit: round(l.credit) }));
  // Ajuste de redondeo para que débitos y créditos cuadren exactamente.
  const diff = clean.reduce((a, l) => a + l.debit - l.credit, 0);
  if (diff !== 0 && clean.length > 0) {
    const target = clean.find((l) => (diff > 0 ? l.credit > 0 : l.debit > 0));
    if (target) {
      if (diff > 0) target.credit += diff;
      else target.debit -= diff;
    }
  }
  d.journal.push({ id: nextId(d, 'asi'), number: nextNumber(d, 'AS'), day: d.day, description, ref, lines: clean, manual });
}

export function orderTotals(lines: OrderLine[], ivaRate: number) {
  const subtotal = round(lines.reduce((a, l) => a + l.qty * l.price * (1 - l.discount), 0));
  const iva = round(subtotal * ivaRate);
  return { subtotal, iva, total: subtotal + iva };
}

export function purchaseTotals(lines: PurchaseLine[], ivaRate: number) {
  const subtotal = round(lines.reduce((a, l) => a + l.qty * l.cost, 0));
  const iva = round(subtotal * ivaRate);
  return { subtotal, iva, total: subtotal + iva };
}

export const available = (p: Product) => p.stock - p.reserved;

function findOr<T extends { id: string }>(list: T[], id: string, what: string): T {
  const x = list.find((i) => i.id === id);
  if (!x) throw new ErpError(`No se encontró ${what}.`);
  return x;
}

/** Saldo de cartera (facturas sin pagar) de un cliente. */
export function receivableOf(s: ErpState, customerId: string): number {
  return s.salesOrders
    .filter((o) => o.customerId === customerId && o.status === 'facturado')
    .reduce((a, o) => a + orderTotals(o.lines, s.settings.ivaRate).total, 0);
}

// ---------------------------------------------------------------- Configuración

export function updateSettings(s: ErpState, patch: Partial<Settings>): ErpState {
  return mutate(s, (d) => {
    const next = { ...d.settings, ...patch };
    if (!next.companyName.trim() || next.companyName.trim().length < 3) throw new ErpError('Escribe la razón social de la empresa (mínimo 3 caracteres).');
    if (next.nit && !/^\d{9}(-\d)?$/.test(next.nit.trim())) throw new ErpError('El NIT debe tener 9 dígitos y opcionalmente el dígito de verificación, por ejemplo 901234567-8.');
    if (next.ivaRate < 0 || next.ivaRate > 0.3) throw new ErpError('La tarifa de IVA debe estar entre 0 % y 30 %.');
    if (next.defaultPaymentTerm < 0 || next.defaultPaymentTerm > 120) throw new ErpError('El plazo de pago debe estar entre 0 y 120 días.');
    if (next.marketIntensity < 0.5 || next.marketIntensity > 1.5) throw new ErpError('La intensidad del mercado debe estar entre 0,5 y 1,5.');
    d.settings = { ...next, companyName: next.companyName.trim(), nit: next.nit.trim() };
    addLog(d, 'configuracion', 'info', 'Se actualizaron los parámetros de la empresa.');
    stat(d, 'config_guardada', 'usuario');
  });
}

// ---------------------------------------------------------------- Maestros

export type CustomerInput = Omit<Customer, 'id' | 'code' | 'origin' | 'createdDay' | 'active'> & { id?: string; active?: boolean };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function saveCustomer(s: ErpState, input: CustomerInput, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    const name = input.name.trim();
    if (name.length < 3) throw new ErpError('El nombre o razón social debe tener al menos 3 caracteres.');
    const doc = input.docNumber.trim();
    if (input.docType === 'NIT' && !/^\d{9}(-\d)?$/.test(doc)) throw new ErpError('El NIT debe tener 9 dígitos, por ejemplo 901234567.');
    if (input.docType === 'CC' && !/^\d{6,10}$/.test(doc)) throw new ErpError('La cédula debe tener entre 6 y 10 dígitos.');
    if (d.customers.some((c) => c.docNumber === doc && c.id !== input.id)) throw new ErpError(`Ya existe un cliente con el documento ${doc}.`);
    if (input.email && !EMAIL.test(input.email.trim())) throw new ErpError('El correo electrónico no tiene un formato válido.');
    if (input.creditLimit < 0) throw new ErpError('El cupo de crédito no puede ser negativo.');
    if (input.paymentTerm < 0 || input.paymentTerm > 120) throw new ErpError('El plazo de pago debe estar entre 0 y 120 días.');
    if (input.creditLimit > 0 && input.paymentTerm === 0) throw new ErpError('Si el cliente tiene cupo de crédito, asigna un plazo de pago mayor que 0 días.');
    const data = { ...input, name, docNumber: doc, email: input.email.trim(), phone: input.phone.trim() };
    if (input.id) {
      const c = findOr(d.customers, input.id, 'el cliente');
      Object.assign(c, data, { active: input.active ?? c.active });
      addLog(d, 'crm', 'info', `Se actualizó el cliente ${c.code} ${c.name}.`, c.id);
      stat(d, 'cliente_editado', origin);
    } else {
      const c: Customer = { ...data, id: nextId(d, 'cli'), code: nextNumber(d, 'CL'), origin, createdDay: d.day, active: true };
      d.customers.push(c);
      addLog(d, 'crm', 'exito', `Se creó el cliente ${c.code} ${c.name}.`, c.id);
      stat(d, 'cliente_creado', origin);
      if (origin === 'usuario' && c.segment === 'Corporativo' && c.creditLimit > 0 && c.email) stat(d, 'cliente_corporativo_completo', origin);
    }
  });
}

export type SupplierInput = Omit<Supplier, 'id' | 'code' | 'origin' | 'active'> & { id?: string; active?: boolean };

export function saveSupplier(s: ErpState, input: SupplierInput, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    const name = input.name.trim();
    if (name.length < 3) throw new ErpError('Escribe la razón social del proveedor.');
    if (!/^\d{9}(-\d)?$/.test(input.nit.trim())) throw new ErpError('El NIT del proveedor debe tener 9 dígitos.');
    if (d.suppliers.some((x) => x.nit === input.nit.trim() && x.id !== input.id)) throw new ErpError('Ya existe un proveedor con ese NIT.');
    if (input.leadTimeDays < 0 || input.leadTimeDays > 60) throw new ErpError('El tiempo de entrega debe estar entre 0 y 60 días.');
    if (input.paymentTermDays < 0 || input.paymentTermDays > 120) throw new ErpError('El plazo de pago debe estar entre 0 y 120 días.');
    if (input.email && !EMAIL.test(input.email.trim())) throw new ErpError('El correo electrónico no tiene un formato válido.');
    const data = { ...input, name, nit: input.nit.trim(), email: input.email.trim() };
    if (input.id) {
      const x = findOr(d.suppliers, input.id, 'el proveedor');
      Object.assign(x, data, { active: input.active ?? x.active });
      addLog(d, 'compras', 'info', `Se actualizó el proveedor ${x.code} ${x.name}.`, x.id);
      stat(d, 'proveedor_editado', origin);
    } else {
      const id = nextId(d, 'sup');
      const x: Supplier = { ...data, id, code: nextNumber(d, 'PR'), origin, active: true };
      d.suppliers.push(x);
      addLog(d, 'compras', 'exito', `Se creó el proveedor ${x.code} ${x.name}.`, x.id);
      stat(d, 'proveedor_creado', origin);
    }
  });
}

export type ProductInput = Pick<Product, 'sku' | 'name' | 'category' | 'unit' | 'price' | 'reorderPoint' | 'reorderQty' | 'supplierId'> & {
  id?: string;
  cost?: number;
  active?: boolean;
};

export function saveProduct(s: ErpState, input: ProductInput, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    const sku = input.sku.trim().toUpperCase();
    if (!/^[A-Z0-9-]{3,12}$/.test(sku)) throw new ErpError('El código SKU debe tener de 3 a 12 caracteres: letras, números o guiones.');
    if (d.products.some((p) => p.sku === sku && p.id !== input.id)) throw new ErpError(`El SKU ${sku} ya existe.`);
    if (input.name.trim().length < 3) throw new ErpError('Escribe el nombre del producto.');
    if (!(input.price > 0)) throw new ErpError('El precio de venta debe ser mayor que 0.');
    if (input.reorderPoint < 0 || input.reorderQty < 0) throw new ErpError('El punto de reorden y la cantidad de reposición no pueden ser negativos.');
    if (input.reorderPoint > 0 && input.reorderQty === 0) throw new ErpError('Si defines un punto de reorden, define también la cantidad a reponer.');
    findOr(d.suppliers, input.supplierId, 'el proveedor');
    if (input.id) {
      const p = findOr(d.products, input.id, 'el producto');
      const changedReorder = p.reorderPoint !== input.reorderPoint || p.reorderQty !== input.reorderQty;
      const priceChanged = p.price !== input.price;
      Object.assign(p, {
        sku,
        name: input.name.trim(),
        category: input.category.trim() || 'General',
        unit: input.unit.trim() || 'und',
        price: round(input.price),
        reorderPoint: round(input.reorderPoint),
        reorderQty: round(input.reorderQty),
        supplierId: input.supplierId,
        active: input.active ?? p.active,
      });
      addLog(d, 'inventario', 'info', `Se actualizó el producto ${p.sku} ${p.name}.`, p.id);
      stat(d, 'producto_editado', origin);
      if (changedReorder && p.reorderPoint > 0) stat(d, 'reorden_configurado', origin);
      if (priceChanged) stat(d, 'precio_cambiado', origin);
      if (p.price < p.cost) notify(d, 'inventario', 'alerta', `El precio de ${p.sku} quedó por debajo del costo: cada venta genera pérdida.`, { module: 'inventario', id: p.id });
    } else {
      if (!(input.cost && input.cost > 0)) throw new ErpError('Indica el costo unitario inicial del producto.');
      const p: Product = {
        id: nextId(d, 'prd'),
        sku,
        name: input.name.trim(),
        category: input.category.trim() || 'General',
        unit: input.unit.trim() || 'und',
        cost: round(input.cost),
        price: round(input.price),
        refPrice: round(input.price),
        stock: 0,
        reserved: 0,
        reorderPoint: round(input.reorderPoint),
        reorderQty: round(input.reorderQty),
        supplierId: input.supplierId,
        webPublished: false,
        active: true,
        demandShare: 0.08,
      };
      d.products.push(p);
      addLog(d, 'inventario', 'exito', `Se creó el producto ${p.sku} ${p.name}.`, p.id);
      stat(d, 'producto_creado', origin);
    }
  });
}

export function toggleWebPublish(s: ErpState, productId: string, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    const p = findOr(d.products, productId, 'el producto');
    if (!p.webPublished && p.price < p.cost * 1.1) throw new ErpError(`No publiques ${p.sku}: su precio (${cop(p.price)}) no cubre el costo más 10 % para la comisión de pasarela y el envío.`);
    if (!p.webPublished && !p.active) throw new ErpError('Activa el producto antes de publicarlo.');
    p.webPublished = !p.webPublished;
    addLog(d, 'ecommerce', 'info', `${p.sku} ${p.webPublished ? 'se publicó en' : 'se retiró de'} la tienda virtual.`, p.id);
    if (p.webPublished) stat(d, 'producto_publicado', origin);
  });
}

// ---------------------------------------------------------------- Inventario

export function adjustStock(s: ErpState, productId: string, countedQty: number, reason: string, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    const p = findOr(d.products, productId, 'el producto');
    if (!Number.isInteger(countedQty) || countedQty < 0) throw new ErpError('El conteo físico debe ser un número entero mayor o igual a 0.');
    if (reason.trim().length < 5) throw new ErpError('Explica el motivo del ajuste (mínimo 5 caracteres), por ejemplo "Conteo físico mensual".');
    const diff = countedQty - p.stock;
    if (diff === 0) throw new ErpError('El conteo coincide con el sistema: no hay nada que ajustar.');
    if (countedQty < p.reserved) throw new ErpError(`Hay ${p.reserved} unidades reservadas para pedidos confirmados. El conteo no puede ser menor.`);
    p.stock = countedQty;
    const value = Math.abs(diff) * p.cost;
    d.moves.push({ id: nextId(d, 'mov'), day: d.day, productId: p.id, type: 'ajuste', qty: diff, unitCost: p.cost, balance: p.stock, ref: nextNumber(d, 'AJ'), note: reason.trim() });
    if (diff < 0) post(d, `Faltante de inventario ${p.sku}: ${reason.trim()}`, p.sku, [{ account: '5195', debit: value, credit: 0 }, { account: '1435', debit: 0, credit: value }]);
    else post(d, `Sobrante de inventario ${p.sku}: ${reason.trim()}`, p.sku, [{ account: '1435', debit: value, credit: 0 }, { account: '4250', debit: 0, credit: value }]);
    addLog(d, 'inventario', diff < 0 ? 'alerta' : 'info', `Ajuste de inventario de ${p.sku}: ${diff > 0 ? '+' : ''}${diff} unidades.`, p.id);
    stat(d, 'ajuste_inventario', origin);
  });
}

// ---------------------------------------------------------------- Ventas

export interface SalesInput {
  customerId: string;
  lines: OrderLine[];
  channel?: SalesOrder['channel'];
  notes?: string;
  opportunityId?: string | null;
  campaignId?: string | null;
}

function validateLines(d: ErpState, lines: OrderLine[]) {
  if (lines.length === 0) throw new ErpError('Agrega al menos un producto al pedido.');
  const seen = new Set<string>();
  for (const l of lines) {
    const p = findOr(d.products, l.productId, 'un producto del pedido');
    if (seen.has(l.productId)) throw new ErpError(`${p.sku} aparece dos veces: une las cantidades en una sola línea.`);
    seen.add(l.productId);
    if (!Number.isInteger(l.qty) || l.qty <= 0) throw new ErpError(`La cantidad de ${p.sku} debe ser un entero mayor que 0.`);
    if (!(l.price > 0)) throw new ErpError(`El precio de ${p.sku} debe ser mayor que 0.`);
    if (l.discount < 0 || l.discount > 0.5) throw new ErpError(`El descuento de ${p.sku} debe estar entre 0 % y 50 %.`);
  }
}

export function createSalesOrder(s: ErpState, input: SalesInput, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    const c = findOr(d.customers, input.customerId, 'el cliente');
    if (!c.active) throw new ErpError('El cliente está inactivo.');
    validateLines(d, input.lines);
    const o: SalesOrder = {
      id: nextId(d, 'so'),
      number: nextNumber(d, 'PV'),
      customerId: c.id,
      channel: input.channel ?? 'directo',
      day: d.day,
      lines: input.lines.map((l) => ({ ...l, price: round(l.price) })),
      status: 'cotizacion',
      origin,
      invoiceNumber: null,
      invoiceDay: null,
      dueDay: null,
      paidDay: null,
      dispatchDay: null,
      costOfSales: 0,
      campaignId: input.campaignId ?? null,
      opportunityId: input.opportunityId ?? null,
      reminders: 0,
      notes: input.notes ?? '',
    };
    d.salesOrders.push(o);
    if (o.opportunityId) {
      const op = d.opportunities.find((x) => x.id === o.opportunityId);
      if (op) op.salesOrderId = o.id;
    }
    addLog(d, 'ventas', 'info', `Se creó la cotización ${o.number} para ${c.name}.`, o.id);
    stat(d, 'cotizacion_creada', origin);
    const disc = o.lines.some((l) => l.discount > 0);
    if (origin === 'usuario' && disc) stat(d, 'pedido_con_descuento', origin);
  });
}

export function updateSalesOrder(s: ErpState, id: string, input: SalesInput, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    const o = findOr(d.salesOrders, id, 'el pedido');
    if (o.status !== 'cotizacion') throw new ErpError('Solo se pueden editar pedidos en estado cotización.');
    findOr(d.customers, input.customerId, 'el cliente');
    validateLines(d, input.lines);
    o.customerId = input.customerId;
    o.lines = input.lines.map((l) => ({ ...l, price: round(l.price) }));
    o.notes = input.notes ?? o.notes;
    addLog(d, 'ventas', 'info', `Se actualizó la cotización ${o.number}.`, o.id);
    stat(d, 'cotizacion_editada', origin);
  });
}

export function confirmSalesOrder(s: ErpState, id: string, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    const o = findOr(d.salesOrders, id, 'el pedido');
    if (o.status !== 'cotizacion') throw new ErpError('Solo se confirman cotizaciones.');
    const c = findOr(d.customers, o.customerId, 'el cliente');
    const { total } = orderTotals(o.lines, d.settings.ivaRate);
    if (o.channel !== 'web' && c.creditLimit > 0) {
      const used = receivableOf(d, c.id);
      if (used + total > c.creditLimit)
        throw new ErpError(`Supera el cupo de crédito de ${c.name}: cupo ${cop(c.creditLimit)}, cartera actual ${cop(used)}, pedido ${cop(total)}. Pide un abono o aumenta el cupo en el CRM.`);
    }
    for (const l of o.lines) findOr(d.products, l.productId, 'el producto').reserved += l.qty;
    o.status = 'confirmado';
    addLog(d, 'ventas', 'exito', `Pedido ${o.number} confirmado por ${cop(total)}.`, o.id);
    stat(d, 'pedido_confirmado', origin);
    const margin = orderMargin(d, o);
    if (origin === 'usuario' && o.lines.some((l) => l.discount > 0) && o.lines.every((l) => l.discount <= 0.1) && margin >= 0.25) stat(d, 'venta_descuento_sano', origin);
    const rule = d.rules.find((r) => r.type === 'correo_confirmacion' && r.active);
    if (rule && c.email) {
      rule.runs += 1;
      rule.lastRunDay = d.day;
      addLog(d, 'automatizacion', 'exito', `Correo de confirmación de ${o.number} enviado a ${c.email}.`, o.id);
    }
  });
}

/** Margen bruto del pedido sobre el costo promedio actual. */
export function orderMargin(s: ErpState, o: SalesOrder): number {
  const { subtotal } = orderTotals(o.lines, s.settings.ivaRate);
  if (subtotal <= 0) return 0;
  const cost = o.lines.reduce((a, l) => a + l.qty * (s.products.find((p) => p.id === l.productId)?.cost ?? 0), 0);
  return (subtotal - cost) / subtotal;
}

export function dispatchSalesOrder(s: ErpState, id: string, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    const o = findOr(d.salesOrders, id, 'el pedido');
    if (o.status !== 'confirmado') throw new ErpError('Solo se despachan pedidos confirmados.');
    for (const l of o.lines) {
      const p = findOr(d.products, l.productId, 'el producto');
      if (!d.settings.allowNegativeStock && p.stock < l.qty)
        throw new ErpError(`No hay inventario suficiente de ${p.sku}: hay ${p.stock} y el pedido pide ${l.qty}. Recibe una orden de compra o ajusta el pedido.`);
    }
    let cost = 0;
    for (const l of o.lines) {
      const p = findOr(d.products, l.productId, 'el producto');
      p.stock -= l.qty;
      p.reserved = Math.max(0, p.reserved - l.qty);
      cost += l.qty * p.cost;
      d.moves.push({ id: nextId(d, 'mov'), day: d.day, productId: p.id, type: 'salida', qty: -l.qty, unitCost: p.cost, balance: p.stock, ref: o.number, note: 'Despacho de pedido' });
    }
    o.costOfSales = round(cost);
    o.status = 'despachado';
    o.dispatchDay = d.day;
    post(d, `Costo de ventas del pedido ${o.number}`, o.number, [
      { account: '6135', debit: cost, credit: 0 },
      { account: '1435', debit: 0, credit: cost },
    ]);
    addLog(d, 'ventas', 'exito', `Pedido ${o.number} despachado.`, o.id);
    stat(d, 'pedido_despachado', origin);
  });
}

export function invoiceSalesOrder(s: ErpState, id: string, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    const o = findOr(d.salesOrders, id, 'el pedido');
    if (o.status !== 'despachado') throw new ErpError('Factura después de despachar: así la factura corresponde a lo entregado.');
    const c = findOr(d.customers, o.customerId, 'el cliente');
    const { subtotal, iva, total } = orderTotals(o.lines, d.settings.ivaRate);
    o.invoiceNumber = nextNumber(d, 'FE');
    o.invoiceDay = d.day;
    o.status = 'facturado';
    post(d, `Factura electrónica ${o.invoiceNumber} a ${c.name}`, o.invoiceNumber, [
      { account: '1305', debit: total, credit: 0 },
      { account: '4135', debit: 0, credit: subtotal },
      { account: '2408', debit: 0, credit: iva },
    ]);
    stat(d, 'pedido_facturado', origin);
    if (o.channel === 'web') {
      // Los pedidos web se pagan en línea: la pasarela abona el valor menos su comisión.
      const fee = round(total * GATEWAY_FEE);
      o.paidDay = d.day;
      o.dueDay = d.day;
      o.status = 'pagado';
      post(d, `Recaudo por pasarela de ${o.invoiceNumber}`, o.invoiceNumber, [
        { account: '1110', debit: total - fee, credit: 0 },
        { account: '5305', debit: fee, credit: 0 },
        { account: '1305', debit: 0, credit: total },
      ]);
      stat(d, 'pedido_web_facturado', origin);
      if (o.campaignId) {
        const camp = d.campaigns.find((x) => x.id === o.campaignId);
        if (camp) camp.revenue += subtotal;
      }
      addLog(d, 'ventas', 'exito', `Factura ${o.invoiceNumber} emitida y pagada por pasarela (${cop(total)}).`, o.id);
    } else {
      o.dueDay = d.day + (c.paymentTerm || 0);
      if (c.paymentTerm === 0) {
        o.paidDay = d.day;
        o.status = 'pagado';
        post(d, `Pago de contado de ${o.invoiceNumber}`, o.invoiceNumber, [
          { account: '1110', debit: total, credit: 0 },
          { account: '1305', debit: 0, credit: total },
        ]);
      }
      addLog(d, 'ventas', 'exito', `Factura ${o.invoiceNumber} emitida por ${cop(total)}${c.paymentTerm ? `, vence el día ${o.dueDay}` : ', pagada de contado'}.`, o.id);
    }
    if (o.status === 'pagado') stat(d, 'pedido_pagado', origin);
  });
}

export function registerPayment(s: ErpState, id: string, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    const o = findOr(d.salesOrders, id, 'el pedido');
    if (o.status !== 'facturado') throw new ErpError('Solo se registra pago de facturas pendientes.');
    const { total } = orderTotals(o.lines, d.settings.ivaRate);
    o.status = 'pagado';
    o.paidDay = d.day;
    post(d, `Pago recibido de ${o.invoiceNumber}`, o.invoiceNumber ?? o.number, [
      { account: '1110', debit: total, credit: 0 },
      { account: '1305', debit: 0, credit: total },
    ]);
    addLog(d, 'ventas', 'exito', `Pago de ${o.invoiceNumber} registrado por ${cop(total)}.`, o.id);
    stat(d, 'pago_registrado', origin);
    stat(d, 'pedido_pagado', origin);
    if (o.dueDay !== null && d.day > o.dueDay) stat(d, 'cartera_vencida_cobrada', origin);
  });
}

export function sendReminder(s: ErpState, id: string, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    const o = findOr(d.salesOrders, id, 'el pedido');
    if (o.status !== 'facturado') throw new ErpError('Solo se envían recordatorios de facturas pendientes.');
    o.reminders += 1;
    const c = d.customers.find((x) => x.id === o.customerId);
    addLog(d, 'ventas', 'info', `Recordatorio de cobro de ${o.invoiceNumber} enviado a ${c?.name ?? 'cliente'}.`, o.id);
    stat(d, 'recordatorio_enviado', origin);
  });
}

export function cancelSalesOrder(s: ErpState, id: string, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    const o = findOr(d.salesOrders, id, 'el pedido');
    if (o.status !== 'cotizacion' && o.status !== 'confirmado') throw new ErpError('Un pedido despachado o facturado no se anula: se registra una nota crédito.');
    if (o.status === 'confirmado') for (const l of o.lines) {
      const p = d.products.find((x) => x.id === l.productId);
      if (p) p.reserved = Math.max(0, p.reserved - l.qty);
    }
    o.status = 'anulado';
    addLog(d, 'ventas', 'alerta', `Pedido ${o.number} anulado.`, o.id);
    stat(d, 'pedido_anulado', origin);
  });
}

// ---------------------------------------------------------------- Compras

export function createPurchaseOrder(s: ErpState, input: { supplierId: string; lines: PurchaseLine[]; notes?: string }, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    const sup = findOr(d.suppliers, input.supplierId, 'el proveedor');
    if (!sup.active) throw new ErpError('El proveedor está inactivo.');
    if (input.lines.length === 0) throw new ErpError('Agrega al menos un producto a la orden de compra.');
    const seen = new Set<string>();
    for (const l of input.lines) {
      const p = findOr(d.products, l.productId, 'un producto de la orden');
      if (seen.has(l.productId)) throw new ErpError(`${p.sku} aparece dos veces en la orden.`);
      seen.add(l.productId);
      if (!Number.isInteger(l.qty) || l.qty <= 0) throw new ErpError(`La cantidad de ${p.sku} debe ser un entero mayor que 0.`);
      if (!(l.cost > 0)) throw new ErpError(`El costo de ${p.sku} debe ser mayor que 0.`);
    }
    const po = {
      id: nextId(d, 'po'),
      number: nextNumber(d, 'OC'),
      supplierId: sup.id,
      day: d.day,
      expectedDay: d.day + sup.leadTimeDays,
      lines: input.lines.map((l) => ({ ...l, cost: round(l.cost) })),
      status: 'borrador' as const,
      origin,
      receivedDay: null,
      dueDay: null,
      paidDay: null,
      notes: input.notes ?? '',
    };
    d.purchaseOrders.push(po);
    addLog(d, 'compras', 'info', `Se creó la orden de compra ${po.number} a ${sup.name}.`, po.id);
    stat(d, 'oc_creada', origin);
  });
}

export function approvePurchaseOrder(s: ErpState, id: string, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    const po = findOr(d.purchaseOrders, id, 'la orden de compra');
    if (po.status !== 'borrador') throw new ErpError('Solo se aprueban órdenes en borrador.');
    const sup = findOr(d.suppliers, po.supplierId, 'el proveedor');
    const { total } = purchaseTotals(po.lines, d.settings.ivaRate);
    po.status = 'aprobada';
    po.expectedDay = d.day + sup.leadTimeDays;
    addLog(d, 'compras', 'exito', `Orden ${po.number} aprobada por ${cop(total)}. Llega el día ${po.expectedDay}.`, po.id);
    stat(d, 'oc_aprobada', origin);
    if (total > d.settings.poApprovalLimit) {
      addLog(d, 'compras', 'alerta', `${po.number} supera el límite de aprobación (${cop(d.settings.poApprovalLimit)}) y quedó aprobada por gerencia.`, po.id);
      stat(d, 'oc_aprobacion_gerencia', origin);
    }
  });
}

export function receivePurchaseOrder(s: ErpState, id: string, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    const po = findOr(d.purchaseOrders, id, 'la orden de compra');
    if (po.status !== 'aprobada') throw new ErpError('Solo se reciben órdenes aprobadas.');
    if (d.day < po.expectedDay) throw new ErpError(`La mercancía de ${po.number} aún está en camino: llega el día ${po.expectedDay}. Usa "Cerrar día" para avanzar.`);
    const sup = findOr(d.suppliers, po.supplierId, 'el proveedor');
    for (const l of po.lines) {
      const p = findOr(d.products, l.productId, 'el producto');
      const value = p.stock * p.cost + l.qty * l.cost;
      p.stock += l.qty;
      p.cost = p.stock > 0 ? round(value / p.stock) : l.cost;
      d.moves.push({ id: nextId(d, 'mov'), day: d.day, productId: p.id, type: 'entrada', qty: l.qty, unitCost: l.cost, balance: p.stock, ref: po.number, note: `Recepción de ${sup.name}` });
    }
    const { subtotal, iva, total } = purchaseTotals(po.lines, d.settings.ivaRate);
    po.status = 'recibida';
    po.receivedDay = d.day;
    po.dueDay = d.day + sup.paymentTermDays;
    post(d, `Compra ${po.number} a ${sup.name}`, po.number, [
      { account: '1435', debit: subtotal, credit: 0 },
      { account: '2408', debit: iva, credit: 0 },
      { account: '2205', debit: 0, credit: total },
    ]);
    addLog(d, 'compras', 'exito', `Mercancía de ${po.number} recibida. Cuenta por pagar de ${cop(total)} con vencimiento el día ${po.dueDay}.`, po.id);
    stat(d, 'oc_recibida', origin);
  });
}

export function payPurchaseOrder(s: ErpState, id: string, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    const po = findOr(d.purchaseOrders, id, 'la orden de compra');
    if (po.status !== 'recibida') throw new ErpError('Solo se pagan órdenes recibidas.');
    const { total } = purchaseTotals(po.lines, d.settings.ivaRate);
    const cash = balanceOf(d.journal, '1110');
    if (cash < total) throw new ErpError(`Saldo insuficiente en bancos: hay ${cop(cash)} y la orden vale ${cop(total)}. Cobra cartera antes de pagar.`);
    po.status = 'pagada';
    po.paidDay = d.day;
    post(d, `Pago a proveedor de ${po.number}`, po.number, [
      { account: '2205', debit: total, credit: 0 },
      { account: '1110', debit: 0, credit: total },
    ]);
    addLog(d, 'compras', 'exito', `Pago de ${po.number} por ${cop(total)}.`, po.id);
    stat(d, 'oc_pagada', origin);
  });
}

export function cancelPurchaseOrder(s: ErpState, id: string, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    const po = findOr(d.purchaseOrders, id, 'la orden de compra');
    if (po.status !== 'borrador' && po.status !== 'aprobada') throw new ErpError('Una orden recibida no se anula: se registra una devolución.');
    po.status = 'anulada';
    addLog(d, 'compras', 'alerta', `Orden ${po.number} anulada.`, po.id);
    stat(d, 'oc_anulada', origin);
  });
}

// ---------------------------------------------------------------- CRM

export const STAGES: Array<{ id: OpportunityStage; label: string; probability: number }> = [
  { id: 'prospecto', label: 'Prospecto', probability: 0.1 },
  { id: 'calificado', label: 'Calificado', probability: 0.25 },
  { id: 'propuesta', label: 'Propuesta', probability: 0.5 },
  { id: 'negociacion', label: 'Negociación', probability: 0.75 },
  { id: 'ganada', label: 'Ganada', probability: 1 },
  { id: 'perdida', label: 'Perdida', probability: 0 },
];

export type OpportunityInput = Pick<Opportunity, 'name' | 'customerId' | 'contactName' | 'value' | 'source' | 'notes'> & { id?: string };

export function saveOpportunity(s: ErpState, input: OpportunityInput, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    if (input.name.trim().length < 3) throw new ErpError('Escribe el nombre de la oportunidad.');
    if (!(input.value > 0)) throw new ErpError('El valor estimado debe ser mayor que 0.');
    if (input.customerId) findOr(d.customers, input.customerId, 'el cliente');
    if (!input.customerId && input.contactName.trim().length < 3) throw new ErpError('Indica un cliente o el nombre del contacto.');
    if (input.id) {
      const o = findOr(d.opportunities, input.id, 'la oportunidad');
      Object.assign(o, { ...input, name: input.name.trim(), value: round(input.value) });
      addLog(d, 'crm', 'info', `Se actualizó la oportunidad "${o.name}".`, o.id);
      stat(d, 'oportunidad_editada', origin);
    } else {
      const o: Opportunity = { ...input, id: nextId(d, 'opo'), name: input.name.trim(), value: round(input.value), stage: 'prospecto', createdDay: d.day, closedDay: null, salesOrderId: null, origin };
      d.opportunities.push(o);
      addLog(d, 'crm', 'exito', `Nueva oportunidad "${o.name}" por ${cop(o.value)}.`, o.id);
      stat(d, 'oportunidad_creada', origin);
    }
  });
}

export function moveOpportunity(s: ErpState, id: string, stage: OpportunityStage, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    const o = findOr(d.opportunities, id, 'la oportunidad');
    if (o.stage === 'ganada' || o.stage === 'perdida') throw new ErpError('La oportunidad ya está cerrada.');
    if (stage === o.stage) return;
    if (stage === 'ganada' && !o.customerId) throw new ErpError('Para ganar la oportunidad, asígnale un cliente registrado (edítala y elige el cliente, o créalo primero).');
    o.stage = stage;
    if (stage === 'ganada' || stage === 'perdida') o.closedDay = d.day;
    addLog(d, 'crm', stage === 'ganada' ? 'exito' : stage === 'perdida' ? 'alerta' : 'info', `Oportunidad "${o.name}" pasó a ${STAGES.find((x) => x.id === stage)?.label}.`, o.id);
    stat(d, 'oportunidad_movida', origin);
    if (stage === 'ganada') stat(d, 'oportunidad_ganada', origin);
    if (stage === 'propuesta') stat(d, 'oportunidad_propuesta', origin);
  });
}

export type CaseInput = Pick<ServiceCase, 'customerId' | 'subject' | 'priority' | 'channel'> & { id?: string };

export function saveCase(s: ErpState, input: CaseInput, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    findOr(d.customers, input.customerId, 'el cliente');
    if (input.subject.trim().length < 5) throw new ErpError('Describe el caso (mínimo 5 caracteres).');
    if (input.id) {
      const c = findOr(d.cases, input.id, 'el caso');
      if (c.status === 'resuelto') throw new ErpError('El caso ya está resuelto.');
      Object.assign(c, { ...input, subject: input.subject.trim() });
      addLog(d, 'crm', 'info', `Se actualizó el caso ${c.number}.`, c.id);
      stat(d, 'caso_editado', origin);
    } else {
      const c: ServiceCase = { ...input, id: nextId(d, 'cas'), number: nextNumber(d, 'CS'), subject: input.subject.trim(), status: 'abierto', openedDay: d.day, resolvedDay: null, resolution: '', origin };
      d.cases.push(c);
      addLog(d, 'crm', 'info', `Nuevo caso ${c.number}: ${c.subject}.`, c.id);
      stat(d, 'caso_creado', origin);
    }
  });
}

export function startCase(s: ErpState, id: string, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    const c = findOr(d.cases, id, 'el caso');
    if (c.status !== 'abierto') throw new ErpError('El caso ya está en proceso o resuelto.');
    c.status = 'en_proceso';
    addLog(d, 'crm', 'info', `Caso ${c.number} en proceso.`, c.id);
    stat(d, 'caso_en_proceso', origin);
  });
}

export function resolveCase(s: ErpState, id: string, resolution: string, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    const c = findOr(d.cases, id, 'el caso');
    if (c.status === 'resuelto') throw new ErpError('El caso ya está resuelto.');
    if (resolution.trim().length < 10) throw new ErpError('Registra la solución dada al cliente (mínimo 10 caracteres).');
    c.status = 'resuelto';
    c.resolvedDay = d.day;
    c.resolution = resolution.trim();
    addLog(d, 'crm', 'exito', `Caso ${c.number} resuelto en ${d.day - c.openedDay} días.`, c.id);
    stat(d, 'caso_resuelto', origin);
    if (c.priority === 'alta') stat(d, 'caso_alta_resuelto', origin);
    if (d.day - c.openedDay <= 1) stat(d, 'caso_resuelto_rapido', origin);
  });
}

// ---------------------------------------------------------------- E-commerce

export function saveCampaign(s: ErpState, input: { id?: string; name: string; channel: Campaign['channel']; dailyBudget: number }, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    if (input.name.trim().length < 3) throw new ErpError('Escribe el nombre de la campaña.');
    if (input.dailyBudget < 20000 || input.dailyBudget > 2000000) throw new ErpError('El presupuesto diario debe estar entre $ 20.000 y $ 2.000.000.');
    if (input.id) {
      const c = findOr(d.campaigns, input.id, 'la campaña');
      Object.assign(c, { name: input.name.trim(), channel: input.channel, dailyBudget: round(input.dailyBudget) });
      addLog(d, 'ecommerce', 'info', `Se actualizó la campaña "${c.name}".`, c.id);
      stat(d, 'campana_editada', origin);
    } else {
      if (!d.products.some((p) => p.webPublished)) throw new ErpError('Publica al menos un producto en la tienda antes de pautar: la campaña lleva tráfico al catálogo.');
      const c: Campaign = { id: nextId(d, 'cmp'), name: input.name.trim(), channel: input.channel, dailyBudget: round(input.dailyBudget), active: true, startDay: d.day, daysRun: 0, spend: 0, clicks: 0, orders: 0, revenue: 0 };
      d.campaigns.push(c);
      addLog(d, 'ecommerce', 'exito', `Campaña "${c.name}" activa en ${c.channel === 'meta' ? 'Meta Ads' : 'TikTok Ads'}.`, c.id);
      stat(d, 'campana_creada', origin);
    }
  });
}

export function toggleCampaign(s: ErpState, id: string, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    const c = findOr(d.campaigns, id, 'la campaña');
    c.active = !c.active;
    addLog(d, 'ecommerce', 'info', `Campaña "${c.name}" ${c.active ? 'reactivada' : 'pausada'}.`, c.id);
    stat(d, c.active ? 'campana_reactivada' : 'campana_pausada', origin);
  });
}

// ---------------------------------------------------------------- Automatización

export function saveRule(s: ErpState, id: string, patch: Partial<Pick<AutomationRule, 'active' | 'params'>>, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    const r = findOr(d.rules, id, 'la regla');
    const wasActive = r.active;
    if (patch.params) {
      for (const [k, v] of Object.entries(patch.params)) if (!Number.isFinite(v) || v < 0) throw new ErpError(`El parámetro ${k} debe ser un número mayor o igual a 0.`);
      r.params = { ...r.params, ...patch.params };
    }
    if (patch.active !== undefined) r.active = patch.active;
    addLog(d, 'automatizacion', 'info', `Regla "${r.name}" ${r.active ? 'activa' : 'inactiva'}.`, r.id);
    if (!wasActive && r.active) stat(d, 'regla_activada', origin);
    if (patch.params) stat(d, 'regla_configurada', origin);
  });
}

// ---------------------------------------------------------------- Contabilidad

export function manualEntry(s: ErpState, input: { description: string; lines: JournalLine[] }, origin: Origin = 'usuario'): ErpState {
  return mutate(s, (d) => {
    if (input.description.trim().length < 5) throw new ErpError('Escribe la descripción del asiento.');
    const lines = input.lines.filter((l) => l.debit > 0 || l.credit > 0);
    if (lines.length < 2) throw new ErpError('Un asiento necesita al menos dos líneas: un débito y un crédito.');
    for (const l of lines) {
      if (!ACCOUNTS.some((a) => a.code === l.account)) throw new ErpError(`La cuenta ${l.account} no existe en el plan de cuentas.`);
      if (l.debit > 0 && l.credit > 0) throw new ErpError('Cada línea lleva débito o crédito, no ambos.');
      if (l.debit < 0 || l.credit < 0) throw new ErpError('Los valores no pueden ser negativos.');
    }
    if (!isBalanced(lines)) {
      const dSum = lines.reduce((a, l) => a + l.debit, 0);
      const cSum = lines.reduce((a, l) => a + l.credit, 0);
      throw new ErpError(`Partida doble: los débitos (${cop(dSum)}) deben ser iguales a los créditos (${cop(cSum)}).`);
    }
    post(d, input.description.trim(), 'Manual', lines, true);
    addLog(d, 'contabilidad', 'exito', `Asiento manual registrado: ${input.description.trim()}.`);
    stat(d, 'asiento_manual', origin);
  });
}

// ---------------------------------------------------------------- Navegación y avisos

export function markVisited(s: ErpState, key: string): ErpState {
  if (s.visited[key]) return s;
  return { ...s, visited: { ...s.visited, [key]: true } };
}

export function markNotificationsRead(s: ErpState): ErpState {
  if (s.notifications.every((n) => n.read)) return s;
  return { ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) };
}
