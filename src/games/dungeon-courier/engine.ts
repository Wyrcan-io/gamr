import { ITEMS, PARCELS, SEAL_LABELS, UPGRADES } from './content';
import { createRng, mixSeed } from './seed';
import type { ActionEvaluation, Command, CommandResult, ContractOffer, DeliveryReport, Direction, FloorState, GameState, ItemId, ItemState, ParcelId, ParcelState, Point, SealId, TileState, ThreatState, UpgradeId } from './types';

const WIDTH = 46;
const HEIGHT = 15;
const DELTAS: Record<Direction, Point> = { N: { x: 0, y: -1 }, E: { x: 1, y: 0 }, S: { x: 0, y: 1 }, W: { x: -1, y: 0 } };
const DIRECTIONS: Direction[] = ['N', 'E', 'S', 'W'];
const PARCEL_ORDER: ParcelId[] = ['porcelain-choir', 'moonwater-ampoule', 'sleeping-bell', 'sunless-film', 'folded-familiar', 'memory-mirror', 'hearthseed-casket', 'compass-needle'];
const pointKey = (point: Point): string => `${point.x},${point.y}`;
const samePoint = (a: Point, b: Point): boolean => a.x === b.x && a.y === b.y;
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

function clone<T>(value: T): T {
  return structuredClone(value);
}

function addEvent(state: GameState, text: string): void {
  state.notice = text;
  state.eventLog = [text, ...state.eventLog].slice(0, 5);
}

function blankTile(kind: TileState['kind'] = 'wall'): TileState {
  return { kind, discovered: true };
}

function carve(tiles: TileState[][], x: number, y: number, kind: TileState['kind'] = 'floor'): void {
  if (tiles[y]?.[x]) tiles[y][x] = blankTile(kind);
}

function makeFloor(seed: number, parcelId: ParcelId): FloorState {
  const rng = createRng(mixSeed(seed, parcelId.length * 97));
  const tiles = Array.from({ length: HEIGHT }, () => Array.from({ length: WIDTH }, () => blankTile()));
  for (const y of [2, 7, 12]) for (let x = 1; x < WIDTH - 1; x++) carve(tiles, x, y);
  for (const x of [5, 15, 25, 35]) for (let y = 2; y <= 12; y++) carve(tiles, x, y);
  for (let x = 8; x <= 12; x++) carve(tiles, x, 4);
  for (let y = 4; y <= 7; y++) carve(tiles, 12, y);
  for (let x = 27; x <= 31; x++) carve(tiles, x, 10);
  for (let y = 10; y <= 12; y++) carve(tiles, 31, y);

  for (let x = 8; x <= 14; x++) tiles[2][x].kind = 'rough';
  for (let x = 17; x <= 23; x++) tiles[7][x].kind = 'wet';
  for (let y = 8; y <= 11; y++) tiles[y][25].kind = 'weak';
  for (let y = 3; y <= 5; y++) tiles[y][35].kind = 'narrow';
  tiles[7][25] = { kind: 'dynamic', dynamicId: 'gate', discovered: true };

  const start = { x: 2, y: 2 };
  const recipient = { x: WIDTH - 3, y: 12 };
  tiles[start.y][start.x].kind = 'anchor';
  tiles[7][5].kind = 'anchor';
  tiles[12][25].kind = 'anchor';
  tiles[2][15].kind = 'bench';
  tiles[7][15] = { kind: 'cache', itemId: rng() > 0.5 ? 'chalk' : 'padding', discovered: true };
  tiles[12][35] = { kind: 'niche', discovered: true };
  tiles[recipient.y][recipient.x].kind = 'recipient';

  const patrolRoute: Point[] = [];
  for (let x = 9; x <= 18; x++) patrolRoute.push({ x, y: 7 });
  for (let x = 17; x >= 9; x--) patrolRoute.push({ x, y: 7 });
  const threats: ThreatState[] = [{ id: 'porter-1', kind: 'porter', pos: { ...patrolRoute[0] }, route: patrolRoute, routeIndex: 0, disabledTicks: 0 }];
  if (rng() > 0.35) {
    const watcherRoute = [{ x: 35, y: 2 }, { x: 35, y: 3 }, { x: 35, y: 4 }, { x: 35, y: 5 }, { x: 35, y: 4 }, { x: 35, y: 3 }];
    threats.push({ id: 'watcher-1', kind: 'watcher', pos: { ...watcherRoute[0] }, route: watcherRoute, routeIndex: 0, disabledTicks: 0 });
  }
  return { width: WIDTH, height: HEIGHT, tiles, start, recipient, threats, gateOpen: true, shiftIn: 6, shiftCount: 0, tick: 0, dropped: [] };
}

