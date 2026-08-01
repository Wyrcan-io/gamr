export interface RngState { state: number; }

export function createRng(seed: number): RngState { return { state: seed >>> 0 }; }

export function nextRandom(rng: RngState): number {
  let value = (rng.state + 0x6d2b79f5) | 0;
  rng.state = value;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

export function choose<T>(rng: RngState, items: readonly T[]): T {
  return items[Math.floor(nextRandom(rng) * items.length)] ?? items[0];
}
