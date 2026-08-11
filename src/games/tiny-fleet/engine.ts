import { chooseEnemyOrders } from './ai';
import { cloneScenario, SCENARIOS } from './content';
import { BOARD_SIZE, chartName, distance, forward, inBounds, passable, pointKey, samePoint, supercoverLine, turn } from './grid';
import { createRng } from './seed';
import type { BattleMode, Command, ContactTrack, Direction, GameState, IntelligenceState, ObservationState, Point, ResolutionEvent, ShipOrder, ShipState, SideId } from './types';

export interface ValidationResult { valid: boolean; reason: string; }

const CLASS_STATS = {
  scout: { hull: 2, speed: 2, lookout: 3, range: 2, damage: 1 },
  escort: { hull: 3, speed: 1, lookout: 3, range: 3, damage: 1 },
  flagship: { hull: 4, speed: 1, lookout: 2, range: 4, damage: 2 },
} as const;

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function className(classId: ShipState['classId']): string { return classId === 'scout' ? 'SWIFT' : classId === 'escort' ? 'AEGIS' : 'ATLAS'; }
function createShip(source: Pick<ShipState, 'id' | 'side' | 'classId' | 'pos' | 'facing'>): ShipState { return { ...source, pos: { ...source.pos }, hull: CLASS_STATS[source.classId].hull, reload: 0, afloat: true }; }
function emptyIntel(): Record<SideId, IntelligenceState> { return { player: { tracks: {} }, enemy: { tracks: {} } }; }

function buildState(seed: number, scenarioIndex: number, mode: BattleMode): GameState {
  const scenario = cloneScenario(SCENARIOS[scenarioIndex % SCENARIOS.length] ?? SCENARIOS[0]);
  const player = scenario.player.map(source => createShip({ ...source, side: 'player' }));
  const enemy = scenario.enemy.map(source => createShip({ ...source, side: 'enemy' }));
  const neutral = (scenario.neutral ?? []).map(source => createShip({ ...source, side: 'neutral' }));
  return {
    version: 1, seed: seed >>> 0, mode, scenarioIndex, phase: 'briefing', round: 1, roundLimit: scenario.roundLimit, scenario,
    ships: [...player, ...enemy, ...neutral], wrecks: [], smoke: [], orders: { player: {}, enemy: {} }, intelligence: emptyIntel(),
    sweepReveals: { player: [], enemy: [] }, flashReveals: { player: [], enemy: [] }, objective: clone(scenario.objective), reports: [], log: [],
    notice: 'READ THE BRIEFING. THEN ASSIGN ONE ORDER TO EACH SHIP.', outcome: null, flags: 0, campaignFlags: [], campaignComplete: false,
    selectedShipId: player[0]?.id ?? '', cursor: { ...(player[0]?.pos ?? { x: 0, y: 0 }) }, panel: 'contacts', replayIndex: 0, helpOpen: false,
  };
}

export function createState(seed = Date.now()): GameState { const state = buildState(seed, 0, 'campaign'); state.phase = 'start'; return state; }
export function createBattle(seed: number, scenarioIndex: number, mode: BattleMode = 'campaign'): GameState { return buildState(seed, scenarioIndex, mode); }
export function scenarioBriefing(state: GameState): string[] { return state.scenario.briefing; }
export function selectedShip(state: GameState): ShipState | undefined { return state.ships.find(ship => ship.id === state.selectedShipId); }
export function livingShips(state: GameState, side: SideId): ShipState[] { return state.ships.filter(ship => ship.side === side && ship.afloat); }

function occupied(state: GameState, point: Point, ignoreId?: string): ShipState | undefined { return state.ships.find(ship => ship.afloat && ship.id !== ignoreId && samePoint(ship.pos, point)); }
function smokeAt(state: GameState, point: Point): boolean { return state.smoke.some(smoke => samePoint(smoke.pos, point) && smoke.remaining > 0); }
function lineClear(state: GameState, from: Point, to: Point): boolean {
  for (const point of supercoverLine(from, to)) {
    if (state.scenario.terrain[point.y]?.[point.x] === 'island') return false;
    if (smokeAt(state, point) && !samePoint(point, to)) return false;
  }
  return true;
}

