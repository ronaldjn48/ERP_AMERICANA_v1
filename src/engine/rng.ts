// Generador pseudoaleatorio con semilla (mulberry32). El estado es un entero que vive dentro de SimState,
// así dos estudiantes con la misma semilla y las mismas decisiones obtienen exactamente el mismo resultado.

export class Rng {
  constructor(public state: number) {
    this.state = state >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Normal estándar (Box-Muller). */
  normal(): number {
    const u = Math.max(this.next(), 1e-12);
    const v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 900000) + 100000;
}
