import type { Direction, Point, TerrainCell } from './types';

export const BOARD_SIZE = 9;
export const DIRECTIONS: Direction[] = ['N', 'E', 'S', 'W'];

export function pointKey(point: Point): string { return `${point.x},${point.y}`; }
export function samePoint(a: Point, b: Point): boolean { return a.x === b.x && a.y === b.y; }
export function inBounds(point: Point): boolean { return point.x >= 0 && point.x < BOARD_SIZE && point.y >= 0 && point.y < BOARD_SIZE; }
export function addPoint(a: Point, b: Point): Point { return { x: a.x + b.x, y: a.y + b.y }; }
export function distance(a: Point, b: Point): number { return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); }
export function directionVector(direction: Direction): Point {
  return direction === 'N' ? { x: 0, y: -1 } : direction === 'E' ? { x: 1, y: 0 } : direction === 'S' ? { x: 0, y: 1 } : { x: -1, y: 0 };
}
export function turn(direction: Direction, amount: 1 | 2 | 3): Direction {
  return DIRECTIONS[(DIRECTIONS.indexOf(direction) + amount) % DIRECTIONS.length] ?? direction;
}
export function forward(point: Point, direction: Direction): Point { return addPoint(point, directionVector(direction)); }
export function chartName(point: Point): string { return `${String.fromCharCode(65 + point.x)}${point.y + 1}`; }
export function fromChart(value: string): Point | null {
  const match = /^([A-Ia-i])([1-9])$/.exec(value.trim());
  return match ? { x: match[1].toUpperCase().charCodeAt(0) - 65, y: Number(match[2]) - 1 } : null;
}
export function passable(terrain: TerrainCell[][], point: Point): boolean { return inBounds(point) && terrain[point.y]?.[point.x] !== 'island'; }

/** A supercover line includes every grid cell touched by a straight segment. */
export function supercoverLine(from: Point, to: Point): Point[] {
  const result: Point[] = [];
  const dx = to.x - from.x; const dy = to.y - from.y;
  const nx = Math.abs(dx); const ny = Math.abs(dy);
  const sx = dx === 0 ? 0 : dx > 0 ? 1 : -1; const sy = dy === 0 ? 0 : dy > 0 ? 1 : -1;
  let x = from.x; let y = from.y; let ix = 0; let iy = 0;
  while (ix < nx || iy < ny) {
    const lhs = (1 + 2 * ix) * ny;
    const rhs = (1 + 2 * iy) * nx;
    if (lhs === rhs && ix < nx && iy < ny) {
      result.push({ x: x + sx, y }); result.push({ x, y: y + sy }); x += sx; y += sy; ix++; iy++; result.push({ x, y });
    } else if (lhs < rhs && ix < nx) { x += sx; ix++; result.push({ x, y }); }
    else if (iy < ny) { y += sy; iy++; result.push({ x, y }); }
  }
  return result;
}

export function neighbours(point: Point): Point[] {
  return DIRECTIONS.map(direction => forward(point, direction)).filter(inBounds);
}