function canObserve(state: GameState, viewer: SideId, target: ShipState): boolean {
  if (!target.afloat) return false;
  if (target.side === viewer || target.side === 'neutral') return true;
  const observers = livingShips(state, viewer);
  return observers.some(observer => {
    const range = CLASS_STATS[observer.classId].lookout;
    if (distance(observer.pos, target.pos) > range || !lineClear(state, observer.pos, target.pos)) return false;
    const line = [observer.pos, ...supercoverLine(observer.pos, target.pos)];
    const hasFog = line.some(point => state.scenario.terrain[point.y]?.[point.x] === 'fog');
    return !hasFog || distance(observer.pos, target.pos) <= 1;
  });
}

function expandedPositions(state: GameState, track: ContactTrack): Point[] {
  const source = track.possible.length ? track.possible : [track.lastExact];
  const values = new Map<string, Point>();
  for (const position of source) {
    values.set(pointKey(position), position);
    for (const direction of ['N', 'E', 'S', 'W'] as Direction[]) {
      const one = forward(position, direction); if (passable(state.scenario.terrain, one)) values.set(pointKey(one), one);
      if (track.classId === 'scout') { const two = forward(one, direction); if (passable(state.scenario.terrain, two)) values.set(pointKey(two), two); }
    }
  }
  return [...values.values()].slice(0, 42);
}

function updateIntelligence(state: GameState, viewer: SideId): void {
  const tracks = state.intelligence[viewer].tracks;
  const enemies = state.ships.filter(ship => ship.side !== viewer && ship.side !== 'neutral');
  for (const enemy of enemies) {
    const revealed = canObserve(state, viewer, enemy) || state.sweepReveals[viewer].includes(enemy.id) || state.flashReveals[viewer].includes(enemy.id);
    const current = tracks[enemy.id];
    if (!enemy.afloat) { if (current) delete tracks[enemy.id]; continue; }
    if (revealed) {
      tracks[enemy.id] = { contactId: enemy.id, classId: enemy.classId, lastExact: { ...enemy.pos }, lastFacing: enemy.facing, lastHull: enemy.hull, lastSeenRound: state.round, age: 0, possible: [{ ...enemy.pos }], exact: true, source: state.sweepReveals[viewer].includes(enemy.id) ? 'sweep' : state.flashReveals[viewer].includes(enemy.id) ? 'gunFlash' : 'visual' };
    } else if (current) {
      const possible = expandedPositions(state, current);
      tracks[enemy.id] = { ...current, age: current.age + 1, possible, exact: false };
    }
  }
}

export function deriveObservation(state: GameState, viewer: SideId): ObservationState {
  const ownShips = state.ships.filter(ship => ship.side === viewer).map(clone);
  const visibleShips = state.ships.filter(ship => ship.side !== viewer && ship.afloat && (ship.side === 'neutral' || canObserve(state, viewer, ship) || state.sweepReveals[viewer].includes(ship.id) || state.flashReveals[viewer].includes(ship.id))).map(clone);
  return { viewer, round: state.round, terrain: clone(state.scenario.terrain), ownShips, visibleShips, tracks: Object.values(state.intelligence[viewer].tracks).map(clone), smoke: clone(state.smoke), objective: clone(state.objective), scenarioTitle: state.scenario.title };
}

