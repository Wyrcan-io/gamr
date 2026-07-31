import { mixSeed } from './seed';
import { scenarios } from './scenarios';
import type { Command, CommandResult, Direction, GameState, LogEntry, Point, Scenario, Tile, Train, TurnResolution } from './types';

const DELTAS: Record<Direction, Point> = { N: { x: 0, y: -1 }, E: { x: 1, y: 0 }, S: { x: 0, y: 1 }, W: { x: -1, y: 0 } };
const OPPOSITE: Record<Direction, Direction> = { N: 'S', E: 'W', S: 'N', W: 'E' };
const pointKey = (point: Point): string => `${point.x},${point.y}`;
const samePoint = (a: Point, b: Point): boolean => a.x === b.x && a.y === b.y;
const log = (turn: number, text: string, tone: LogEntry['tone'] = 'normal'): LogEntry => ({ turn, text, tone });

function cloneScenario(scenario: Scenario): Scenario {
  return { ...scenario, tiles: scenario.tiles.map(row => row.map(tile => ({ ...tile, connections: [...tile.connections], switchExits: tile.switchExits ? [...tile.switchExits] : undefined }))), trains: scenario.trains.map(train => ({ ...train, position: { ...train.position } })), hazards: scenario.hazards.map(event => ({ ...event, target: { ...event.target } })) };
}
function selectedTrain(state: GameState): Train | undefined { return state.selected.kind === 'train' ? state.trains[state.selected.trainId] : undefined; }
function tileAt(state: GameState, point: Point): Tile | undefined { return state.scenario.tiles[point.y]?.[point.x]; }
function validPoint(state: GameState, point: Point): boolean { return point.x >= 0 && point.y >= 0 && point.x < state.scenario.width && point.y < state.scenario.height; }
function trainAt(state: GameState, point: Point): Train | undefined { return Object.values(state.trains).find(train => train.status !== 'evacuated' && samePoint(train.position, point)); }
function addEvent(state: GameState, entry: LogEntry): void { state.eventLog = [entry, ...state.eventLog].slice(0, 8); }
function freshScenario(seed: number, index: number): Scenario { return cloneScenario(scenarios(mixSeed(seed, index + 1))[index % scenarios(seed).length]); }

export function createState(seed = Date.now(), scenarioIndex = 0, tutorial = false): GameState {
  const scenario = freshScenario(seed >>> 0, scenarioIndex);
  const trains = Object.fromEntries(scenario.trains.map(train => [train.id, train]));
  return { version: 1, seed: seed >>> 0, phase: 'start', scenarioIndex, scenario, turn: 1, maxTurns: scenario.maxTurns, actionPoints: 2, repairUsedThisTurn: false, trains, selected: { kind: 'tile', point: { x: 3, y: 5 } }, forecast: scenario.hazards, resolvedEvents: [], evacuatedPeople: 0, evacuatedSupplies: 0, targetPeople: scenario.targetPeople, targetSupplies: scenario.targetSupplies, eventLog: [], lastResolution: null, tutorialStep: tutorial ? 0 : null, helpOpen: false };
}

function moveSelection(state: GameState, dx: number, dy: number): void {
  const current = state.selected.kind === 'tile' ? state.selected.point : state.trains[state.selected.trainId]?.position ?? { x: 0, y: 0 };
  const point = { x: Math.max(0, Math.min(state.scenario.width - 1, current.x + dx)), y: Math.max(0, Math.min(state.scenario.height - 1, current.y + dy)) };
  state.selected = { kind: 'tile', point };
}
function spend(state: GameState): boolean { if (state.actionPoints <= 0) { addEvent(state, log(state.turn, 'NO ACTIONS LEFT THIS TURN.', 'warn')); return false; } state.actionPoints--; return true; }
function selectedTile(state: GameState): { point: Point; tile: Tile } | undefined { if (state.selected.kind !== 'tile') return undefined; const tile = tileAt(state, state.selected.point); return tile ? { point: state.selected.point, tile } : undefined; }

