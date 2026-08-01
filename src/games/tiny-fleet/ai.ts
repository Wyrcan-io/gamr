import { choose, type RngState } from './seed';
import { distance, DIRECTIONS } from './grid';
import type { Direction, ObservationState, ShipOrder, ShipState } from './types';

const rangeByClass = { scout: 2, escort: 3, flagship: 4 } as const;

function desiredDirection(from: ShipState, target: ShipState): Direction {
  const dx = target.pos.x - from.pos.x; const dy = target.pos.y - from.pos.y;
  if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) return dx > 0 ? 'E' : 'W';
  if (dy !== 0) return dy > 0 ? 'S' : 'N';
  return from.facing;
}

function helmOrder(current: Direction, desired: Direction): ShipOrder {
  if (current === desired) return { type: 'ahead' };
  const ci = DIRECTIONS.indexOf(current); const di = DIRECTIONS.indexOf(desired);
  const delta = (di - ci + 4) % 4;
  return delta === 2 ? { type: 'about' } : delta === 1 ? { type: 'starboard' } : { type: 'port' };
}

export function chooseEnemyOrders(observation: ObservationState, doctrine: string, rng: RngState): Record<string, ShipOrder> {
  const orders: Record<string, ShipOrder> = {};
  const visibleTargets = observation.visibleShips.filter(ship => ship.side !== observation.viewer && ship.side !== 'neutral');
  for (const ship of observation.ownShips.filter(item => item.afloat)) {
    if (doctrine === 'training') { orders[ship.id] = { type: 'hold' }; continue; }
    const target = visibleTargets.slice().sort((a, b) => distance(ship.pos, a.pos) - distance(ship.pos, b.pos))[0];
    if (target && distance(ship.pos, target.pos) <= rangeByClass[ship.classId] && ship.reload === 0) {
      orders[ship.id] = { type: 'fire', target: { ...target.pos } }; continue;
    }
    if (ship.hull <= 1 && doctrine !== 'raider') { orders[ship.id] = { type: 'brace' }; continue; }
    if (doctrine === 'fogrunner' && ship.classId === 'scout' && !target) { orders[ship.id] = { type: 'sweep' }; continue; }
    const track = observation.tracks.slice().sort((a, b) => distance(ship.pos, a.lastExact) - distance(ship.pos, b.lastExact))[0];
    if (target) orders[ship.id] = helmOrder(ship.facing, desiredDirection(ship, target));
    else if (track) orders[ship.id] = helmOrder(ship.facing, track.lastExact.x >= ship.pos.x ? 'E' : 'W');
    else {
      const fallback: ShipOrder[] = [{ type: 'ahead' }, { type: 'port' }, { type: 'starboard' }, { type: 'hold' }];
      orders[ship.id] = choose(rng, fallback);
    }
  }
  return orders;
}