function validation(state: GameState, side: SideId, shipId: string, order: ShipOrder): ValidationResult {
  const ship = state.ships.find(item => item.id === shipId && item.side === side);
  if (!ship || !ship.afloat) return { valid: false, reason: 'SHIP IS NOT AFLOAT.' };
  if (order.type === 'fire') {
    if (ship.reload > 0) return { valid: false, reason: 'ATLAS BATTERY RELOADING.' };
    if (distance(ship.pos, order.target) > CLASS_STATS[ship.classId].range || !inBounds(order.target)) return { valid: false, reason: `${className(ship.classId)} CANNOT REACH ${chartName(order.target)}.` };
    return { valid: true, reason: 'FIRE SOLUTION VALID.' };
  }
  if (order.type === 'sweep' && ship.classId !== 'scout') return { valid: false, reason: 'ONLY SWIFT HAS A SIGNAL SWEEP.' };
  if (order.type === 'smoke') {
    if (ship.classId !== 'escort') return { valid: false, reason: 'ONLY AEGIS CAN LAY SMOKE.' };
    const orthogonalDistance = Math.abs(ship.pos.x - order.target.x) + Math.abs(ship.pos.y - order.target.y);
    if (orthogonalDistance > 1 || !passable(state.scenario.terrain, order.target)) return { valid: false, reason: 'SMOKE MUST BE HERE OR ORTHOGONALLY ADJACENT.' };
  }
  return { valid: true, reason: 'ORDER VALID.' };
}

export function validateOrder(state: GameState, side: SideId, shipId: string, order: ShipOrder): ValidationResult { return validation(state, side, shipId, order); }

export interface OrderPreview { label: string; legal: boolean; certainty: 'SAFE' | 'CONDITIONAL'; reason: string; }
export function previewSelectedOrder(state: GameState): OrderPreview {
  const order = state.orders.player[state.selectedShipId];
  if (!order) return { label: 'NO ORDER QUEUED', legal: false, certainty: 'CONDITIONAL', reason: 'Assign an order before opening the docket.' };
  const result = validation(state, 'player', state.selectedShipId, order);
  const conditional = order.type === 'fire' || order.type === 'ahead' || order.type === 'port' || order.type === 'starboard' || order.type === 'about';
  return { label: orderLabel(order), legal: result.valid, certainty: conditional ? 'CONDITIONAL' : 'SAFE', reason: result.valid && conditional ? 'LEGAL, OUTCOME DEPENDS ON SIMULTANEOUS RESOLUTION.' : result.reason };
}

function directionAfter(current: Direction, order: ShipOrder): Direction {
  if (order.type === 'port') return turn(current, 3); if (order.type === 'starboard') return turn(current, 1); if (order.type === 'about') return turn(current, 2); return current;
}

function neutralOrders(state: GameState): Record<string, ShipOrder> {
  const result: Record<string, ShipOrder> = {};
  const objective = state.objective;
  if (!objective.courierId || !objective.courierRoute) return result;
  const courier = state.ships.find(ship => ship.id === objective.courierId && ship.afloat);
  const next = objective.courierRoute[objective.courierProgress + 1];
  if (!courier || !next) return result;
  const desired: Direction = Math.abs(next.x - courier.pos.x) >= Math.abs(next.y - courier.pos.y) ? next.x > courier.pos.x ? 'E' : 'W' : next.y > courier.pos.y ? 'S' : 'N';
  result[courier.id] = { type: desired === courier.facing ? 'ahead' : desired === turn(courier.facing, 1) ? 'starboard' : desired === turn(courier.facing, 3) ? 'port' : 'about' };
  return result;
}

function allOrders(state: GameState): Record<string, ShipOrder> { return { ...state.orders.player, ...state.orders.enemy, ...neutralOrders(state) }; }