function initialItems(tutorial: boolean): Array<ItemState | null> {
  return tutorial
    ? [{ id: 'padding', quantity: 1 }, { id: 'rope', quantity: 1 }, { id: 'coin', quantity: 1 }, null]
    : [{ id: 'padding', quantity: 1 }, { id: 'chalk', quantity: 1 }, { id: 'rope', quantity: 1 }, { id: 'coin', quantity: 1 }];
}

function initialState(seed: number, mode: GameState['mode']): GameState {
  const tutorial = mode === 'tutorial';
  return {
    version: 1, seed: seed >>> 0, mode, phase: 'start', deliveryIndex: 0, contractOffers: [], selectedOffer: 0, contract: null, floor: null,
    courier: { pos: { x: 2, y: 2 }, previousPos: { x: 2, y: 2 }, inventory: initialItems(tutorial), selectedSlot: 0 },
    score: 0, pay: 0, upgrades: [], surveyMode: 'none', helpOpen: false, notice: 'THE UNDERWAY POST IS WAITING.', eventLog: [], lastReport: null, reports: [], outcome: null,
    floorFlags: { webbingUsed: false, handcartUsed: false, benchUsed: false, soleReady: true, claimUsed: false },
  };
}

function makeOffers(state: GameState): ContractOffer[] {
  if (state.mode === 'tutorial') return [{ parcelId: 'porcelain-choir', seal: 'none', pay: 120, deadline: 65, knownFeature: 'rough east hall' }];
  const rng = createRng(mixSeed(state.seed, state.deliveryIndex * 7919 + 31));
  const offset = Math.floor(rng() * PARCEL_ORDER.length);
  const ids = [0, 1, 2].map(i => PARCEL_ORDER[(offset + i * 2) % PARCEL_ORDER.length]);
  const seals: SealId[] = state.deliveryIndex === 0 ? ['none', 'none', 'rush'] : ['top-heavy', 'quiet-claim', 'uninsured'];
  return ids.map((parcelId, i) => {
    const seal = seals[i];
    return { parcelId, seal, pay: 140 + state.deliveryIndex * 55 + i * 35 + (seal === 'uninsured' ? 80 : 0), deadline: (seal === 'rush' ? 45 : 58) - state.deliveryIndex * 2 + i * 2, knownFeature: i === 0 ? 'stable cloister' : i === 1 ? 'rotating bridge' : 'sacrifice niche' };
  });
}

function startRun(mode: GameState['mode'], seed: number): GameState {
  const next = initialState(seed, mode);
  next.phase = 'contract';
  next.contractOffers = makeOffers(next);
  next.notice = 'CHOOSE A CONTRACT. THE LABEL IS THE RULEBOOK.';
  return next;
}

export function createState(seed = Date.now()): GameState {
  return initialState(seed, 'standard');
}

function parcelFromOffer(offer: ContractOffer): ParcelState {
  const definition = PARCELS[offer.parcelId];
  return { id: offer.parcelId, seal: offer.seal, condition: definition.condition, maxCondition: definition.condition, stress: 0, tolerance: definition.tolerance, guard: 0, size: definition.size, meter: 0, directionHistory: [], visited: [] };
}

function beginContract(state: GameState, offer: ContractOffer): void {
  const parcel = parcelFromOffer(offer);
  const floor = makeFloor(mixSeed(state.seed, state.deliveryIndex + 401), offer.parcelId);
  parcel.visited = [pointKey(floor.start)];
  state.contract = { parcel, pay: offer.pay, deadline: offer.deadline, parTicks: Math.max(30, offer.deadline - 10), hardExpiry: offer.seal === 'rush', violations: [] };
  state.floor = floor;
  state.courier.pos = { ...floor.start };
  state.courier.previousPos = { ...floor.start };
  state.courier.selectedSlot = 0;
  state.surveyMode = 'none';
  state.helpOpen = false;
  state.floorFlags = { webbingUsed: false, handcartUsed: false, benchUsed: false, soleReady: true, claimUsed: false };
  state.phase = 'briefing';
  state.notice = `${PARCELS[offer.parcelId].label}: ${PARCELS[offer.parcelId].rule}.`;
  addEvent(state, `DELIVERY ${state.deliveryIndex + 1}: ${PARCELS[offer.parcelId].label}.`);
}

function tileAt(floor: FloorState, point: Point): TileState | undefined {
  return floor.tiles[point.y]?.[point.x];
}

function inBounds(floor: FloorState, point: Point): boolean {
  return point.x >= 0 && point.y >= 0 && point.x < floor.width && point.y < floor.height;
}

