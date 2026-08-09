import { CASES } from './content';
import { ROOMS, ROOM_NAMES, type Candidate, type CaseDefinition, type Command, type Door, type DoorEvent, type Evidence, type GameState, type Intruder, type PersonId, type RoomId, type TurnResolution } from './types';

export interface GhostCommandResult { state: GameState; events: string[]; }
const clone = <T>(value: T): T => structuredClone(value);
const personIds: PersonId[] = ['NORA', 'SAM', 'PRIYA', 'LEON', 'MICA'];
function doorBetween(doors: Record<string, Door>, a: RoomId, b: RoomId): Door | undefined { return Object.values(doors).find(d => (d.a === a && d.b === b) || (d.a === b && d.b === a)); }
function freshCase(def: CaseDefinition, seed: number, mode: GameState['mode']): GameState {
  const doors = Object.fromEntries(def.doors.map(d => [d.id, { ...d }])) as Record<any, Door>;
  const cameras = Object.fromEntries(def.cameras.map(c => [c.id, { ...c }])) as GameState['cameras'];
  const people = Object.fromEntries(def.people.map(p => [p.id, { ...p, schedule: { ...p.schedule } }])) as GameState['people'];
  const evidence = clone(def.openingEvidence);
  const intruder: Intruder = { ...clone(def.intruder), escaped: false };
  const candidates = personIds.map(id => ({ id, status: 'possible', supports: [], contradictions: [] } as Candidate));
  const state: GameState = { version: 1, seed: seed >>> 0, mode, phase: 'briefing', caseIndex: CASES.indexOf(def), casesCompleted: 0, correctCases: 0, failedCases: 0, totalScore: 0, turn: 1, battery: def.battery, deadline: def.deadline, rooms: [...ROOMS], doors, cameras, people, intruder, evidence, candidates, doorLog: [], observations: [], operations: [], incidentLog: [], selected: { kind: 'room', id: 'H' }, panel: 'feed', lastResolution: null, notice: 'READ THE BRIEF. CAMERAS AND LOGS ARE READY.', caseTitle: def.title, caseBrief: [...def.briefing] };
  return assess(state);
}
export function createState(seed = Date.now()): GameState { const state = freshCase(CASES[0], seed >>> 0, 'campaign'); state.phase = 'start'; return state; }
function activeDef(state: GameState): CaseDefinition { return CASES[Math.max(0, state.caseIndex % CASES.length)]; }
function addEvidence(state: GameState, evidence: Evidence): void { if (!state.evidence.some(e => e.id === evidence.id)) state.evidence.push(evidence); }
function addLog(state: GameState, text: string): void { state.incidentLog = [`T${state.turn.toString().padStart(2, '0')}  ${text}`, ...state.incidentLog].slice(0, 8); }
function assess(state: GameState): GameState {
  const candidates = personIds.map(id => ({ id, status: 'possible', supports: [], contradictions: [] } as Candidate));
  for (const evidence of state.evidence) {
    for (const candidate of candidates) {
      if (evidence.contradicts?.includes(candidate.id)) { candidate.status = 'contradicted'; candidate.contradictions.push(evidence.id); }
      if (evidence.supports?.includes(candidate.id)) candidate.supports.push(evidence.id);
    }
    if (evidence.kind === 'camera') {
      const observation = state.observations.find(item => item.id === evidence.id);
      if (observation && observation.build !== 'UNKNOWN') {
        for (const candidate of candidates) {
          const person = state.people[candidate.id];
          if (person.build !== observation.build && !evidence.supports?.includes(candidate.id) && candidate.status !== 'contradicted') {
            candidate.status = 'contradicted';
            candidate.contradictions.push(evidence.id);
          }
        }
      }
    }
  }
  for (const candidate of candidates) if (candidate.status === 'possible' && candidate.supports.length === 0 && state.evidence.some(e => e.kind === 'camera' && e.contradicts?.includes(candidate.id))) candidate.status = 'cleared';
  state.candidates = candidates;
  return state;
}
function pathStep(state: GameState, route: RoomId[]): RoomId | undefined {
  const next = route[state.intruder.step + 1]; if (!next) return undefined;
  const door = doorBetween(state.doors, state.intruder.position, next); return door && !door.locked ? next : undefined;
}
function moveIntruder(state: GameState, result: TurnResolution): void {
  const route = pathStep(state, state.intruder.route) ? state.intruder.route : state.intruder.contingency;
  const next = route[state.intruder.step + 1];
  if (!next) return;
  const door = doorBetween(state.doors, state.intruder.position, next);
  if (!door || door.locked) { result.events.push(`INTRUDER FORCED WAIT at ${ROOM_NAMES[state.intruder.position]}.`); addLog(state, 'FORCED WAIT — route blocked.'); return; }
  const previous = state.intruder.position; state.intruder.position = next; state.intruder.step++;
  const event: DoorEvent = { id: `door-${state.turn}-${door.id}`, turn: state.turn, doorId: door.id, action: 'OPEN', badge: state.intruder.cover, authenticated: false };
  state.doorLog.unshift(event); result.events.push(`DOOR ${door.id} OPEN — badge ${state.intruder.cover}.`); result.movedTo = next; addLog(state, `DOOR ${door.id} OPEN / ${state.intruder.cover}.`);
  if (next === state.intruder.target || next === 'E') { state.intruder.escaped = next === 'E' || next === state.intruder.target; }
  if (previous === next) result.events.push('NO MOVEMENT.');
}
function collectSensors(state: GameState, result: TurnResolution): void {
  for (const camera of Object.values(state.cameras)) {
    if (camera.activeUntil < state.turn) continue;
    if (!camera.covers.includes(state.intruder.position)) continue;
    const dark = camera.quality === 'dark'; const build = dark ? 'UNKNOWN' : state.intruder.build;
    const observation = { id: `cam-${camera.id}-${state.turn}`, turn: state.turn, cameraId: camera.id, room: state.intruder.position, occupant: state.intruder.cover, build } as const;
    state.observations.unshift(observation);
    const supports = [state.intruder.cover];
    const contradicts = personIds.filter(id => id !== state.intruder.cover);
    const evidence: Evidence = { id: observation.id, turn: state.turn, kind: 'camera', text: `${camera.id} sees claimed badge ${state.intruder.cover}, silhouette ${build} in ${ROOM_NAMES[state.intruder.position]}.`, supports, contradicts };
    addEvidence(state, evidence); result.evidenceAdded.push(evidence);
  }
}
function applyScheduled(state: GameState, result: TurnResolution): void {
  for (const event of activeDef(state).scheduled.filter(e => e.turn === state.turn)) {
    if (event.type === 'dark' && event.room) for (const camera of Object.values(state.cameras)) if (camera.covers.includes(event.room)) camera.quality = 'dark';
    if (event.type === 'unlock' && event.room) for (const door of Object.values(state.doors)) if (door.a === event.room || door.b === event.room) door.locked = false;
    result.events.push(event.text); addLog(state, event.text);
  }
}
function runOperation(state: GameState, label: string, action: () => void): TurnResolution | undefined {
  if (state.battery <= 0) { state.notice = 'BLACKOUT — NO BATTERY REMAINS.'; state.phase = 'gameOver'; return undefined; }
  state.battery--; state.operations.push(label); const result: TurnResolution = { operation: label, events: [], evidenceAdded: [] };
  applyScheduled(state, result); action(); if (state.phase === 'monitoring') moveIntruder(state, result); collectSensors(state, result); assess(state); state.turn++;
  if (state.intruder.escaped && state.phase === 'monitoring') { state.phase = 'gameOver'; state.notice = 'THE TARGET REACHED THE EXIT WINDOW.'; result.events.push('CASE LOST: TARGET ESCAPED.'); }
  else if (state.turn > state.deadline && state.phase === 'monitoring') { state.phase = 'gameOver'; state.notice = 'CASE LOST: EXIT WINDOW CLOSED.'; result.events.push('CASE LOST: EXIT WINDOW CLOSED.'); }
  state.lastResolution = result; state.notice = result.events[0] ?? `${label.toUpperCase()} COMPLETE.`; return result;
}
function proofKinds(state: GameState): Set<string> { return new Set(state.evidence.filter(e => e.kind !== 'brief').map(e => e.kind === 'badge' ? 'door' : e.kind)); }
export function applyCommand(state: GameState, command: Command): GhostCommandResult {
  if (command.type === 'start') { const fresh = freshCase(CASES[command.mode === 'tutorial' ? 0 : 0], command.seed ?? state.seed, command.mode); fresh.phase = 'briefing'; fresh.notice = command.mode === 'tutorial' ? 'ORIENTATION: WATCH THE FEED, THEN FOLLOW THE LOG.' : 'CASE 01: READ THE TASKING.'; return { state: fresh, events: ['start'] }; }
  if (command.type === 'restart') { const fresh = freshCase(activeDef(state), state.seed, state.mode); fresh.phase = 'briefing'; return { state: fresh, events: ['restart'] }; }
  if (command.type === 'nextCase') { if (state.caseIndex >= CASES.length - 1) { state.phase = 'ending'; state.notice = 'CAMPAIGN COMPLETE. THE TOWER IS QUIET.'; return { state, events: ['ending'] }; } const next = state.caseIndex + 1; const fresh = freshCase(CASES[next], state.seed, state.mode); fresh.casesCompleted = state.casesCompleted; fresh.correctCases = state.correctCases; fresh.failedCases = state.failedCases; fresh.totalScore = state.totalScore; return { state: fresh, events: ['next-case'] }; }
  if (command.type === 'dismissBriefing' && state.phase === 'briefing') { state.phase = 'monitoring'; state.notice = 'MONITORING ACTIVE. SELECT A CAMERA OR DOOR.'; return { state, events: [] }; }
  if (command.type === 'select') { state.selected = command.selection; return { state, events: [] }; }
  if (command.type === 'togglePanel') { state.panel = command.panel; return { state, events: [] }; }
  if (!['monitoring'].includes(state.phase)) return { state, events: [] };
  let result: TurnResolution | undefined;
  switch (command.type) {
    case 'wakeCamera': result = runOperation(state, `CAMERA ${command.id}`, () => { const cam = state.cameras[command.id]; cam.activeUntil = state.turn + 3; cam.quality = cam.quality === 'dark' ? 'grainy' : cam.quality; }); break;
    case 'queryBadge': result = runOperation(state, `BADGE ${command.eventId}`, () => { const event = state.doorLog.find(e => e.id === command.eventId); if (!event) { state.notice = 'NO SUCH DOOR EVENT.'; return; } const person = state.people[event.badge as PersonId]; const door = state.doors[event.doorId]; const valid = Boolean(person && person.tier >= door.tier); const evidence: Evidence = { id: `badge-${event.id}`, turn: state.turn, kind: 'badge', text: `${event.badge} token at ${event.doorId}: ${valid ? 'tier accepted' : `tier ${person?.tier ?? 0} cannot open tier ${door.tier}`}.`, supports: valid ? [event.badge as PersonId] : [], contradicts: valid ? [] : [event.badge as PersonId] }; addEvidence(state, evidence); state.lastResolution = { operation: `BADGE ${command.eventId}`, events: [evidence.text], evidenceAdded: [evidence] }; }); break;
    case 'toggleDoor': result = runOperation(state, `DOOR ${command.id}`, () => { const door = state.doors[command.id]; door.locked = !door.locked; const event: DoorEvent = { id: `lock-${state.turn}-${door.id}`, turn: state.turn, doorId: door.id, action: door.locked ? 'LOCKED' : 'OPEN', badge: 'UNKNOWN', authenticated: true }; state.doorLog.unshift(event); addLog(state, `DOOR ${door.id} ${door.locked ? 'LOCKED' : 'RELEASED'}.`); }); break;
    case 'probe': result = runOperation(state, `PROBE ${command.room}`, () => { const occupied = state.intruder.position === command.room; const evidence: Evidence = { id: `probe-${command.room}-${state.turn}`, turn: state.turn, kind: 'probe', text: `MOTION PROBE ${ROOM_NAMES[command.room]}: ${occupied ? 'OCCUPANCY' : 'CLEAR'}.` }; addEvidence(state, evidence); }); break;
    case 'detain': {
      const possible = state.candidates.filter(c => c.status === 'possible'); const kinds = proofKinds(state); const gate = possible.length === 1 && kinds.size >= 2 && state.intruder.position !== 'E';
      if (!gate) { state.notice = `DETAIN LOCKED — ${possible.length} CANDIDATES / ${kinds.size}/2 PROOF SOURCES.`; return { state, events: ['detain-blocked'] }; }
      const correct = command.suspect === state.intruder.cover; state.battery--; state.operations.push(`DETAIN ${command.suspect}`); state.phase = correct ? 'report' : 'gameOver'; state.notice = correct ? 'TARGET SECURED. EVIDENCE CHAIN INTACT.' : 'WRONG PERSON DETAINED.'; state.lastResolution = { operation: `DETAIN ${command.suspect}`, events: [state.notice], evidenceAdded: [] }; if (correct) { state.correctCases++; state.casesCompleted++; const score = 1000 + state.battery * 80 - state.operations.length * 30; state.totalScore += score; } else state.failedCases++; return { state, events: [correct ? 'correct' : 'wrong'] };
    }
    default: break;
  }
  return { state, events: result ? result.events : [] };
}
export function candidateSummary(state: GameState): string { const possible = state.candidates.filter(c => c.status === 'possible'); return possible.length === 1 ? `TARGET: ${possible[0].id}` : `CANDIDATES: ${possible.length}`; }
export function roomNeighbors(state: GameState, room: RoomId): RoomId[] { return Object.values(state.doors).filter(d => !d.locked && (d.a === room || d.b === room)).map(d => d.a === room ? d.b : d.a); }
export { ROOM_NAMES };
