import type { Position } from './types';

export const BOARD_WIDTH = 13;
export const BOARD_HEIGHT = 9;
export const DIRECTIONS = ['N', 'E', 'S', 'W'] as const;
export type Direction = typeof DIRECTIONS[number];
export type Protocol = 'C' | 'P' | 'A' | 'G';
export type RouterKind = 'link' | 'bend' | 'split' | 'firewall';
export type RouterState = 'healthy' | 'jammed' | 'infected';
export type Phase = 'tutorial' | 'playing' | 'upgrade' | 'gameOver' | 'won';

export interface Router {
  id: string;
  kind: RouterKind;
  rotation: 0 | 1 | 2 | 3;
  state: RouterState;
  packetId: string | null;
}

export interface Packet {
  id: string;
  protocol: Protocol;
  sourceId: string;
  destinationId: string;
  position: Position | null;
  ageTicks: number;
  blockedTicks: number;
  priority: boolean;
  malware: boolean;
}

export interface SourceNode {
  id: string;
  protocol: Protocol;
  position: Position;
  queue: string[];
  queueLimit: number;
  nextSpawnTick: number;
}

export interface DestinationNode {
  id: string;
  protocol: Protocol;
  position: Position;
  cooldown: number;
}

export type Tile =
  | { kind: 'empty' }
  | { kind: 'blocked' }
  | { kind: 'source'; id: string }
  | { kind: 'destination'; id: string }
  | { kind: 'router'; router: Router };

export type Board = Tile[][];

export interface TickResult {
  delivered: Packet[];
  dropped: boolean;
  infected: Position | null;
  malwareBlocked: boolean;
  traceDelta: number;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
}

export interface GameState {
  seed: number;
  sector: number;
  tick: number;
  phase: Phase;
  board: Tile[][];
  sources: Record<string, SourceNode>;
  destinations: Record<string, DestinationNode>;
  packets: Record<string, Packet>;
  inventory: Record<RouterKind, number>;
  upgrades: string[];
  score: number;
  streak: number;
  trace: number;
  maxTrace: number;
  deliveredThisSector: number;
  quota: number;
  focusCharges: number;
  focusUntilTick: number;
  purgeCharges: number;
  cursor: Position;
  nextPacketId: number;
  lastEvent: string;
  eventTicks: number;
  tutorialStep: number;
}

function progressTutorial(state: GameState): void {
  if (state.sector === 1 && state.tutorialStep < 6) state.tutorialStep++;
}

export const UPGRADES: Upgrade[] = [
  { id: 'links', name: 'SPARE LINKS', description: '+3 Link routers next sector' },
  { id: 'split', name: 'JUNCTION KIT', description: '+1 Split router next sector' },
  { id: 'buffer', name: 'DEEP BUFFER', description: 'Queue limit +1; overflow costs +10 TRACE' },
  { id: 'focus', name: 'OPERATOR FOCUS', description: '+1 Focus charge every sector' },
  { id: 'clean', name: 'CLEAN ROOM', description: '+1 purge charge every sector' },
  { id: 'priority', name: 'PRIORITY LANE', description: 'Priority packets score +100' },
];

const PROTOCOLS: Protocol[] = ['C', 'P', 'A', 'G'];
const SOURCE_POSITIONS: Position[] = [
  { x: 0, y: 1 }, { x: 0, y: 7 }, { x: 12, y: 1 }, { x: 12, y: 8 },
];
const DEST_POSITIONS: Position[] = [
  { x: 12, y: 7 }, { x: 11, y: 0 }, { x: 6, y: 8 }, { x: 6, y: 0 },
];
const BLOCKS: Position[][] = [
  [],
  [],
  [{ x: 5, y: 3 }, { x: 7, y: 5 }],
  [{ x: 3, y: 3 }, { x: 6, y: 2 }, { x: 9, y: 5 }],
  [{ x: 2, y: 2 }, { x: 5, y: 4 }, { x: 7, y: 4 }, { x: 10, y: 6 }],
  [{ x: 2, y: 3 }, { x: 4, y: 5 }, { x: 6, y: 2 }, { x: 8, y: 6 }, { x: 10, y: 3 }],
  [{ x: 2, y: 2 }, { x: 4, y: 6 }, { x: 6, y: 3 }, { x: 8, y: 5 }, { x: 10, y: 2 }],
  [{ x: 2, y: 2 }, { x: 3, y: 6 }, { x: 5, y: 3 }, { x: 7, y: 5 }, { x: 9, y: 2 }, { x: 10, y: 6 }],
];