function isWalkable(floor: FloorState, point: Point): boolean {
  if (!inBounds(floor, point)) return false;
  const tile = tileAt(floor, point);
  if (!tile || tile.kind === 'wall') return false;
  if (tile.kind === 'dynamic' && tile.dynamicId === 'gate' && !floor.gateOpen) return false;
  if (tile.kind === 'weak' && floor.tiles[point.y][point.x].dynamicId === 'collapsed') return false;
  return true;
}

function inventoryHas(state: GameState, id: ItemId): number {
  return state.courier.inventory.find(item => item?.id === id)?.quantity ?? 0;
}

function consumeItem(state: GameState, id: ItemId): boolean {
  const item = state.courier.inventory.find(entry => entry?.id === id);
  if (!item || item.quantity <= 0) return false;
  item.quantity--;
  if (item.quantity === 0) {
    const index = state.courier.inventory.indexOf(item);
    state.courier.inventory[index] = null;
  }
  return true;
}

function tileStress(tile: TileState | undefined): number {
  if (!tile) return 5;
  if (tile.kind === 'rough') return 1;
  if (tile.kind === 'wet') return 1;
  if (tile.kind === 'weak') return 2;
  return 0;
}

function tileNoise(tile: TileState | undefined): number {
  return tile?.kind === 'rough' || tile?.kind === 'wet' || tile?.kind === 'weak' ? 1 : 0;
}

function directionFromDelta(dx: number, dy: number): Direction {
  if (dx > 0) return 'E';
  if (dx < 0) return 'W';
  if (dy > 0) return 'S';
  return 'N';
}

function projectedCondition(state: GameState, stressDelta: number): number {
  const parcel = state.contract!.parcel;
  let stress = parcel.stress + stressDelta;
  let condition = parcel.condition;
  while (stress > parcel.tolerance) { condition--; stress -= parcel.tolerance + 1; }
  return condition;
}

export function evaluateMove(state: GameState, direction: Direction, hurried = false): ActionEvaluation {
  const floor = state.floor;
  const contract = state.contract;
  if (!floor || !contract || state.phase !== 'traversal') return { legal: false, label: hurried ? 'HURRY' : 'STEP', timeCost: 0, stressDelta: 0, meterDelta: 0, noise: 0, conditionRisk: 0, reason: 'TRAVERSAL IS NOT ACTIVE.' };
  const delta = DELTAS[direction];
  const first = { x: state.courier.pos.x + delta.x, y: state.courier.pos.y + delta.y };
  const target = hurried ? { x: first.x + delta.x, y: first.y + delta.y } : first;
  const tile = tileAt(floor, target);
  const firstTile = tileAt(floor, first);
  const base: ActionEvaluation = { legal: true, label: hurried ? 'HURRY' : 'STEP', target, timeCost: 1, stressDelta: tileStress(tile) + (hurried ? 1 : 0), meterDelta: 0, noise: hurried ? 2 : tileNoise(tile), conditionRisk: 0, reason: 'CLEAR.' };
  if (!isWalkable(floor, first) || (hurried && !isWalkable(floor, target))) return { ...base, legal: false, reason: 'WALL, CLOSED GATE, OR DUNGEON EDGE.' };
  if (hurried && contract.parcel.id === 'folded-familiar') return { ...base, legal: false, reason: 'FOLDED FAMILIAR CANNOT BE HURRIED.' };
  if (contract.parcel.size === 'oversized' && tile?.kind === 'narrow' && inventoryHas(state, 'strap') === 0) return { ...base, legal: false, reason: 'OVERSIZED PARCEL NEEDS A COMPRESSION STRAP.' };
  if (hurried && (firstTile?.kind === 'narrow' || tile?.kind === 'narrow')) return { ...base, legal: false, reason: 'HURRY CANNOT FIT THE NARROW PASSAGE.' };

  const parcel = contract.parcel;
  const lastDirection = parcel.directionHistory[parcel.directionHistory.length - 1];
  if (parcel.id === 'porcelain-choir' && base.stressDelta >= 2) base.stressDelta++;
  if (parcel.id === 'moonwater-ampoule') {
    if (lastDirection && lastDirection !== direction) { base.stressDelta++; base.meterDelta = 1; }
    else if (lastDirection === direction) base.meterDelta = -1;
  }
  if (parcel.id === 'sleeping-bell') {
    base.meterDelta = base.noise;
    if (parcel.meter + base.meterDelta >= 3) base.stressDelta += 2;
  }
  if (parcel.id === 'sunless-film' && tile?.kind !== 'wet' && tile?.kind !== 'anchor') {
    base.meterDelta = 1;
    if (parcel.meter >= 2) base.stressDelta += 1;
  }
  if (parcel.id === 'memory-mirror' && parcel.visited.includes(pointKey(target))) base.stressDelta += 2;
  if (parcel.id === 'hearthseed-casket') {
    base.meterDelta = tile?.kind === 'wet' ? -2 : 0;
    if (parcel.meter >= 4) base.stressDelta++;
  }
  if (parcel.id === 'compass-needle') base.meterDelta = direction === 'S' ? 1 : direction === 'N' ? -1 : 0;
  if (contract.parcel.seal === 'top-heavy' && lastDirection && lastDirection !== direction && parcel.stress > 0) base.stressDelta++;
  if (state.upgrades.includes('handcart') && parcel.size === 'oversized' && !state.floorFlags.handcartUsed && base.stressDelta > 0) base.stressDelta--;
  if (state.upgrades.includes('webbing') && !state.floorFlags.webbingUsed && base.stressDelta > 0) base.stressDelta--;
  if (state.upgrades.includes('sole') && hurried && state.floorFlags.soleReady) base.noise = 0;
  base.conditionRisk = Math.max(0, contract.parcel.condition - projectedCondition(state, Math.max(0, base.stressDelta - Math.min(contract.parcel.guard, base.stressDelta))));
  if (base.conditionRisk > 0) base.reason = `DAMAGE LIKELY: ${base.conditionRisk} condition.`;
  else if (base.stressDelta > 0) base.reason = `STRAIN +${base.stressDelta}${base.noise ? ` / NOISE ${base.noise}` : ''}.`;
  return base;
}

