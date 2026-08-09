import type { Direction, Scenario, Tile, Train, HazardEvent } from './types';

const dirs = (...connections: Direction[]): Direction[] => connections;
const blank = (kind: Tile['kind'] = 'void'): Tile => ({ kind, connections: [], closed: false, obstruction: false, reinforced: false });
function grid(width: number, height: number): Tile[][] { return Array.from({ length: height }, () => Array.from({ length: width }, () => blank())); }
function setTrack(tiles: Tile[][], x: number, y: number, connections: Direction[], kind: Tile['kind'] = 'track', station?: string, safeTerminus = false): void {
  tiles[y][x] = { ...blank(kind), connections, station, safeTerminus, switchExits: kind === 'junction' ? connections.filter(d => d !== 'W') : undefined, activeExit: kind === 'junction' ? connections[0] : undefined };
}
function trains(values: Train[]): Train[] { return values; }
function hazard(id: string, turn: number, x: number, y: number, kind: HazardEvent['kind'], effect: HazardEvent['effect']): HazardEvent { return { id, turn, warningTurns: 1, target: { x, y }, kind, effect, repairable: effect !== 'block-junction' }; }

function riverLine(): Scenario {
  const width = 17; const height = 11; const tiles = grid(width, height);
  setTrack(tiles, 1, 5, dirs('E'), 'station', 'EASTBANK');
  setTrack(tiles, 2, 5, dirs('W', 'E')); setTrack(tiles, 3, 5, dirs('W', 'E', 'S'), 'junction');
  setTrack(tiles, 4, 5, dirs('W', 'E')); setTrack(tiles, 5, 5, dirs('W', 'E')); setTrack(tiles, 6, 5, dirs('W', 'E'));
  setTrack(tiles, 7, 5, dirs('W', 'E', 'S'), 'junction'); setTrack(tiles, 8, 5, dirs('W', 'E')); setTrack(tiles, 9, 5, dirs('W', 'E')); setTrack(tiles, 10, 5, dirs('W', 'E'));
  setTrack(tiles, 11, 5, dirs('W', 'E'), 'track', 'MARSH'); setTrack(tiles, 12, 5, dirs('W', 'E')); setTrack(tiles, 13, 5, dirs('W', 'E')); setTrack(tiles, 14, 5, dirs('W'), 'station', 'HARBOR', true);
  setTrack(tiles, 3, 6, dirs('N', 'S'), 'bridge'); setTrack(tiles, 3, 7, dirs('N', 'S')); setTrack(tiles, 3, 8, dirs('N', 'E')); setTrack(tiles, 4, 8, dirs('W', 'E')); setTrack(tiles, 5, 8, dirs('W'), 'station', 'SOUTH LOOP');
  const initial = trains([
    { id: 'A', name: 'Eastbank School', kind: 'passenger', position: { x: 1, y: 5 }, heading: 'E', people: 46, supplies: 0, priority: 1, status: 'moving', holdUntilTurn: null },
    { id: 'B', name: 'Morrow Clinic', kind: 'medical', position: { x: 5, y: 5 }, heading: 'E', people: 28, supplies: 4, priority: 1, status: 'moving', holdUntilTurn: null },
    { id: 'C', name: 'Water & Generators', kind: 'supply', position: { x: 3, y: 8 }, heading: 'E', people: 0, supplies: 12, priority: 2, status: 'moving', holdUntilTurn: null },
  ]);
  return { id: 'river-line', name: 'River Line', width, height, tiles, trains: initial, hazards: [hazard('marsh-rise', 3, 11, 5, 'flood', 'close-track'), hazard('bridge-scour', 5, 3, 6, 'flood', 'close-track'), hazard('signal-fire', 7, 7, 5, 'fire', 'block-junction')], maxTurns: 10, targetPeople: 60, targetSupplies: 8, briefing: ['Two passenger trains are moving east toward Harbor.', 'Marsh bridge closes after turn 3 unless repaired.', 'Get at least 60 people and 8 supply units home.'] };
}
function splitValley(): Scenario {
  const scenario = riverLine(); scenario.id = 'split-valley'; scenario.name = 'Split Valley'; scenario.maxTurns = 12; scenario.targetPeople = 74; scenario.targetSupplies = 10;
  scenario.trains = scenario.trains.map((train, i) => ({ ...train, position: i === 0 ? { x: 1, y: 5 } : i === 1 ? { x: 9, y: 5 } : { x: 3, y: 8 }, people: i === 0 ? 46 : i === 1 ? 28 : 0 }));
  scenario.hazards = [...scenario.hazards, hazard('south-slide', 6, 3, 8, 'landslide', 'obstruct-track')];
  return scenario;
}
export function scenarios(seed: number): Scenario[] { void seed; return [riverLine(), splitValley()]; }
