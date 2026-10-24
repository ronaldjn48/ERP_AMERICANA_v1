// Estado global del ERP en la interfaz: persistencia, navegación, mensajes emergentes y efectos de gamificación.
import { useSyncExternalStore } from 'react';
import { narrator, sfx } from '../audio';
import { finalGrade } from '../engine/simulation';
import { loadAudioPrefs, loadSave } from '../storage';
import { closeDay } from './day';
import { evaluateMissions, type MissionContext } from './missions';
import { markVisited } from './ops';
import { ErpError, type ErpState, type ModuleKey } from './types';

const KEY = 'erp-americana:erp:v1';
const ROUTE_KEY = 'erp-americana:ruta:v1';

export interface Route {
  module: ModuleKey;
  view?: string;
  id?: string;
}

export interface Toast {
  id: number;
  kind: 'exito' | 'error' | 'info' | 'logro';
  title: string;
  text?: string;
  group?: string;
}

function load(): ErpState | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as ErpState;
    return s && s.version === 1 && Array.isArray(s.products) ? s : null;
  } catch {
    return null;
  }
}

function persist(s: ErpState | null) {
  try {
    if (s) window.localStorage.setItem(KEY, JSON.stringify(s));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* almacenamiento bloqueado o lleno: el estado sigue en memoria */
  }
}

function loadRoute(): Route {
  try {
    const r = JSON.parse(window.localStorage.getItem(ROUTE_KEY) ?? 'null') as Route | null;
    if (r && typeof r.module === 'string') return { module: r.module, view: r.view };
  } catch {
    /* sin acción */
  }
  return { module: 'inicio' };
}

type Listener = () => void;

class Store<T> {
  private listeners = new Set<Listener>();
  constructor(private value: T) {}
  get = () => this.value;
  set = (v: T) => {
    this.value = v;
    this.listeners.forEach((l) => l());
  };
  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
}

export const erpStore = new Store<ErpState | null>(typeof window === 'undefined' ? null : load());
export const routeStore = new Store<Route>(typeof window === 'undefined' ? { module: 'inicio' } : loadRoute());
export const toastStore = new Store<Toast[]>([]);
/** Misión recién completada para mostrar la celebración. */
export const celebrationStore = new Store<{ title: string; xp: number; badges: string[]; level: string | null; takeaway: string } | null>(null);

export const useErp = () => useSyncExternalStore(erpStore.subscribe, erpStore.get, erpStore.get);
export const useRoute = () => useSyncExternalStore(routeStore.subscribe, routeStore.get, routeStore.get);
export const useToasts = () => useSyncExternalStore(toastStore.subscribe, toastStore.get, toastStore.get);
export const useCelebration = () => useSyncExternalStore(celebrationStore.subscribe, celebrationStore.get, celebrationStore.get);

let toastSeq = 0;
export function toast(kind: Toast['kind'], title: string, text?: string, group?: string) {
  const t: Toast = { id: ++toastSeq, kind, title, text, group };
  // Máximo 3 avisos; un aviso de un grupo (por ejemplo, el resumen del día) reemplaza al anterior del mismo grupo.
  const rest = toastStore.get().filter((x) => !group || x.group !== group);
  toastStore.set([...rest.slice(-2), t]);
  window.setTimeout(() => toastStore.set(toastStore.get().filter((x) => x.id !== t.id)), kind === 'error' ? 7000 : 4500);
}

export function dismissToast(id: number) {
  toastStore.set(toastStore.get().filter((x) => x.id !== id));
}

export function missionContext(): MissionContext {
  const save = typeof window === 'undefined' ? null : loadSave();
  return { simGrade: save && save.state.finished ? finalGrade(save.state.history) : null };
}