function applyStress(state: GameState, amount: number, source: string): string[] {
  const parcel = state.contract!.parcel;
  let remaining = Math.max(0, amount);
  if (parcel.guard > 0 && remaining > 0) {
    const absorbed = Math.min(parcel.guard, remaining);
    parcel.guard -= absorbed;
    remaining -= absorbed;
  }
  if (state.upgrades.includes('webbing') && !state.floorFlags.webbingUsed && remaining > 0) {
    state.floorFlags.webbingUsed = true;
    remaining--;
    addEvent(state, 'SHOCK WEBBING ABSORBED THE FIRST STRAIN.');
  }
  parcel.stress += remaining;
  const events: string[] = [];
  while (parcel.stress > parcel.tolerance) {
    if (state.floorFlags.claimUsed) {
      state.floorFlags.claimUsed = false;
      parcel.stress -= parcel.tolerance + 1;
      events.push('INSURANCE SEAL CAUGHT ONE BREAK.');
      continue;
    }
    parcel.condition--;
    parcel.stress -= parcel.tolerance + 1;
    events.push(`CRACK −1: ${source}.`);
  }
  if (events.length) events.forEach(event => addEvent(state, event));
  return events;
}

function updateParcelAfterMove(state: GameState, direction: Direction, target: Point, tile: TileState, hurried: boolean): string[] {
  const parcel = state.contract!.parcel;
  const events: string[] = [];
  const last = parcel.directionHistory[parcel.directionHistory.length - 1];
  parcel.directionHistory.push(direction);
  parcel.directionHistory = parcel.directionHistory.slice(-3);
  parcel.visited.push(pointKey(target));
  parcel.visited = parcel.visited.slice(-6);
  if (tile.kind === 'anchor') {
    parcel.visited = [pointKey(target)];
    if (parcel.id === 'memory-mirror') { parcel.meter = 0; events.push('ANCHOR CLEARED THE MIRROR MEMORY.'); }
  }
  if (parcel.id === 'moonwater-ampoule') {
    if (last === direction) parcel.meter = clamp(parcel.meter - 1, 0, 3);
    else if (last) parcel.meter = clamp(parcel.meter + 1, 0, 3);
    if (parcel.meter >= 3) { events.push('MOONWATER SLOSHED.'); applyStress(state, 1, 'moonwater slosh'); parcel.meter = 0; }
  }
  if (parcel.id === 'sleeping-bell') {
    const noise = hurried ? 2 : tileNoise(tile);
    parcel.meter = clamp(parcel.meter + noise, 0, 3);
    if (parcel.meter >= 3) { events.push('THE SLEEPING BELL WOKE.'); applyStress(state, 2, 'sleeping bell'); parcel.meter = 0; }
  }
  if (parcel.id === 'sunless-film' && tile.kind !== 'wet' && tile.kind !== 'anchor') {
    parcel.meter++;
    if (parcel.meter >= 3) { events.push('LIGHT REACHED THE FILM.'); parcel.condition--; parcel.meter = 0; }
  } else if (parcel.id === 'sunless-film') parcel.meter = clamp(parcel.meter - 1, 0, 3);
  if (parcel.id === 'memory-mirror' && parcel.visited.slice(0, -1).includes(pointKey(target))) applyStress(state, 2, 'memory mirror retrace');
  if (parcel.id === 'hearthseed-casket') {
    if (tile.kind === 'wet') parcel.meter = clamp(parcel.meter - 2, 0, 5);
    else if (parcel.meter >= 4) applyStress(state, 1, 'hearthseed heat');
  }
  if (parcel.id === 'compass-needle') {
    if (direction === 'S') parcel.meter = clamp(parcel.meter + 1, 0, 4);
    if (direction === 'N') parcel.meter = clamp(parcel.meter - 1, 0, 4);
    if (parcel.meter >= 3 && direction === 'S') {
      const north = { x: target.x, y: target.y - 1 };
      if (state.floor && isWalkable(state.floor, north)) { state.courier.pos = north; applyStress(state, 1, 'compass pull'); events.push('THE COMPASS PULLED NORTH.'); }
    }
  }
  if (parcel.id === 'folded-familiar' && tile.kind === 'weak' && state.floor) {
    const leaving = state.floor.tiles[state.courier.previousPos.y]?.[state.courier.previousPos.x];
    if (leaving?.kind === 'weak') { leaving.dynamicId = 'collapsed'; events.push('WEAK FLOOR COLLAPSED BEHIND THE FAMILIAR.'); }
  }
  return events;
}

