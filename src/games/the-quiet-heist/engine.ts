import type { Command, Direction, GameState, GuardIntent, Incident, Job, Point } from './types';

const jobs: Job[] = [
  {
    title: 'JOB 01 // BORROWED LIGHT',
    brief: ['Take the brass night key, open the Sapphire case, then leave clean.', 'If the alarm rises, the street exit seals: use the service exit instead.', 'Read every arrow. Guards resolve only when you press ENTER.'],
    map: ['E..........S', '.###..###...', '....#.....#.', '....#..#....', '....#..#....', '.H..#.......', '............', '############'],
    start: { x: 1, y: 6 }, key: { x: 3, y: 5 }, display: { x: 9, y: 2 }, exits: { east: { x: 0, y: 0 }, service: { x: 11, y: 0 } },
    guards: [
      { id: 'G1', pos: { x: 7, y: 6 }, facing: 'W', mode: 'patrol', patrol: [{ x: 7, y: 6 }, { x: 10, y: 6 }, { x: 10, y: 3 }, { x: 7, y: 3 }], patrolIndex: 0 },
      { id: 'G2', pos: { x: 6, y: 1 }, facing: 'S', mode: 'patrol', patrol: [{ x: 6, y: 1 }, { x: 6, y: 4 }, { x: 9, y: 4 }, { x: 9, y: 1 }], patrolIndex: 0 },
    ], camera: { id: 'C1', pos: { x: 7, y: 2 }, direction: 'W', jammed: 0 }, decoys: 2, jammers: 1,
  },
  {
    title: 'JOB 02 // UNSCHEDULED LOAN',
    brief: ['Disable the exhibit grid before taking the Cartographer case.', 'A forced case opening announces you: the staff exit becomes the only route.', 'The same floor, a different contract.'],
    map: ['E..........S', '.##....##...', '....#.....#.', '....#..#....', '....#..#....', '.H..#.......', '............', '############'],
    start: { x: 1, y: 6 }, key: { x: 3, y: 5 }, display: { x: 9, y: 2 }, exits: { east: { x: 0, y: 0 }, service: { x: 11, y: 0 } },
    guards: [
      { id: 'G1', pos: { x: 8, y: 6 }, facing: 'W', mode: 'patrol', patrol: [{ x: 8, y: 6 }, { x: 10, y: 6 }, { x: 10, y: 3 }, { x: 8, y: 3 }], patrolIndex: 0 },
      { id: 'G2', pos: { x: 6, y: 1 }, facing: 'S', mode: 'patrol', patrol: [{ x: 6, y: 1 }, { x: 6, y: 4 }, { x: 9, y: 4 }, { x: 9, y: 1 }], patrolIndex: 0 },
      { id: 'G3', pos: { x: 2, y: 2 }, facing: 'E', mode: 'patrol', patrol: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 4 }, { x: 2, y: 4 }], patrolIndex: 0 },
    ], camera: { id: 'C1', pos: { x: 7, y: 2 }, direction: 'W', jammed: 0 }, decoys: 2, jammers: 1,
  },
];