function resolveMovement(state: GameState, orders: Record<string, ShipOrder>): void {
  const maneuverOrders = Object.entries(orders).filter(([, order]) => ['ahead', 'port', 'starboard', 'about'].includes(order.type));
  for (const [id, order] of maneuverOrders) {
    const ship = state.ships.find(item => item.id === id); if (ship) ship.facing = directionAfter(ship.facing, order);
  }
  const movingOrders = maneuverOrders.filter(([, order]) => order.type !== 'about');
  for (let impulse = 1; impulse <= 2; impulse++) {
    const proposals = new Map<string, Point>();
    for (const [id, order] of movingOrders) {
      const ship = state.ships.find(item => item.id === id); if (!ship?.afloat) continue;
      const speed = CLASS_STATS[ship.classId].speed;
      if (impulse > speed || (impulse === 2 && order.type !== 'ahead')) continue;
      const destination = forward(ship.pos, ship.facing);
      if (passable(state.scenario.terrain, destination) && !state.wrecks.some(wreck => samePoint(wreck, destination))) proposals.set(id, destination);
    }
    const contested = new Set<string>();
    for (const [id, destination] of proposals) for (const [other, otherDestination] of proposals) if (id !== other && samePoint(destination, otherDestination)) contested.add(id);
    const status = new Map<string, 0 | 1 | 2>();
    const canMove = (id: string, stack: Set<string>): boolean => {
      const known = status.get(id); if (known === 1) return true; if (known === 2) return false; if (stack.has(id)) return false;
      if (contested.has(id)) { status.set(id, 2); return false; }
      const destination = proposals.get(id); if (!destination) { status.set(id, 2); return false; }
      const occupant = occupied(state, destination, id);
      if (!occupant) { status.set(id, 1); return true; }
      const nextStack = new Set(stack); nextStack.add(id);
      const result = proposals.has(occupant.id) && canMove(occupant.id, nextStack);
      status.set(id, result ? 1 : 2); return result;
    };
    for (const id of proposals.keys()) canMove(id, new Set());
    const moves: Array<{ ship: ShipState; destination: Point }> = [];
    for (const [id, destination] of proposals) if (status.get(id) === 1) { const ship = state.ships.find(item => item.id === id); if (ship) moves.push({ ship, destination }); }
    for (const move of moves) move.ship.pos = move.destination;
  }
}

function addReport(state: GameState, event: ResolutionEvent): void { state.reports.push(event); state.log = [...state.log, event.text].slice(-8); }
function playerCanSee(state: GameState, ship: ShipState): boolean { return canObserve(state, 'player', ship) || state.sweepReveals.player.includes(ship.id) || state.flashReveals.player.includes(ship.id); }