function moveThreats(state: GameState): void {
  const floor = state.floor!;
  for (const threat of floor.threats) {
    if (threat.disabledTicks > 0) { threat.disabledTicks--; continue; }
    threat.routeIndex = (threat.routeIndex + 1) % threat.route.length;
    threat.pos = { ...threat.route[threat.routeIndex] };
    if (samePoint(threat.pos, state.courier.pos)) {
      const safe = isWalkable(floor, state.courier.previousPos) ? state.courier.previousPos : floor.start;
      state.courier.pos = { ...safe };
      applyStress(state, threat.kind === 'watcher' ? 1 : 2, `${threat.kind} contact`);
      addEvent(state, `${threat.kind.toUpperCase()} CONTACT — COURIER PUSHED BACK.`);
      if (state.contract!.parcel.seal === 'quiet-claim') applyStress(state, 1, 'quiet claim contact');
    }
  }
}

function advanceTicks(state: GameState, count: number): string[] {
  const floor = state.floor!;
  const events: string[] = [];
  for (let i = 0; i < count; i++) {
    floor.tick++;
    state.contract!.deadline--;
    moveThreats(state);
    floor.shiftIn--;
    if (floor.shiftIn <= 0) {
      floor.shiftIn = 6;
      floor.gateOpen = !floor.gateOpen;
      floor.shiftCount++;
      events.push(floor.gateOpen ? 'SHIFT: THE EAST GATE OPENED.' : 'SHIFT: THE EAST GATE CLOSED.');
      addEvent(state, events[events.length - 1]);
    }
    if (state.contract!.deadline <= 0) {
      state.phase = 'gameOver'; state.outcome = 'lost';
      events.push('DEADLINE EXPIRED — THE RECIPIENT IS GONE.'); addEvent(state, events[events.length - 1]);
      break;
    }
  }
  return events;
}

function doMove(state: GameState, direction: Direction, hurried: boolean): string[] {
  const evaluation = evaluateMove(state, direction, hurried);
  if (!evaluation.legal || !evaluation.target) { addEvent(state, `MOVE REFUSED — ${evaluation.reason}`); return []; }
  const floor = state.floor!;
  const contract = state.contract!;
  const target = evaluation.target;
  const tile = tileAt(floor, target)!;
  state.courier.previousPos = { ...state.courier.pos };
  state.courier.pos = { ...target };
  const events: string[] = [];
  const guardSpent = Math.min(contract.parcel.guard, evaluation.stressDelta);
  if (guardSpent) contract.parcel.guard -= guardSpent;
  let stress = Math.max(0, evaluation.stressDelta - guardSpent);
  if (state.upgrades.includes('handcart') && contract.parcel.size === 'oversized' && !state.floorFlags.handcartUsed && stress > 0) { state.floorFlags.handcartUsed = true; stress--; }
  if (state.upgrades.includes('sole') && hurried && state.floorFlags.soleReady) state.floorFlags.soleReady = false;
  if (contract.parcel.seal === 'rush' && state.floor!.tick > contract.parTicks) contract.violations.push('RUSH PAR — route took longer than promised.');
  if (stress > 0) events.push(...applyStress(state, stress, tile.kind === 'rough' ? 'rough floor' : tile.kind === 'wet' ? 'wet floor' : tile.kind === 'weak' ? 'weak floor' : 'hard turn'));
  events.push(...updateParcelAfterMove(state, direction, target, tile, hurried));
  if (tile.kind === 'cache' && tile.itemId) { const itemId = tile.itemId; const empty = state.courier.inventory.findIndex(item => item === null); if (empty >= 0) { state.courier.inventory[empty] = { id: itemId, quantity: 1 }; tile.itemId = undefined; events.push(`CACHE: FOUND ${ITEMS[itemId].label}.`); } else events.push('CACHE: SATCHEL FULL.'); }
  events.push(...advanceTicks(state, evaluation.timeCost));
  if (evaluation.noise > 0 && contract.parcel.id === 'sleeping-bell' && !contract.violations.includes('Noise event recorded.')) contract.violations.push('Noise event recorded.');
  if (contract.parcel.condition <= 0 && !state.outcome) { state.phase = 'gameOver'; state.outcome = 'lost'; addEvent(state, 'PARCEL BROKEN — CLAIM FILED.'); events.push('PARCEL BROKEN — CLAIM FILED.'); }
  return events;
}