function switchJunction(state: GameState): void {
  const selected = selectedTile(state);
  if (!selected || selected.tile.kind !== 'junction' || !selected.tile.switchExits?.length) { addEvent(state, log(state.turn, 'SELECT A JUNCTION TO SWITCH.', 'warn')); return; }
  if (!spend(state)) return;
  const exits = selected.tile.switchExits; const current = exits.indexOf(selected.tile.activeExit ?? exits[0]); selected.tile.activeExit = exits[(current + 1) % exits.length];
  addEvent(state, log(state.turn, `SWITCH SET ${selected.tile.activeExit} AT JUNCTION.`));
}
function holdTrain(state: GameState): void {
  const train = selectedTrain(state);
  if (!train || train.status === 'evacuated') { addEvent(state, log(state.turn, 'SELECT A TRAIN TO HOLD.', 'warn')); return; }
  if (!spend(state)) return;
  train.status = 'held'; train.holdUntilTurn = state.turn;
  addEvent(state, log(state.turn, `TRAIN ${train.id} HELD FOR ONE TURN.`));
}
function repair(state: GameState): void {
  const selected = selectedTile(state);
  if (!selected || !['bridge', 'tunnel', 'track', 'junction'].includes(selected.tile.kind)) { addEvent(state, log(state.turn, 'SELECT A REPAIRABLE TRACK TILE.', 'warn')); return; }
  if (state.repairUsedThisTurn) { addEvent(state, log(state.turn, 'REPAIR CREW ALREADY COMMITTED THIS TURN.', 'warn')); return; }
  const hazard = state.scenario.hazards.find(event => samePoint(event.target, selected.point) && !event.resolved && event.turn >= state.turn);
  if (!hazard && !selected.tile.closed) { addEvent(state, log(state.turn, 'NO DAMAGE OR CLOSURE TO REPAIR HERE.', 'warn')); return; }
  if (!spend(state)) return;
  state.repairUsedThisTurn = true; selected.tile.reinforced = true; selected.tile.closed = false;
  if (hazard) hazard.resolved = true;
  addEvent(state, log(state.turn, `REPAIR CREW REINFORCED ${selected.tile.station ?? 'THE LINE'}.`, 'good'));
}
function clearObstruction(state: GameState): void {
  const selected = selectedTile(state);
  if (!selected?.tile.obstruction) { addEvent(state, log(state.turn, 'SELECT AN OBSTRUCTED TRACK TILE.', 'warn')); return; }
  if (!spend(state)) return; selected.tile.obstruction = false; addEvent(state, log(state.turn, 'OBSTRUCTION CLEARED.'));
}
function setRoute(state: GameState, exit: Direction): void {
  const train = selectedTrain(state); if (!train) { addEvent(state, log(state.turn, 'SELECT A TRAIN TO ROUTE.', 'warn')); return; }
  const tile = tileAt(state, train.position); if (tile?.kind !== 'junction' || !tile.switchExits?.includes(exit)) { addEvent(state, log(state.turn, 'THAT EXIT IS NOT AVAILABLE AT THE NEXT JUNCTION.', 'warn')); return; }
  train.plannedExit = exit; addEvent(state, log(state.turn, `TRAIN ${train.id} ROUTED ${exit}.`));
}

function movementIntent(state: GameState, train: Train): { train: Train; to: Point; heading: Direction } | null {
  if (train.status === 'evacuated' || train.status === 'held' || train.holdUntilTurn === state.turn) return null;
  const current = tileAt(state, train.position); if (!current) return null;
  let heading = train.heading;
  if (current.kind === 'junction' && current.switchExits?.length) heading = train.plannedExit ?? current.activeExit ?? current.switchExits[0];
  const delta = DELTAS[heading]; const to = { x: train.position.x + delta.x, y: train.position.y + delta.y };
  return { train, to, heading };
}
function canEnter(state: GameState, from: Point, to: Point, heading: Direction): boolean {
  if (!validPoint(state, to)) return false; const tile = tileAt(state, to); if (!tile || tile.kind === 'void' || tile.closed || tile.obstruction || tile.connections.length === 0) return false;
  return tile.connections.includes(OPPOSITE[heading]) && Boolean(tileAt(state, from)?.connections.includes(heading));
}
function resolveTurn(state: GameState): TurnResolution {
  const result: TurnResolution = { events: [], moved: [], blocked: [], evacuated: [], closed: [] };
  const intents = Object.values(state.trains).filter(train => train.status !== 'evacuated').map(train => movementIntent(state, train)).filter((intent): intent is NonNullable<typeof intent> => Boolean(intent)).sort((a, b) => a.train.priority - b.train.priority || a.train.id.localeCompare(b.train.id));
  const claimed = new Set<string>();
  for (const intent of intents) {
    const key = pointKey(intent.to); const occupied = trainAt(state, intent.to); const allowed = canEnter(state, intent.train.position, intent.to, intent.heading) && !claimed.has(key) && (!occupied || occupied.id === intent.train.id);
    if (!allowed) { intent.train.status = 'blocked'; result.blocked.push(intent.train.id); result.events.push(log(state.turn, `TRAIN ${intent.train.id} WAITING — LINE BLOCKED.`, 'warn')); continue; }
    intent.train.position = intent.to; intent.train.heading = intent.heading; intent.train.plannedExit = null; intent.train.status = 'moving'; claimed.add(key); result.moved.push(intent.train.id);
  }
  for (const train of Object.values(state.trains)) {
    if (train.status === 'held') continue;
    const tile = tileAt(state, train.position);
    if (tile?.safeTerminus) { train.status = 'evacuated'; state.evacuatedPeople += train.people; state.evacuatedSupplies += train.supplies; result.evacuated.push(train.id); result.events.push(log(state.turn, `${train.name.toUpperCase()} ARRIVED HOME — ${train.people} PEOPLE SAFE.`, 'good')); }
    else if (train.status === 'blocked' && !movementIntent(state, train)) train.status = 'stranded';
  }
  for (const event of state.scenario.hazards) {
    if (event.resolved || event.turn !== state.turn) continue;
    const tile = tileAt(state, event.target); if (!tile) continue;
    if (tile.reinforced) { tile.reinforced = false; event.resolved = true; result.events.push(log(state.turn, `${event.kind.toUpperCase()} HIT REINFORCED TRACK — LINE HOLDS.`)); continue; }
    if (event.effect === 'obstruct-track') tile.obstruction = true; else tile.closed = true;
    result.closed.push(event.target); event.resolved = true; result.events.push(log(state.turn, `${event.kind.toUpperCase()} CLOSED ${tile.station ?? 'A TRACK SECTION'}.`, 'bad'));
  }
  for (const train of Object.values(state.trains)) if (train.status === 'held') { train.status = 'moving'; train.holdUntilTurn = null; }
  state.turn++; state.actionPoints = 2; state.repairUsedThisTurn = false; state.forecast = state.scenario.hazards.filter(event => !event.resolved && event.turn >= state.turn && event.turn <= state.turn + 2); state.lastResolution = result; result.events.forEach(event => addEvent(state, event));
  if (state.evacuatedPeople >= state.targetPeople && state.evacuatedSupplies >= state.targetSupplies) state.phase = 'ending';
  else if (state.turn > state.maxTurns || Object.values(state.trains).some(train => train.status === 'stranded' || train.status === 'derailed')) state.phase = 'gameOver';
  else state.phase = 'turnReport';
  return result;
}