function resolveRound(state: GameState): void {
  state.reports = []; state.notice = 'RESOLVING SEALED ORDERS...'; state.sweepReveals = { player: [], enemy: [] }; state.flashReveals = { player: [], enemy: [] };
  const orders = allOrders(state);
  const before = new Map(state.ships.map(ship => [ship.id, { ...ship.pos }]));
  resolveMovement(state, orders);
  for (const ship of livingShips(state, 'player')) if (!samePoint(before.get(ship.id) ?? ship.pos, ship.pos)) addReport(state, { text: `${className(ship.classId)} MOVES TO ${chartName(ship.pos)}.`, side: 'player', shipId: ship.id, publicTo: ['player'], kind: 'info' });
  for (const ship of state.ships.filter(item => item.side === 'enemy' && item.afloat)) if (!samePoint(before.get(ship.id) ?? ship.pos, ship.pos) && playerCanSee(state, ship)) addReport(state, { text: `CONTACT ${ship.id} MOVES TO ${chartName(ship.pos)}.`, side: 'enemy', shipId: ship.id, publicTo: ['player'], kind: 'info' });

  const brace = new Set<string>();
  for (const [id, order] of Object.entries(orders)) {
    const ship = state.ships.find(item => item.id === id); if (!ship?.afloat) continue;
    if (order.type === 'brace') brace.add(id);
    if (order.type === 'sweep') {
      const viewer = ship.side === 'player' ? 'player' : 'enemy';
      for (const target of state.ships.filter(item => item.side !== ship.side && item.side !== 'neutral' && item.afloat && distance(ship.pos, item.pos) <= 5)) state.sweepReveals[viewer].push(target.id);
      if (ship.side === 'player') addReport(state, { text: 'SWIFT SIGNAL SWEEP: CONTACTS REFRESHED.', side: 'player', shipId: id, publicTo: ['player'], kind: 'success' });
    }
    if (order.type === 'smoke') {
      state.smoke.push({ pos: { ...order.target }, remaining: 2, owner: ship.side === 'player' ? 'player' : 'enemy' });
      if (ship.side === 'player') addReport(state, { text: `AEGIS LAYS SMOKE AT ${chartName(order.target)}.`, side: 'player', shipId: id, publicTo: ['player'], kind: 'info' });
    }
  }

  const damage = new Map<string, number>();
  const fired = new Set<string>();
  for (const [id, order] of Object.entries(orders)) {
    if (order.type !== 'fire') continue;
    const shooter = state.ships.find(item => item.id === id); if (!shooter?.afloat || shooter.reload > 0) continue;
    fired.add(id); const target = occupied(state, order.target); const blocked = !lineClear(state, shooter.pos, order.target);
      if (shooter.side === 'player') {
        if (blocked) addReport(state, { text: `${className(shooter.classId)} FIRES ${chartName(order.target)} — LINE BLOCKED.`, side: 'player', shipId: id, publicTo: ['player'], kind: 'warning' });
      else addReport(state, { text: `${className(shooter.classId)} FIRES ${chartName(order.target)}${target ? ` — ${target.side === 'enemy' ? 'HIT CONFIRMED.' : 'FRIENDLY FIRE.'}` : ' — MISS.'}`, side: 'player', shipId: id, publicTo: ['player'], kind: target ? 'damage' : 'info' });
    } else {
      state.flashReveals.player.push(id); addReport(state, { text: `GUN FLASH: ${id} AT ${chartName(shooter.pos)}.`, side: 'enemy', shipId: id, publicTo: ['player'], kind: 'warning' });
    }
    if (!blocked && target) damage.set(target.id, (damage.get(target.id) ?? 0) + CLASS_STATS[shooter.classId].damage);
  }
  for (const [id, amount] of damage) {
    const target = state.ships.find(ship => ship.id === id); if (!target?.afloat) continue;
    const finalDamage = Math.max(0, amount - (brace.has(id) ? 1 : 0)); target.hull = Math.max(0, target.hull - finalDamage);
    if (target.side === 'player' && finalDamage > 0) addReport(state, { text: `${className(target.classId)} TAKES ${finalDamage} DAMAGE${brace.has(id) ? ' AFTER BRACE' : ''}.`, side: 'enemy', shipId: id, publicTo: ['player'], kind: 'damage' });
    if (target.side === 'player' && finalDamage === 0 && amount > 0) addReport(state, { text: `${className(target.classId)} BRACE ABSORBS THE FIRE.`, side: 'enemy', shipId: id, publicTo: ['player'], kind: 'success' });
    if (target.hull <= 0) {
      target.afloat = false; state.wrecks.push({ ...target.pos });
      const observed = target.side === 'player' || playerCanSee(state, target) || state.orders.player[id]?.type === 'fire';
      addReport(state, { text: target.side === 'enemy' && !observed ? 'CONTACT LOST — CONFIRMED SINK.' : `${className(target.classId)} ${target.id} SUNK AT ${chartName(target.pos)}.`, side: target.side, shipId: observed ? id : undefined, publicTo: ['player'], kind: 'warning' });
    }
  }
  for (const ship of state.ships) if (ship.classId === 'flagship') { if (fired.has(ship.id)) ship.reload = 1; else if (ship.reload > 0) ship.reload = 0; }
  state.smoke = state.smoke.map(smoke => ({ ...smoke, remaining: smoke.remaining - 1 })).filter(smoke => smoke.remaining > 0);
  advanceCourier(state);
  updateIntelligence(state, 'player'); updateIntelligence(state, 'enemy');
  updateOutcome(state);
  state.round += 1;
  if (!state.outcome) state.notice = 'ROUND RESOLVED. REVIEW THE LOG, THEN PLAN AGAIN.';
}

function advanceCourier(state: GameState): void {
  const objective = state.objective; if (!objective.courierId || !objective.courierRoute) return;
  const courier = state.ships.find(ship => ship.id === objective.courierId); if (!courier?.afloat) return;
  const next = objective.courierRoute[objective.courierProgress + 1];
  let arrived = false;
  if (next && samePoint(courier.pos, next)) { objective.courierProgress += 1; arrived = objective.courierProgress >= objective.courierRoute.length - 1; }
  if (arrived) addReport(state, { text: 'COURIER REACHES THE EASTERN MARKER.', side: 'neutral', shipId: courier.id, publicTo: ['player'], kind: 'success' });
}