function doBrace(state: GameState): string[] {
  const parcel = state.contract!.parcel;
  parcel.guard = Math.min(3, parcel.guard + (parcel.id === 'porcelain-choir' ? 2 : 1));
  parcel.stress = Math.max(0, parcel.stress - 2);
  if (parcel.id === 'hearthseed-casket') parcel.meter = clamp(parcel.meter + 1, 0, 5);
  const events = advanceTicks(state, 1);
  addEvent(state, `BRACED — GUARD ${parcel.guard}.`);
  return events;
}

function doWait(state: GameState): string[] {
  if (state.contract!.parcel.id === 'hearthseed-casket') state.contract!.parcel.meter = clamp(state.contract!.parcel.meter + 1, 0, 5);
  const events = advanceTicks(state, 1);
  if (state.contract!.parcel.id === 'sleeping-bell') state.contract!.parcel.meter = clamp(state.contract!.parcel.meter - 1, 0, 3);
  addEvent(state, 'WAITED ONE TICK.');
  return events;
}

function useItem(state: GameState, slot: number): string[] {
  const item = state.courier.inventory[slot];
  if (!item) { addEvent(state, 'NO ITEM IN THAT SLOT.'); return []; }
  const id = item.id;
  const parcel = state.contract!.parcel;
  const floor = state.floor!;
  let used = true;
  if (id === 'padding') { parcel.guard = Math.min(3, parcel.guard + 2); addEvent(state, 'FELT PADDING READY — NEXT JOLT IS SOFTER.'); }
  else if (id === 'chalk') { state.surveyMode = 'routes'; addEvent(state, 'CHALK MARKS THE PACKAGE-WEIGHTED ROUTES.'); }
  else if (id === 'wedge') { floor.shiftIn += 2; addEvent(state, 'DOOR WEDGE DELAYS THE NEXT SHIFT.'); }
  else if (id === 'rope') { const nearby = [DIRECTIONS.map(direction => ({ x: state.courier.pos.x + DELTAS[direction].x, y: state.courier.pos.y + DELTAS[direction].y }))].flat().find(point => inBounds(floor, point) && tileAt(floor, point)?.kind === 'wall'); if (nearby) { tileAt(floor, nearby)!.kind = 'floor'; addEvent(state, 'ROPE CREATES A ONE-WAY CROSSING.'); } else { used = false; addEvent(state, 'NO MARKED GAP HERE.'); } }
  else if (id === 'smoke') { const threat = floor.threats.find(entry => entry.kind === 'watcher'); if (threat) { threat.disabledTicks = 2; addEvent(state, 'WATCHER SIGHT BLOCKED FOR TWO TICKS.'); } else used = false; }
  else if (id === 'ration') { const threat = floor.threats.find(entry => entry.kind === 'porter'); if (threat) { threat.disabledTicks = 3; addEvent(state, 'PORTER BEETLE DIVERTED TO A RATION.'); } else used = false; }
  else if (id === 'strap') { used = false; addEvent(state, 'CARRY THE COMPRESSION STRAP; IT WORKS AUTOMATICALLY.'); }
  else if (id === 'salve') { parcel.meter = 0; addEvent(state, 'COOLING SALVE CLEARED THE ACTIVE METER.'); }
  else if (id === 'cloth') { parcel.visited = [pointKey(state.courier.pos)]; parcel.meter = 0; addEvent(state, 'CLEANSING CLOTH ERASED THE PARCEL MEMORY.'); }
  else if (id === 'patch') { if (tileAt(floor, state.courier.pos)?.kind === 'bench') { parcel.condition = Math.min(parcel.maxCondition, parcel.condition + 1); state.floorFlags.benchUsed = true; addEvent(state, 'REPAIR PATCH RESTORED ONE CONDITION.'); } else { used = false; addEvent(state, 'REPAIR PATCH NEEDS A BENCH.'); } }
  else if (id === 'clock-key') { floor.shiftIn += 2; addEvent(state, 'CLOCK KEY BUYS TWO TICKS.'); }
  else if (id === 'insurance') { state.floorFlags.claimUsed = true; addEvent(state, 'INSURANCE SEAL WILL CATCH ONE BREAK.'); }
  else if (id === 'coin' || id === 'echo' || id === 'idol') { used = false; addEvent(state, 'VALUABLES CANNOT BE USED HERE.'); }
  if (used) { consumeItem(state, id); if (!state.upgrades.includes('quiet-buckle')) advanceTicks(state, 1); }
  return [];
}

