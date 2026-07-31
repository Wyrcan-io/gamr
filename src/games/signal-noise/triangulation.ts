import { STATIONS, type Direction, type Position, type StationId } from './types';

const DIRECTIONS: Direction[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export function bearingFrom(station: StationId, target: Position): Direction {
  const origin = STATIONS[station];
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360;
  return DIRECTIONS[Math.round(angle / 45) % 8];
}

export function bearingSet(station: StationId, target: Position, rough: boolean): Direction[] {
  const exact = bearingFrom(station, target);
  if (!rough) return [exact];
  const index = DIRECTIONS.indexOf(exact);
  return [DIRECTIONS[(index + 7) % 8], exact, DIRECTIONS[(index + 1) % 8]];
}

export function exactRay(station: StationId, target: Position): Position[] {
  const origin = STATIONS[station];
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  return legalZones().filter(zone => {
    const zx = zone.x - origin.x;
    const zy = zone.y - origin.y;
    return zx * dy === zy * dx && zx * dx + zy * dy > 0;
  });
}

export function legalZones(): Position[] {
  const stations = Object.values(STATIONS);
  const zones: Position[] = [];
  for (let y = 0; y < 7; y++) for (let x = 0; x < 9; x++) {
    if (!stations.some(station => station.x === x && station.y === y)) zones.push({ x, y });
  }
  return zones;
}

export function candidatesFor(locks: Array<{ stationId: StationId; allowedBearings: Direction[]; ray?: Position[] }>): Position[] {
  return legalZones().filter(zone => locks.every(lock => {
    if (lock.ray) return lock.ray.some(point => point.x === zone.x && point.y === zone.y);
    return lock.allowedBearings.includes(bearingFrom(lock.stationId, zone));
  }));
}

export function directionGlyph(direction: Direction): string {
  return ({ N: '↑', NE: '↗', E: '→', SE: '↘', S: '↓', SW: '↙', W: '←', NW: '↖' } as Record<Direction, string>)[direction];
}