function updateOutcome(state: GameState): void {
  const enemiesAlive = livingShips(state, 'enemy').length; const playersAlive = livingShips(state, 'player').length;
  let success = enemiesAlive === 0 && state.objective.kind === 'eliminate';
  if (state.objective.kind === 'hold') {
    const controlled = state.objective.controlPoints.filter(point => livingShips(state, 'player').some(ship => samePoint(ship.pos, point))).length;
    state.objective.controlStreak = controlled >= state.objective.controlNeeded ? state.objective.controlStreak + 1 : 0;
    success = state.objective.controlStreak >= state.objective.holdRounds;
  }
  if (state.objective.kind === 'escort') success = state.objective.courierProgress >= (state.objective.courierRoute?.length ?? 1) - 1;
  const blackPennantEscaped = state.scenario.id === 'black-pennant' && state.ships.some(ship => ship.id === 'P3' && ship.afloat && samePoint(ship.pos, { x: 8, y: 8 }));
  if (success && playersAlive > 0) state.outcome = 'victory';
  else if (playersAlive === 0 || (state.objective.kind === 'escort' && !state.ships.some(ship => ship.id === state.objective.courierId && ship.afloat)) || blackPennantEscaped || state.round >= state.roundLimit) state.outcome = success ? 'draw' : 'defeat';
  if (state.outcome === 'victory') {
    state.flags = 1 + (playersAlive >= 2 ? 1 : 0) + (state.round <= state.roundLimit - 2 ? 1 : 0);
    addReport(state, { text: `MISSION ${state.flags === 3 ? 'EXCELLENT' : 'COMPLETE'} — ${state.objective.text}`, publicTo: ['player'], kind: 'success' });
  } else if (state.outcome === 'defeat') addReport(state, { text: 'MISSION FAILED — THE SEA STATE COULD NOT BE HELD.', publicTo: ['player'], kind: 'warning' });
}

function prepareEnemy(state: GameState): void {
  const observation = deriveObservation(state, 'enemy');
  const rng = createRng((state.seed ^ (state.round * 2654435761) ^ state.scenarioIndex) >>> 0);
  state.orders.enemy = chooseEnemyOrders(observation, state.scenario.enemyDoctrine, rng);
}