function dropItem(state: GameState, slot: number): void {
  const item = state.courier.inventory[slot];
  if (!item || !state.floor) { addEvent(state, 'NO ITEM TO LEAVE BEHIND.'); return; }
  state.floor.dropped.push({ point: { ...state.courier.pos }, item: { ...item } });
  state.courier.inventory[slot] = null;
  addEvent(state, `LEFT ${ITEMS[item.id].label} BEHIND.`);
}

function interact(state: GameState): void {
  const floor = state.floor!;
  const point = state.courier.pos;
  const tile = tileAt(floor, point)!;
  const droppedIndex = floor.dropped.findIndex(entry => samePoint(entry.point, point));
  if (droppedIndex >= 0) {
    const empty = state.courier.inventory.findIndex(item => item === null);
    if (empty >= 0) {
      const dropped = floor.dropped.splice(droppedIndex, 1)[0];
      state.courier.inventory[empty] = dropped.item;
      addEvent(state, `RECOVERED ${ITEMS[dropped.item.id].label}.`);
    } else addEvent(state, 'SATCHEL FULL — DROP SOMETHING FIRST.');
    return;
  }
  if (samePoint(point, floor.recipient)) {
    const report: DeliveryReport = { parcelId: state.contract!.parcel.id, condition: state.contract!.parcel.condition, maxCondition: state.contract!.parcel.maxCondition, ticks: floor.tick, pay: Math.max(0, state.contract!.pay + (state.contract!.parcel.condition * 15) - Math.max(0, floor.tick - state.contract!.parTicks) * 3), violations: [...state.contract!.violations] };
    state.lastReport = report; state.reports.push(report); state.score += report.pay; state.pay += report.pay; state.phase = 'report'; addEvent(state, `DELIVERED: ${PARCELS[report.parcelId].label}.`); return;
  }
  if (tile.kind === 'bench') {
    if (inventoryHas(state, 'patch') > 0 && consumeItem(state, 'patch')) { state.contract!.parcel.condition = Math.min(state.contract!.parcel.maxCondition, state.contract!.parcel.condition + 1); addEvent(state, 'BENCH: PATCH RESTORED ONE CONDITION.'); }
    else addEvent(state, 'BENCH: NEED A REPAIR PATCH.');
    return;
  }
  if (tile.kind === 'niche') {
    const slot = state.courier.inventory.findIndex(item => item?.id === 'coin' || item?.id === 'idol' || item?.id === 'echo');
    if (slot >= 0) { dropItem(state, slot); tile.kind = 'floor'; addEvent(state, 'SACRIFICE ACCEPTED — SHORTCUT OPEN.'); }
    else addEvent(state, 'SACRIFICE NICHE: LEAVE A VALUABLE.');
    return;
  }
  addEvent(state, 'NOTHING TO INTERACT WITH HERE.');
}

function upgradeChoices(state: GameState): Array<{ id: UpgradeId; label: string; detail: string }> {
  const rng = createRng(mixSeed(state.seed, state.deliveryIndex * 1783 + 77));
  const available = UPGRADES.filter(upgrade => !state.upgrades.includes(upgrade.id));
  const choices: Array<{ id: UpgradeId; label: string; detail: string }> = [];
  while (choices.length < 3 && available.length) choices.push(available.splice(Math.floor(rng() * available.length), 1)[0]);
  return choices;
}

export function getUpgradeChoices(state: GameState): Array<{ id: UpgradeId; label: string; detail: string }> {
  return upgradeChoices(state);
}

