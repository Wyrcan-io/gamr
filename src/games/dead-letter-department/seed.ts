export function hashSeed(seed: number, salt: number): number {
  let value = (seed ^ Math.imul(salt + 1, 0x9e3779b9)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
}

export function seededValue(seed: number, salt: number): number {
  return hashSeed(seed, salt) / 0x100000000;
}

export function makeRng(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

export function pick<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)] ?? items[0];
}
