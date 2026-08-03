export interface DeterminismRestore {
  restore: () => void;
}

/**
 * Installs deterministic Math.random and a monotonic seeded Date.now for one
 * playtest run. Games remain unaware of the test runtime, while failed runs
 * can be replayed from the recorded seed.
 */
export function installDeterminism(seed?: number): DeterminismRestore {
  if (seed === undefined) return { restore: () => {} };
  const originalRandom = Math.random;
  const originalNow = Date.now;
  let randomState = (seed >>> 0) || 0x6d2b79f5;
  const realStart = originalNow();
  const seededStart = seed >>> 0;
  Math.random = () => {
    randomState = (Math.imul(randomState ^ (randomState >>> 15), 1 | randomState) + 0x6d2b79f5) | 0;
    let value = Math.imul(randomState ^ (randomState >>> 7), 61 | randomState);
    value ^= value + Math.imul(value ^ (value >>> 14), 9 | value);
    return ((value ^ (value >>> 9)) >>> 0) / 4294967296;
  };
  Date.now = () => seededStart + (originalNow() - realStart);
  return {
    restore: () => {
      Math.random = originalRandom;
      Date.now = originalNow;
    },
  };
}