export function applyCommand(state: GameState, command: Command): CommandResult {
  const events: LogEntry[] = [];
  switch (command.type) {
    case 'startCampaign': { const fresh = createState(command.seed ?? state.seed, state.scenarioIndex); fresh.phase = 'briefing'; return { state: fresh, events: [] }; }
    case 'startTutorial': { const fresh = createState(state.seed, 0, true); fresh.phase = 'briefing'; return { state: fresh, events: [] }; }
    case 'restart': { const fresh = createState(command.seed ?? state.seed, state.scenarioIndex); fresh.phase = 'briefing'; return { state: fresh, events: [] }; }
    case 'dismissBriefing': if (state.phase === 'briefing') state.phase = 'planning'; break;
    case 'moveSelection': if (state.phase === 'planning') moveSelection(state, command.dx, command.dy); break;
    case 'selectNextTrain': { const ids = Object.values(state.trains).filter(train => train.status !== 'evacuated').map(train => train.id); if (ids.length) { const current = state.selected.kind === 'train' ? ids.indexOf(state.selected.trainId) : -1; state.selected = { kind: 'train', trainId: ids[(current + command.direction + ids.length) % ids.length] }; } break; }
    case 'switchJunction': if (state.phase === 'planning') switchJunction(state); break;
    case 'holdTrain': if (state.phase === 'planning') holdTrain(state); break;
    case 'repair': if (state.phase === 'planning') repair(state); break;
    case 'clear': if (state.phase === 'planning') clearObstruction(state); break;
    case 'setRoute': if (state.phase === 'planning') setRoute(state, command.exit); break;
    case 'commitTurn': if (state.phase === 'planning') { const resolution = resolveTurn(state); return { state, events: resolution.events }; } break;
    case 'dismissReport': if (state.phase === 'turnReport') state.phase = 'planning'; break;
    case 'toggleHelp': state.helpOpen = !state.helpOpen; break;
    default: break;
  }
  return { state, events };
}

export function tileGlyph(tile: Tile): string {
  if (tile.kind === 'void') return '   '; if (tile.closed) return ' × '; if (tile.obstruction) return ' # ';
  if (tile.safeTerminus) return ' H ';
  if (tile.station) return ' O ';
  const key = tile.connections.slice().sort().join(''); const glyph: Record<string, string> = { E: '───', W: '───', NS: ' │ ', EW: '───', EN: '└─ ', ES: '┌─ ', NW: ' ┘', SW: ' ┐', ENS: '┬─ ', ENW: '┴─ ', ESW: '┬─ ', NSW: '┤  ', ENSW: '┼─ ' };
  return glyph[key] ?? ' · ';
}

export function selectedTrainForState(state: GameState): Train | undefined { return selectedTrain(state); }