export function applyCommand(input: GameState, command: Command): GameState {
  const state = clone(input);
  if (command.type === 'toggleHelp') { state.helpOpen = !state.helpOpen; return state; }
  if (state.helpOpen) return state;
  if (command.type === 'start') { state.mode = command.mode; state.phase = 'briefing'; state.notice = 'MISSION BRIEFING READY.'; return state; }
  if (command.type === 'restart') { const restart = buildState(state.seed, state.scenarioIndex, state.mode); restart.campaignFlags = [...state.campaignFlags]; restart.phase = state.mode === 'campaign' ? 'briefing' : 'briefing'; return restart; }
  if (command.type === 'nextBattle') {
    if (state.outcome !== 'victory') return state;
    const nextIndex = state.scenarioIndex + 1;
    if (state.mode === 'campaign' && nextIndex >= SCENARIOS.length) { state.campaignFlags = [...state.campaignFlags, state.flags]; state.phase = 'ending'; state.campaignComplete = true; return state; }
    const next = buildState(state.seed, state.mode === 'skirmish' ? state.scenarioIndex : nextIndex % SCENARIOS.length, state.mode); next.campaignFlags = [...state.campaignFlags, state.flags]; return next;
  }
  if (command.type === 'dismissBriefing' && state.phase === 'briefing') { state.phase = 'planning'; prepareEnemy(state); state.notice = 'ASSIGN ONE ORDER TO EACH LIVING SHIP. ENTER SEALS THE FLEET.'; return state; }
  if (command.type === 'selectShip' && state.phase === 'planning') { const ship = state.ships.find(item => item.id === command.shipId && item.side === 'player' && item.afloat); if (ship) { state.selectedShipId = ship.id; state.cursor = { ...ship.pos }; } return state; }
  if (command.type === 'moveCursor' && state.phase === 'planning') { state.cursor = { x: Math.max(0, Math.min(BOARD_SIZE - 1, state.cursor.x + command.delta.x)), y: Math.max(0, Math.min(BOARD_SIZE - 1, state.cursor.y + command.delta.y)) }; return state; }
  if (command.type === 'cyclePanel' && state.phase === 'planning') { state.panel = state.panel === 'contacts' ? 'log' : state.panel === 'log' ? 'mission' : 'contacts'; return state; }
  if (command.type === 'openOrderReview' && state.phase === 'planning') {
    const missing = livingShips(state, 'player').find(ship => !state.orders.player[ship.id]);
    if (missing) { state.notice = `ASSIGN AN ORDER TO ${className(missing.classId)} FIRST.`; return state; }
    state.phase = 'orderReview'; state.notice = 'ORDER DOCKET OPEN. ENTER AGAIN TO SEAL THE FLEET.'; return state;
  }
  if (command.type === 'closeOrderReview' && state.phase === 'orderReview') { state.phase = 'planning'; state.notice = 'ORDER DOCKET CLOSED. EDITING RESUMED.'; return state; }
  if (command.type === 'clearOrder' && state.phase === 'planning') { delete state.orders.player[command.shipId]; state.notice = 'ORDER CLEARED.'; return state; }
  if (command.type === 'queueOrder' && state.phase === 'planning') {
    const result = validation(state, 'player', command.shipId, command.order);
    if (!result.valid) { state.notice = result.reason; return state; }
    state.orders.player[command.shipId] = clone(command.order); state.selectedShipId = command.shipId; state.notice = `${className(state.ships.find(ship => ship.id === command.shipId)?.classId ?? 'scout')} ORDER QUEUED.`; return state;
  }
  if (command.type === 'sealOrders' && state.phase === 'planning') {
    const missing = livingShips(state, 'player').find(ship => !state.orders.player[ship.id]);
    if (missing) { state.notice = `ASSIGN AN ORDER TO ${className(missing.classId)} FIRST.`; return state; }
    state.phase = 'roundReport'; resolveRound(state); return state;
  }
  if (command.type === 'sealOrders' && state.phase === 'orderReview') { state.phase = 'roundReport'; resolveRound(state); return state; }
  if (command.type === 'dismissReport' && state.phase === 'roundReport') {
    if (state.outcome) state.phase = 'battleReport';
    else { state.phase = 'planning'; state.orders = { player: {}, enemy: {} }; prepareEnemy(state); state.notice = 'NEW ROUND. READ THE CONTACTS, THEN SEAL THREE ORDERS.'; }
    return state;
  }
  if (command.type === 'openReplay' && state.phase === 'roundReport') { state.phase = 'replay'; state.replayIndex = 0; state.notice = 'PUBLIC REPLAY OPEN. ENTER STEP THROUGH THE RESOLUTION.'; return state; }
  if (command.type === 'advanceReplay' && state.phase === 'replay') {
    if (state.replayIndex < Math.max(0, state.reports.length - 1)) { state.replayIndex += 1; return state; }
    if (state.outcome) state.phase = 'battleReport';
    else { state.phase = 'planning'; state.orders = { player: {}, enemy: {} }; prepareEnemy(state); state.notice = 'NEW ROUND. READ THE CONTACTS, THEN SEAL THREE ORDERS.'; }
    return state;
  }
  return state;
}

export function orderLabel(order: ShipOrder | undefined): string {
  if (!order) return '— UNASSIGNED';
  if (order.type === 'fire' || order.type === 'smoke') return `${order.type.toUpperCase()} ${chartName(order.target)}`;
  return order.type === 'sweep' ? 'SWEEP' : order.type.toUpperCase();
}

export function hullPips(ship: ShipState): string { return '◆'.repeat(ship.hull) + '◇'.repeat(Math.max(0, CLASS_STATS[ship.classId].hull - ship.hull)); }
export function classStats(classId: ShipState['classId']): typeof CLASS_STATS[ShipState['classId']] { return CLASS_STATS[classId]; }
