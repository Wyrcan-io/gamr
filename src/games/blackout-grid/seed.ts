export function mixSeed(seed: number, salt: number): number {
  let value = (seed ^ Math.imul(salt, 0x9e3779b9)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
}

export function seededValue(seed: number, salt: number): number {
  return mixSeed(seed, salt) / 0x100000000;
}