function clonePosition(p: Position): Position {
  return { x: p.x, y: p.y };
}

function createBoard(): Tile[][] {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => ({ kind: 'empty' as const }))
  );
}

function sectorCount(sector: number): number {
  return Math.min(4, 1 + Math.floor((sector - 1) / 2));
}

export function quotaForSector(sector: number): number {
  return 10 + sector * 6;
}

export function spawnIntervalForSector(sector: number): number {
  return Math.max(3, 7 - Math.floor(sector / 2));
}

function seededValue(seed: number, offset: number): number {
  let value = (seed ^ (offset * 0x9e3779b9)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 0x100000000;
}

export function createState(seed: number = Date.now(), sector: number = 1, upgrades: string[] = []): GameState {
  const board = createBoard();
  const sources: Record<string, SourceNode> = {};
  const destinations: Record<string, DestinationNode> = {};
  const count = sectorCount(sector);

  for (let i = 0; i < count; i++) {
    const sourceId = 'src-' + i;
    const destinationId = 'dst-' + i;
    const sourcePosition = SOURCE_POSITIONS[i];
    const destinationPosition = DEST_POSITIONS[i];
    const protocol = PROTOCOLS[i];
    sources[sourceId] = {
      id: sourceId, protocol, position: clonePosition(sourcePosition),
      queue: [], queueLimit: upgrades.includes('buffer') ? 7 : 6,
      nextSpawnTick: 5 + i * 2,
    };
    destinations[destinationId] = {
      id: destinationId, protocol, position: clonePosition(destinationPosition), cooldown: 0,
    };
    board[sourcePosition.y][sourcePosition.x] = { kind: 'source', id: sourceId };
    board[destinationPosition.y][destinationPosition.x] = { kind: 'destination', id: destinationId };
  }

  for (const position of BLOCKS[Math.min(sector - 1, BLOCKS.length - 1)]) {
    if (board[position.y][position.x].kind === 'empty') board[position.y][position.x] = { kind: 'blocked' };
  }

  const inventory: Record<RouterKind, number> = {
    link: 18 + sector,
    bend: 4 + Math.floor(sector / 2),
    split: sector >= 2 ? 1 + Math.floor(sector / 3) : 0,
    firewall: sector >= 4 ? 1 + Math.floor(sector / 4) : 0,
  };
  if (upgrades.includes('links')) inventory.link += 3;
  if (upgrades.includes('split')) inventory.split += 1;

  return {
    seed: seed >>> 0, sector, tick: 0, phase: sector === 1 ? 'tutorial' : 'playing',
    board, sources, destinations, packets: {}, inventory, upgrades: [...upgrades],
    score: 0, streak: 0, trace: 0, maxTrace: 0, deliveredThisSector: 0,
    quota: quotaForSector(sector), focusCharges: 2 + (upgrades.includes('focus') ? 1 : 0),
    focusUntilTick: 0, purgeCharges: 1 + (upgrades.includes('clean') ? 1 : 0),
    cursor: { x: Math.floor(BOARD_WIDTH / 2), y: Math.floor(BOARD_HEIGHT / 2) },
    nextPacketId: 1, lastEvent: 'PLACE A LINK TO START THE FLOW', eventTicks: 30, tutorialStep: 0,
  };
}

export function getPorts(tile: Tile): Direction[] {
  if (tile.kind === 'blocked' || tile.kind === 'empty') return [];
  if (tile.kind === 'source' || tile.kind === 'destination') return [...DIRECTIONS];
  if (tile.router.state !== 'healthy') return [];
  if (tile.router.kind === 'firewall') return [...DIRECTIONS];
  if (tile.router.kind === 'link') return tile.router.rotation % 2 === 0 ? ['E', 'W'] as Direction[] : ['N', 'S'] as Direction[];
  if (tile.router.kind === 'bend') {
    return ([
      ['N', 'E'], ['E', 'S'], ['S', 'W'], ['W', 'N'],
    ] as Direction[][])[tile.router.rotation];
  }
  return ([
    ['N', 'E', 'S'], ['E', 'S', 'W'], ['S', 'W', 'N'], ['W', 'N', 'E'],
  ] as Direction[][])[tile.router.rotation];
}

function opposite(direction: Direction): Direction {
  return ({ N: 'S', E: 'W', S: 'N', W: 'E' })[direction] as Direction;
}

export function neighbour(position: Position, direction: Direction): Position | null {
  const next = clonePosition(position);
  if (direction === 'N') next.y--;
  if (direction === 'E') next.x++;
  if (direction === 'S') next.y++;
  if (direction === 'W') next.x--;
  return next.x < 0 || next.x >= BOARD_WIDTH || next.y < 0 || next.y >= BOARD_HEIGHT ? null : next;
}

export function connectedNeighbours(board: Tile[][], position: Position): Position[] {
  const ports = getPorts(board[position.y][position.x]);
  const result: Position[] = [];
  for (const direction of ports) {
    const next = neighbour(position, direction);
    if (!next) continue;
    const nextPorts = getPorts(board[next.y][next.x]);
    if (nextPorts.includes(opposite(direction))) result.push(next);
  }
  return result;
}

export function canPlaceRouter(state: GameState, position: Position, kind: RouterKind): boolean {
  return position.x >= 0 && position.x < BOARD_WIDTH && position.y >= 0 && position.y < BOARD_HEIGHT
    && state.board[position.y][position.x].kind === 'empty'
    && state.inventory[kind] > 0;
}

export function placeRouter(state: GameState, position: Position, kind: RouterKind, rotation: 0 | 1 | 2 | 3 = 0): boolean {
  if (!canPlaceRouter(state, position, kind)) return false;
  const id = 'r-' + state.tick + '-' + position.x + '-' + position.y;
  state.board[position.y][position.x] = {
    kind: 'router',
    router: { id, kind, rotation, state: 'healthy', packetId: null },
  };
  state.inventory[kind]--;
  state.lastEvent = kind.toUpperCase() + ' PLACED';
  state.eventTicks = 14;
  progressTutorial(state);
  if (state.phase === 'tutorial' && state.tutorialStep >= 2) state.phase = 'playing';
  return true;
}

export function rotateRouter(state: GameState, position: Position): boolean {
  const tile = state.board[position.y]?.[position.x];
  if (!tile || tile.kind !== 'router' || tile.router.packetId) return false;
  tile.router.rotation = ((tile.router.rotation + 1) % 4) as 0 | 1 | 2 | 3;
  state.lastEvent = 'ROUTER ROTATED';
  state.eventTicks = 10;
  progressTutorial(state);
  if (state.phase === 'tutorial' && state.tutorialStep >= 2) state.phase = 'playing';
  return true;
}

export function salvageRouter(state: GameState, position: Position): boolean {
  const tile = state.board[position.y]?.[position.x];
  if (!tile || tile.kind !== 'router' || tile.router.packetId) return false;
  state.inventory[tile.router.kind]++;
  state.board[position.y][position.x] = { kind: 'empty' };
  state.lastEvent = 'ROUTER SALVAGED';
  state.eventTicks = 10;
  progressTutorial(state);
  return true;
}

function pathTo(state: GameState, from: Position, destination: Position): Position[] | null {
  const queue: Position[] = [clonePosition(from)];
  const cameFrom = new Map<string, Position | null>();
  const key = (p: Position) => p.x + ',' + p.y;
  cameFrom.set(key(from), null);

  while (queue.length) {
    const current = queue.shift()!;
    if (current.x === destination.x && current.y === destination.y) break;
    for (const next of connectedNeighbours(state.board, current)) {
      const nextKey = key(next);
      if (!cameFrom.has(nextKey)) {
        cameFrom.set(nextKey, current);
        queue.push(next);
      }
    }
  }
  const destinationKey = key(destination);
  if (!cameFrom.has(destinationKey)) return null;
  const path: Position[] = [];
  let current: Position | null = destination;
  while (current) {
    path.unshift(current);
    current = cameFrom.get(key(current)) || null;
  }
  return path;
}

function addTrace(state: GameState, amount: number, message: string): number {
  const before = state.trace;
  state.trace = Math.min(100, state.trace + amount);
  state.maxTrace = Math.max(state.maxTrace, state.trace);
  state.lastEvent = message;
  state.eventTicks = 18;
  return state.trace - before;
}

function spawnPacket(state: GameState, source: SourceNode): void {
  const destinations = Object.values(state.destinations).filter(d => d.protocol === source.protocol);
  const target = destinations[Math.floor(seededValue(state.seed, state.tick + source.id.length) * destinations.length)] || destinations[0];
  if (!target) return;
  const priority = state.sector >= 3 && seededValue(state.seed, state.tick + source.position.x + 77) > 0.78;
  const packet: Packet = {
    id: 'p-' + state.nextPacketId++, protocol: source.protocol, sourceId: source.id,
    destinationId: target.id, position: null, ageTicks: 0, blockedTicks: 0,
    priority, malware: false,
  };
  source.queue.push(packet.id);
  state.packets[packet.id] = packet;
}

function maybeSpawnMalware(state: GameState): Position | null {
  if (state.sector < 4 || state.tick < 30 || state.tick % 90 !== 0) return null;
  const candidates: Position[] = [];
  for (let y = 0; y < BOARD_HEIGHT; y++) for (let x = 0; x < BOARD_WIDTH; x++) {
    const tile = state.board[y][x];
    if (tile.kind === 'router' && tile.router.state === 'healthy' && !tile.router.packetId) candidates.push({ x, y });
  }
  if (!candidates.length) return null;
  const target = candidates[Math.floor(seededValue(state.seed, state.tick + 91) * candidates.length)];
  const tile = state.board[target.y][target.x];
  if (tile.kind !== 'router') return null;
  tile.router.state = 'infected';
  return target;
}

function releaseProposal(state: GameState, source: SourceNode, packet: Packet): Position | null {
  const destination = state.destinations[packet.destinationId];
  if (!destination) return null;
  const path = pathTo(state, source.position, destination.position);
  if (!path || path.length < 2) return null;
  const target = path[1];
  const targetTile = state.board[target.y][target.x];
  if (targetTile.kind === 'router' && targetTile.router.packetId) return null;
  if (targetTile.kind === 'destination') return target;
  return targetTile.kind === 'router' && targetTile.router.state === 'healthy' ? target : null;
}

interface Proposal {
  packet: Packet;
  source: SourceNode | null;
  from: Position | null;
  target: Position;
}

function packetProposal(state: GameState, packet: Packet): Proposal | null {
  if (!packet.position) return null;
  const destination = state.destinations[packet.destinationId];
  if (!destination) return null;
  const path = pathTo(state, packet.position, destination.position);
  if (!path || path.length < 2) return null;
  const target = path[1];
  const tile = state.board[target.y][target.x];
  if (tile.kind === 'router' && tile.router.state === 'healthy' && !tile.router.packetId) {
    return { packet, source: null, from: packet.position, target };
  }
  if (tile.kind === 'destination') return { packet, source: null, from: packet.position, target };
  return null;
}

function proposalPriority(proposal: Proposal): number {
  return proposal.packet.ageTicks * 1000 - Number(proposal.packet.id.slice(2));
}

export function advance(state: GameState): TickResult {
  const result: TickResult = { delivered: [], dropped: false, infected: null, malwareBlocked: false, traceDelta: 0 };
  if (state.phase !== 'playing') return result;

  state.tick++;
  if (state.eventTicks > 0) state.eventTicks--;
  for (const source of Object.values(state.sources)) {
    if (state.tick >= source.nextSpawnTick) {
      const spawnCount = state.tick % 70 >= 45 && state.sector >= 2 ? 2 : 1;
      for (let i = 0; i < spawnCount; i++) spawnPacket(state, source);
      source.nextSpawnTick = state.tick + spawnIntervalForSector(state.sector);
    }
  }

  for (const packet of Object.values(state.packets)) {
    packet.ageTicks++;
    if (packet.position) packet.blockedTicks++;
  }

  const proposals: Proposal[] = [];
  for (const source of Object.values(state.sources)) {
    const packet = state.packets[source.queue[0]];
    if (packet) {
      const target = releaseProposal(state, source, packet);
      if (target) proposals.push({ packet, source, from: null, target });
    }
  }
  for (const packet of Object.values(state.packets)) {
    if (packet.position) {
      const proposal = packetProposal(state, packet);
      if (proposal) proposals.push(proposal);
    }
  }

  const byTarget: Record<string, Proposal[]> = {};
  for (const proposal of proposals) {
    const key = proposal.target.x + ',' + proposal.target.y;
    (byTarget[key] ||= []).push(proposal);
  }

  for (const candidates of Object.values(byTarget)) {
    candidates.sort((a, b) => proposalPriority(b) - proposalPriority(a));
    const winner = candidates[0];
    const targetTile = state.board[winner.target.y][winner.target.x];
    if (targetTile.kind === 'router' && targetTile.router.packetId) continue;
    if (winner.source) winner.source.queue.shift();
    if (winner.from) {
      const oldTile = state.board[winner.from.y][winner.from.x];
      if (oldTile.kind === 'router') oldTile.router.packetId = null;
    }
    if (targetTile.kind === 'destination') {
      const packet = winner.packet;
      delete state.packets[packet.id];
      result.delivered.push(packet);
      state.deliveredThisSector++;
      const multiplier = 1 + Math.min(1, Math.floor(state.streak / 10) * 0.25);
      state.score += Math.floor((packet.priority ? 250 : 100) * multiplier) + (state.upgrades.includes('priority') && packet.priority ? 100 : 0);
      state.streak++;
      state.trace = Math.max(0, state.trace - (state.streak % 10 === 0 ? 4 : 0));
      state.lastEvent = packet.priority ? 'PRIORITY DELIVERED' : 'PACKET DELIVERED';
      state.eventTicks = 12;
    } else if (targetTile.kind === 'router') {
      targetTile.router.packetId = winner.packet.id;
      winner.packet.position = clonePosition(winner.target);
      winner.packet.blockedTicks = 0;
    }
  }

  for (const source of Object.values(state.sources)) {
    const overflow = source.queue.length - source.queueLimit;
    if (overflow > 0) {
      for (let i = 0; i < overflow; i++) {
        const packetId = source.queue.shift();
        if (packetId) delete state.packets[packetId];
      }
      result.dropped = true;
      result.traceDelta += addTrace(state, overflow * 8, 'QUEUE OVERFLOW');
      state.streak = 0;
    }
  }

  for (const packet of Object.values(state.packets)) {
    if (packet.blockedTicks >= 48 && packet.blockedTicks % 16 === 0) {
      result.traceDelta += addTrace(state, 3, 'PACKET STALLED');
      state.streak = 0;
    }
  }

  if (state.sector >= 4 && state.tick % 90 === 0) {
    result.infected = maybeSpawnMalware(state);
    if (result.infected) result.traceDelta += addTrace(state, 12, 'MALWARE DETECTED');
  }

  if (state.trace >= 100) {
    state.phase = 'gameOver';
    state.lastEvent = 'NETWORK BREACHED';
    state.eventTicks = 40;
  } else if (state.deliveredThisSector >= state.quota) {
    if (state.sector >= 8) state.phase = 'won';
    else state.phase = 'upgrade';
    state.lastEvent = state.phase === 'won' ? 'SHIFT COMPLETE' : 'SECTOR CLEAR — CHOOSE UPGRADE';
    state.eventTicks = 40;
  }
  if (result.delivered.length) progressTutorial(state);
  return result;
}

export function moveCursor(state: GameState, dx: number, dy: number): void {
  state.cursor.x = Math.max(0, Math.min(BOARD_WIDTH - 1, state.cursor.x + dx));
  state.cursor.y = Math.max(0, Math.min(BOARD_HEIGHT - 1, state.cursor.y + dy));
}

export function upgradeChoices(state: GameState): Upgrade[] {
  const start = Math.floor(seededValue(state.seed, state.sector * 17) * UPGRADES.length);
  return [0, 1, 2].map(i => UPGRADES[(start + i) % UPGRADES.length]);
}

export function chooseUpgrade(state: GameState, upgrade: Upgrade): GameState {
  const upgrades = state.upgrades.includes(upgrade.id) ? state.upgrades : [...state.upgrades, upgrade.id];
  const next = createState(state.seed + state.sector * 101, state.sector + 1, upgrades);
  next.score = state.score;
  next.maxTrace = state.maxTrace;
  next.lastEvent = upgrade.name + ' INSTALLED';
  next.eventTicks = 24;
  return next;
}

export function purge(state: GameState, position: Position): boolean {
  if (state.purgeCharges <= 0) return false;
  const tile = state.board[position.y]?.[position.x];
  if (!tile || tile.kind !== 'router' || tile.router.state !== 'infected') return false;
  tile.router.state = 'healthy';
  state.purgeCharges--;
  state.lastEvent = 'ROUTER PURGED';
  state.eventTicks = 18;
  progressTutorial(state);
  return true;
}