export function applyCommand(state: GameState, command: Command): CommandResult {
  const next = clone(state);
  const events: string[] = [];
  const accept = (accepted = true): CommandResult => ({ state: next, events, accepted });
  switch (command.type) {
    case 'startRun': return acceptState(startRun('standard', command.seed ?? next.seed));
    case 'startTutorial': return acceptState(startRun('tutorial', next.seed));
    case 'restart': return acceptState(startRun(next.mode, command.seed ?? next.seed));
    case 'chooseOffer':
      if (next.phase === 'contract' && next.contractOffers[command.index]) { next.selectedOffer = command.index; beginContract(next, next.contractOffers[command.index]); return accept(); }
      return accept(false);
    case 'dismissBriefing': if (next.phase === 'briefing') { next.phase = 'traversal'; addEvent(next, 'TRAVERSAL ACTIVE. READ THE PREVIEW BEFORE MOVING.'); } else return accept(false); return accept();
    case 'move': if (next.phase === 'traversal') { events.push(...doMove(next, command.direction, Boolean(command.hurried))); return accept(); } return accept(false);
    case 'brace': if (next.phase === 'traversal') { events.push(...doBrace(next)); return accept(); } return accept(false);
    case 'wait': if (next.phase === 'traversal') { events.push(...doWait(next)); return accept(); } return accept(false);
    case 'interact': if (next.phase === 'traversal') { interact(next); if (next.phase === 'traversal') events.push(...advanceTicks(next, 1)); return accept(); } return accept(false);
    case 'useItem': if (next.phase === 'traversal') { events.push(...useItem(next, command.slot)); return accept(); } return accept(false);
    case 'toggleInventory': if (next.phase === 'traversal') { next.phase = 'inventory'; return accept(); } if (next.phase === 'inventory') { next.phase = 'traversal'; return accept(); } return accept(false);
    case 'selectInventory': if (next.phase === 'inventory') { const length = next.courier.inventory.length; next.courier.selectedSlot = (next.courier.selectedSlot + command.delta + length) % length; return accept(); } return accept(false);
    case 'dropItem': if (next.phase === 'inventory') { dropItem(next, command.slot); return accept(); } return accept(false);
    case 'cycleSurvey': if (next.phase === 'traversal') { next.surveyMode = next.surveyMode === 'none' ? 'routes' : next.surveyMode === 'routes' ? 'shift' : next.surveyMode === 'shift' ? 'threats' : 'none'; return accept(); } return accept(false);
    case 'toggleHelp': next.helpOpen = !next.helpOpen; return accept();
    case 'continueReport':
      if (next.phase === 'report') { if (next.mode === 'tutorial' || next.deliveryIndex >= 2) { next.phase = 'ending'; next.outcome = 'won'; } else next.phase = 'upgrade'; return accept(); }
      return accept(false);
    case 'chooseUpgrade':
      if (next.phase === 'upgrade') { const choices = upgradeChoices(next); const choice = choices[command.index]; if (choice) { next.upgrades.push(choice.id); next.deliveryIndex++; next.contractOffers = makeOffers(next); next.phase = 'contract'; addEvent(next, `UPGRADE INSTALLED: ${choice.label}.`); return accept(); } }
      return accept(false);
    default: return accept(false);
  }
}

function acceptState(state: GameState): CommandResult {
  return { state, events: [], accepted: true };
}

export function previewText(state: GameState, direction: Direction, hurried = false): ActionEvaluation {
  return evaluateMove(state, direction, hurried);
}

export function tileGlyph(tile: TileState, floor: FloorState, point: Point): string {
  if (tile.kind === 'wall') return '#';
  if (tile.kind === 'recipient') return 'D';
  if (tile.kind === 'anchor') return 'O';
  if (tile.kind === 'bench') return '+';
  if (tile.kind === 'cache') return 'C';
  if (tile.kind === 'niche') return 'V';
  if (tile.kind === 'rough') return ':';
  if (tile.kind === 'wet') return '~';
  if (tile.kind === 'weak') return ',';
  if (tile.kind === 'narrow') return '|';
  if (tile.kind === 'dynamic') return floor.gateOpen ? '=' : 'X';
  const dropped = floor.dropped.some(item => samePoint(item.point, point));
  return dropped ? 'o' : '.';
}

export function parcelMeterLabel(state: GameState): string {
  const parcel = state.contract?.parcel;
  if (!parcel) return '';
  const labels: Partial<Record<ParcelId, string>> = { 'moonwater-ampoule': 'SLOSH', 'sleeping-bell': 'WAKE', 'sunless-film': 'EXPOSURE', 'hearthseed-casket': 'HEAT', 'compass-needle': 'POLARITY' };
  return labels[parcel.id] ? `${labels[parcel.id]} ${parcel.meter}/3` : '';
}

export function visibleThreatAt(state: GameState, point: Point): ThreatState | undefined {
  return state.floor?.threats.find(threat => samePoint(threat.pos, point));
}

export function directionDelta(direction: Direction): Point {
  return DELTAS[direction];
}

export function directionFromKeys(dx: number, dy: number): Direction {
  return directionFromDelta(dx, dy);
}

export function offerLabel(offer: ContractOffer): string {
  return `${PARCELS[offer.parcelId].label} / ${SEAL_LABELS[offer.seal]}`;
}