function commit(next: ErpState) {
  const { state, events } = evaluateMissions(next, missionContext());
  erpStore.set(state);
  persist(state);
  if (events.completed.length > 0) {
    const m = events.completed[events.completed.length - 1];
    const xp = events.completed.reduce((a, x) => a + x.xp, 0);
    sfx.play('finish');
    celebrationStore.set({ title: m.title, xp, badges: events.badges.map((b) => b.name), level: events.levelUp, takeaway: m.takeaway });
    if (loadAudioPrefs().autoNarrate) {
      let text = `Misión completada: ${m.title}. Ganaste ${xp} puntos de experiencia. Regla de decisión: ${m.takeaway}`;
      if (events.badges.length) text += ` Nueva insignia: ${events.badges.map((b) => b.name).join(', ')}.`;
      if (events.levelUp) text += ` Subiste de nivel. Ahora eres ${events.levelUp}.`;
      narrator.speak(text, `mision-${m.id}`);
    }
  } else if (events.badges.length) {
    sfx.play('success');
    toast('logro', `Nueva insignia: ${events.badges.map((b) => b.name).join(', ')}`);
  }
}

/** Ejecuta una operación del ERP. Devuelve true si se aplicó; si viola una regla de negocio muestra el error. */
export function run(op: (s: ErpState) => ErpState, success?: string): boolean {
  const s = erpStore.get();
  if (!s) return false;
  try {
    const next = op(s);
    commit(next);
    if (success) {
      toast('exito', success);
      sfx.play('click');
    }
    return true;
  } catch (e) {
    const msg = e instanceof ErpError ? e.message : `Error inesperado: ${(e as Error).message}`;
    toast('error', 'No se pudo completar la acción', msg);
    sfx.play('error');
    return false;
  }
}

export function startWorkspace(s: ErpState) {
  erpStore.set(s);
  persist(s);
  navigate({ module: 'inicio' });
  commit(s);
}

export function resetWorkspace() {
  narrator.stop();
  erpStore.set(null);
  persist(null);
  routeStore.set({ module: 'inicio' });
}

export function replaceWorkspace(s: ErpState) {
  erpStore.set(s);
  persist(s);
}

export function navigate(r: Route) {
  routeStore.set(r);
  try {
    window.localStorage.setItem(ROUTE_KEY, JSON.stringify({ module: r.module, view: r.view }));
  } catch {
    /* sin acción */
  }
  const s = erpStore.get();
  if (s) {
    let next = markVisited(s, r.module);
    if (r.view) next = markVisited(next, `${r.module}:${r.view}`);
    if (next !== s) commit(next);
  }
  if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
}

const pl = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function closeDayAction(): boolean {
  const s = erpStore.get();
  if (!s) return false;
  const celebrationBefore = celebrationStore.get();
  const ok = run(closeDay);
  const after = erpStore.get();
  const missionCompleted = celebrationStore.get() !== celebrationBefore;
  if (ok && after?.lastDay) {
    const d = after.lastDay;
    const parts = [
      `Día ${after.day}.`,
      d.webOrders ? `${pl(d.webOrders, 'pedido nuevo', 'pedidos nuevos')} en la tienda virtual.` : 'Sin pedidos web nuevos.',
      d.quotes ? `${pl(d.quotes, 'solicitud', 'solicitudes')} de cotización.` : '',
      d.leads ? `${pl(d.leads, 'oportunidad nueva', 'oportunidades nuevas')} en el CRM.` : '',
      d.cases ? `${pl(d.cases, 'caso de servicio nuevo', 'casos de servicio nuevos')}.` : '',
      d.payments ? `${pl(d.payments, 'pago recibido', 'pagos recibidos')} de clientes.` : '',
      d.readyPOs ? `${pl(d.readyPOs, 'orden de compra lista', 'órdenes de compra listas')} para recibir.` : '',
      d.ruleRuns ? `Las automatizaciones hicieron ${pl(d.ruleRuns, 'acción', 'acciones')}.` : '',
      d.monthlyClose ? 'Se registró el cierre del mes con nómina, arriendo y servicios.' : '',
      d.stockouts ? `Atención: ${pl(d.stockouts, 'producto', 'productos')} con pedidos sin inventario suficiente.` : '',
    ].filter(Boolean);
    toast('info', `Comienza el día ${after.day}`, parts.slice(1).join(' '), 'dia');
    sfx.play(d.stockouts ? 'warning' : 'event');
    // Si se completó una misión, su narración tiene prioridad; el resumen queda en el aviso.
    if (loadAudioPrefs().autoNarrate && !missionCompleted) narrator.speak(parts.join(' '), `dia-${after.day}`);
  }
  return ok;
}
