export function mixSeed(...parts: number[]): number {
  let value = 0x9e3779b9;
  for (const part of parts) {
    value ^= (part >>> 0) + 0x6d2b79f5 + ((value << 6) >>> 0) + (value >>> 2);
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
    value = Math.imul(value ^ (value >>> 13), 0x45d9f3b);
    value ^= value >>> 16;
  }
  return value >>> 0;
}

export interface Rng {
  next: () => number;
  int: (maxExclusive: number) => number;
  pick: <T>(items: readonly T[]) => T;
  shuffle: <T>(items: readonly T[]) => T[];
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (maxExclusive: number) => Math.floor(next() * Math.max(1, maxExclusive)),
    pick: <T>(items: readonly T[]) => items[Math.floor(next() * items.length)] ?? items[0],
    shuffle: <T>(items: readonly T[]) => {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}
