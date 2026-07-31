import { PUZZLES } from './content';

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) { result ^= value.charCodeAt(index); result = Math.imul(result, 16777619); }
  return result >>> 0;
}

export function dailyDate(date = new Date()): string { return date.toISOString().slice(0, 10); }
export function dailyPuzzleId(date = new Date()): string {
  const pool = PUZZLES.filter(puzzle => puzzle.chapter >= 2);
  return pool[hash(`stack-trace/v1/${dailyDate(date)}`) % pool.length].id;
}