const dirs: Record<Direction, Point> = { N: { x: 0, y: -1 }, E: { x: 1, y: 0 }, S: { x: 0, y: 1 }, W: { x: -1, y: 0 } };
const dirFor = (from: Point, to: Point): Direction => to.x > from.x ? 'E' : to.x < from.x ? 'W' : to.y > from.y ? 'S' : 'N';
const same = (a: Point, b: Point): boolean => a.x === b.x && a.y === b.y;
const clone = <T>(value: T): T => structuredClone(value);
function inside(p: Point): boolean { return p.x >= 0 && p.x < 12 && p.y >= 0 && p.y < 8; }
function walkable(state: GameState, p: Point): boolean { return inside(p) && state.grid[p.y]?.[p.x] !== '#'; }
function neighbours(p: Point): Point[] { return (['N', 'E', 'S', 'W'] as Direction[]).map(d => ({ x: p.x + dirs[d].x, y: p.y + dirs[d].y })); }
function path(state: GameState, from: Point, to: Point): Point[] {
  if (same(from, to)) return [];
  const queue: Point[] = [from]; const came = new Map<string, Point>(); const key = (p: Point) => `${p.x},${p.y}`; const seen = new Set([key(from)]);
  while (queue.length) { const current = queue.shift()!; for (const next of neighbours(current)) { if (!walkable(state, next) || seen.has(key(next))) continue; seen.add(key(next)); came.set(key(next), current); if (same(next, to)) { const result: Point[] = []; let cursor = next; while (!same(cursor, from)) { result.unshift(cursor); cursor = came.get(key(cursor))!; } return result; } queue.push(next); } }
  return [];
}
function lineVision(state: GameState, pos: Point, facing: Direction): Point[] {
  const result: Point[] = []; let cursor = { ...pos }; const delta = dirs[facing];
  for (let i = 0; i < 4; i++) { cursor = { x: cursor.x + delta.x, y: cursor.y + delta.y }; if (!walkable(state, cursor)) break; result.push({ ...cursor }); }
  return result;
}
function currentVision(state: GameState): Point[] { return state.guards.flatMap(g => [g.pos, ...lineVision(state, g.pos, g.facing)]); }
function addIncident(state: GameState, text: string, kind: Incident['kind'] = 'info'): void { state.incidents.unshift({ turn: state.turn, text, kind }); state.incidents = state.incidents.slice(0, 8); state.notice = text; }
function objectiveText(state: GameState): string {
  if (!state.keyTaken) return 'GET THE BRASS NIGHT KEY';
  if (!state.caseOpen) return 'OPEN THE SAPPHIRE DISPLAY';
  return state.objective === 'exit-service' ? 'ESCAPE VIA STAFF EXIT' : 'ESCAPE VIA STREET EXIT';
}
function makeState(jobIndex: number, seed: number, mode: 'tutorial' | 'campaign' = 'campaign'): GameState {
  const job = jobs[jobIndex % jobs.length]!; const state: GameState = { version: 1, seed: seed >>> 0, mode, tutorialStep: 0, phase: 'briefing', jobIndex: jobIndex % jobs.length, turn: 1, ap: 2, alarm: 0, grid: [...job.map], player: { ...job.start }, facing: 'E', guards: clone(job.guards), camera: clone(job.camera), noise: [], keyTaken: false, caseOpen: false, asset: false, objective: 'key', decoys: job.decoys, jammers: job.jammers, forecast: [], pending: [], incidents: [], notice: objectiveText({ keyTaken: false, caseOpen: false, objective: 'key' } as GameState), score: 0, helpOpen: false };
  state.forecast = forecast(state); return state;
}
export function createState(seed = Date.now()): GameState { const state = makeState(0, seed, 'campaign'); state.phase = 'start'; return state; }
export function jobsForMenu(): readonly Job[] { return jobs; }
export function jobLocations(state: GameState): Pick<Job, 'key' | 'display' | 'exits'> { const job = activeJob(state); return { key: { ...job.key }, display: { ...job.display }, exits: { east: { ...job.exits.east }, service: { ...job.exits.service } } }; }
function snapshot(state: GameState): GameState { const result = clone(state); result.checkpoint = undefined; return result; }
function withPlanning(state: GameState, action: (next: GameState) => void): GameState {
  const next = clone(state); if (!next.checkpoint) next.checkpoint = snapshot(state); action(next); if (next.mode === 'tutorial' && next.pending.length > 0) next.tutorialStep = Math.max(next.tutorialStep, 2); next.forecast = forecast(next); return next;
}
function forecast(state: GameState): GuardIntent[] {
  return state.guards.map((guard) => {
    let reason: GuardIntent['reason'] = 'PATROL'; let target: Point | undefined;
    if (guard.lastSeen) { target = guard.lastSeen; reason = 'LAST SEEN'; }
    else if (state.noise.length) { const nearest = [...state.noise].sort((a, b) => Math.abs(a.pos.x - guard.pos.x) + Math.abs(a.pos.y - guard.pos.y) - (Math.abs(b.pos.x - guard.pos.x) + Math.abs(b.pos.y - guard.pos.y)))[0]!; target = nearest.pos; reason = 'NOISE'; }
    const patrolTarget = guard.patrol[(guard.patrolIndex + 1) % guard.patrol.length]!; target ??= patrolTarget;
    const route = path(state, guard.pos, target); const to = route[0] ?? guard.pos; const facing = same(to, guard.pos) ? dirFor(guard.pos, target) : dirFor(guard.pos, to);
    return { guardId: guard.id, reason, from: { ...guard.pos }, to: { ...to }, facing, vision: [to, ...lineVision(state, to, facing)] };
  });
}
function setAlarm(state: GameState, reason: string): void {
  if (state.alarm >= 3) return; state.alarm = (state.alarm + 1) as GameState['alarm']; addIncident(state, `ALARM ${state.alarm}: ${reason}`, 'warning');
  if (state.alarm >= 2 && state.objective === 'exit-east') { state.objective = 'exit-service'; addIncident(state, 'LOCKDOWN: STREET EXIT SEALED. CONTRACT UPDATED → STAFF EXIT.', 'warning'); }
}
function activeJob(state: GameState): Job { return jobs[state.jobIndex % jobs.length]!; }
function resolveContract(state: GameState): void {
  const job = activeJob(state);
  if (state.keyTaken && !state.caseOpen && same(state.player, job.display)) state.notice = 'KEY READY. PRESS I TO OPEN THE DISPLAY.';
  if (state.caseOpen && state.objective === 'case') { state.objective = state.alarm > 0 ? 'exit-service' : 'exit-east'; addIncident(state, state.alarm > 0 ? 'FORCED ACQUISITION: TAKE THE CASE TO THE STAFF EXIT.' : 'QUIET ACQUISITION: STREET EXIT IS CLEAR.', state.alarm > 0 ? 'warning' : 'success'); }
}
function commit(state: GameState): GameState {
  const next = clone(state); const intents = clone(state.forecast); next.pending = []; next.checkpoint = undefined;
  for (const intent of intents) { const guard = next.guards.find(g => g.id === intent.guardId); if (!guard) continue; guard.pos = { ...intent.to }; guard.facing = intent.facing; if (intent.reason === 'PATROL' && same(intent.to, guard.patrol[(guard.patrolIndex + 1) % guard.patrol.length]!)) guard.patrolIndex = (guard.patrolIndex + 1) % guard.patrol.length; if (intent.reason === 'NOISE') guard.mode = 'investigate'; addIncident(next, `${guard.id} ${intent.reason.toLowerCase()} → (${intent.to.x + 1},${intent.to.y + 1}).`); }
  next.noise = next.noise.map(n => ({ ...n, turns: n.turns - 1 })).filter(n => n.turns > 0); if (next.camera.jammed > 0) next.camera.jammed--;
  const guardSeen = next.guards.filter(g => same(g.pos, next.player) || lineVision(next, g.pos, g.facing).some(p => same(p, next.player))); guardSeen.forEach(g => { g.lastSeen = { ...next.player }; g.mode = 'pursue'; });
  const seen = visible(next); const playerKey = `${next.player.x},${next.player.y}`; const occupying = next.guards.find(g => same(g.pos, next.player));
  if (occupying) { next.alarm = 3; next.phase = 'gameOver'; addIncident(next, `${occupying.id} entered your tile. CAUGHT.`, 'warning'); }
  else if (seen.has(playerKey) && next.player.y !== 0) setAlarm(next, guardSeen.length ? `${guardSeen.map(g => g.id).join(', ')} confirmed your position.` : 'camera C1 confirmed your position.');
  next.turn++; next.ap = 2; resolveContract(next); if (next.alarm >= 3 && next.phase !== 'ending') next.phase = 'gameOver'; else if (next.phase !== 'ending') next.phase = 'report'; next.tutorialStep = next.mode === 'tutorial' ? Math.max(next.tutorialStep, 3) : next.tutorialStep; next.forecast = forecast(next); next.score += 50 - next.alarm * 10; return next;
}
export function applyCommand(state: GameState, command: Command): GameState {
  if (command.type === 'start') { const next = makeState(command.mode === 'tutorial' ? 0 : state.jobIndex, state.seed, command.mode); next.phase = 'briefing'; return next; }
  if (command.type === 'restart') return makeState(state.jobIndex, state.seed, state.mode);
  if (command.type === 'toggleHelp') { const next = clone(state); next.helpOpen = !next.helpOpen; return next; }
  if (command.type === 'dismissBriefing' && state.phase === 'briefing') { const next = clone(state); next.phase = 'planning'; next.tutorialStep = next.mode === 'tutorial' ? Math.max(next.tutorialStep, 1) : next.tutorialStep; addIncident(next, 'MONITORING ACTIVE. PLAN TWO ACTIONS, THEN COMMIT.'); return next; }
  if (command.type === 'openReview' && state.phase === 'planning') { const next = clone(state); next.phase = 'review'; next.notice = next.pending.length ? 'TURN REVIEW OPEN. ENTER AGAIN TO MOVE THE GUARDS.' : 'NO ACTIONS QUEUED. ADD A MOVE OR TOOL FIRST.'; return next; }
  if (command.type === 'closeReview' && state.phase === 'review') { const next = clone(state); next.phase = 'planning'; next.notice = 'TURN REVIEW CLOSED. EDITING RESUMED.'; return next; }
  if (command.type === 'dismissReport' && state.phase === 'report') { const next = clone(state); next.phase = 'planning'; next.notice = 'REPORT ACKNOWLEDGED. PLAN THE NEXT TURN.'; return next; }
  if (command.type === 'commit' && state.phase === 'review' && state.pending.length > 0) return commit(state);
  if (command.type === 'undo' && state.checkpoint) { const next = clone(state.checkpoint); next.notice = 'LAST ACTION UNDONE. FORECAST RESTORED.'; return next; }
  if (state.phase !== 'planning') return state;
  if (command.type === 'move') return withPlanning(state, next => { if (next.ap <= 0) { next.notice = 'NO ACTIONS LEFT. ENTER TO COMMIT.'; return; } const delta = dirs[command.direction]; const target = { x: next.player.x + delta.x, y: next.player.y + delta.y }; next.facing = command.direction; if (!walkable(next, target)) { next.notice = 'BLOCKED: WALL OR CLOSED EDGE.'; return; } if (currentVision(next).some(p => same(p, target))) { next.notice = 'MOVE REFUSED: TILE IS SEEN NOW.'; return; } if (next.guards.some(g => same(g.pos, target))) { next.notice = 'MOVE REFUSED: GUARD OCCUPIES THAT TILE.'; return; } next.player = target; next.ap--; next.pending.push({ label: `WALK → (${target.x + 1},${target.y + 1})`, cost: 1, kind: 'move' }); });
  if (command.type === 'decoy') return withPlanning(state, next => { if (next.ap <= 0 || next.decoys <= 0) { next.notice = next.decoys <= 0 ? 'NO DECOYS REMAIN.' : 'NO ACTIONS LEFT.'; return; } const delta = dirs[next.facing]; const pos = { x: next.player.x + delta.x * 2, y: next.player.y + delta.y * 2 }; if (!walkable(next, pos)) { next.notice = 'NO CLEAR THROW LINE.'; return; } next.noise.unshift({ pos, turns: 3, label: 'DECOY' }); next.decoys--; next.ap--; next.pending.push({ label: `DECOY at (${pos.x + 1},${pos.y + 1})`, cost: 1, kind: 'decoy' }); addIncident(next, `DECOY placed at (${pos.x + 1},${pos.y + 1}); guards will investigate.`); });
  if (command.type === 'jam') return withPlanning(state, next => { if (next.ap <= 0 || next.jammers <= 0) { next.notice = next.jammers <= 0 ? 'JAMMER SPENT.' : 'NO ACTIONS LEFT.'; return; } next.camera.jammed = 2; next.jammers--; next.ap--; next.pending.push({ label: 'CAMERA JAMMED for 2 turns', cost: 1, kind: 'jam' }); addIncident(next, 'CAMERA C1 JAMMED. ITS CONE IS OFFLINE.'); });
  if (command.type === 'interact') return withPlanning(state, next => { const job = activeJob(next); if (next.ap <= 0) { next.notice = 'NO ACTIONS LEFT.'; return; } if (!next.keyTaken && same(next.player, job.key)) { next.keyTaken = true; next.objective = 'case'; next.ap--; next.pending.push({ label: 'TAKE BRASS NIGHT KEY', cost: 1, kind: 'interact' }); addIncident(next, 'KEY TAKEN. OBJECTIVE UPDATED → OPEN SAPPHIRE DISPLAY.', 'success'); return; } if (next.keyTaken && !next.caseOpen && same(next.player, job.display)) { next.caseOpen = true; next.asset = true; next.objective = next.alarm > 0 ? 'exit-service' : 'exit-east'; next.ap--; next.pending.push({ label: 'OPEN SAPPHIRE DISPLAY', cost: 1, kind: 'interact' }); addIncident(next, next.alarm > 0 ? 'CASE FORCED OPEN. OBJECTIVE UPDATED → STAFF EXIT.' : 'CASE OPENED QUIETLY. OBJECTIVE UPDATED → STREET EXIT.', next.alarm > 0 ? 'warning' : 'success'); return; } const exit = next.objective === 'exit-service' ? job.exits.service : job.exits.east; if (next.asset && same(next.player, exit)) { next.phase = 'ending'; next.score += Math.max(0, 1000 - next.turn * 20 - next.alarm * 100); addIncident(next, 'ASSET SECURED. YOU LEFT NO STORY BEHIND.', 'success'); return; } next.notice = 'NOTHING USEFUL TO INTERACT WITH HERE.'; });
  return state;
}
export function objectiveLabel(state: GameState): string { return objectiveText(state); }
export function jobTitle(state: GameState): string { return activeJob(state).title; }
export function briefing(state: GameState): readonly string[] { return jobs[state.jobIndex]?.brief ?? []; }
export function nextJob(state: GameState): GameState { return makeState((state.jobIndex + 1) % jobs.length, state.seed + 1); }
export function visible(state: GameState): Set<string> { const result = new Set(currentVision(state).map(p => `${p.x},${p.y}`)); if (state.camera.jammed === 0) { const c = state.camera.pos; const d = dirs[state.camera.direction]; for (let i = 1; i < 6; i++) { const p = { x: c.x + d.x * i, y: c.y + d.y * i }; if (!walkable(state, p)) break; result.add(`${p.x},${p.y}`); } } return result; }

export interface PlanningComparison {
  current: GameState;
  planned: GameState;
  currentSight: Set<string>;
  plannedSight: Set<string>;
  forecastSight: Set<string>;
  risk: string;
}

/** Pure view model for the renderer: checkpoint is NOW, state is PLAN. */
export function planningComparison(state: GameState): PlanningComparison {
  const current = state.checkpoint ? clone(state.checkpoint) : clone(state);
  current.checkpoint = undefined;
  const planned = clone(state);
  planned.checkpoint = undefined;
  const currentSight = visible(current);
  const plannedSight = visible(planned);
  const forecastSight = new Set(state.forecast.flatMap(intent => intent.vision).map(point => `${point.x},${point.y}`));
  const playerKey = `${planned.player.x},${planned.player.y}`;
  const risk = currentSight.has(playerKey) ? 'EXPOSED NOW' : plannedSight.has(playerKey) ? 'EXPOSED AFTER PLAN' : forecastSight.has(playerKey) ? 'GUARD VISION AFTER COMMIT' : 'CLEAR THROUGH COMMIT';
  return { current, planned, currentSight, plannedSight, forecastSight, risk };
}
